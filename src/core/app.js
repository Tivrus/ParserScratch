import { CategoryLogic, CategoryRenderer } from '../Factories/CategoryFactory.js';
import { BlockLogic, BlockRenderer } from '../Factories/BlockFactory.js';
import { GrabManager } from '../managers/GrabManager.js';
import { BlockSpawner } from '../managers/BlockSpawner.js';
import { BlockDeletionManager } from '../managers/BlockDeletionManager.js';
import {
  attachWorkspacePersistence,
  hydrateWorkspaceFromServer,
} from '../managers/WorkspacePersistence.js';
import {
  BlockWorkspaceDrag,
  ConnectionGhostPreview,
  enableConnectorDebug,
  tryCommitStackConnect,
} from '../interactions/index.js';
import { DOM_IDS } from '../constans/Global.js';

const q = id => `#${id}`;

class ScratchEditor {
  #categoryLogic;
  #blockLogic;
  #blockRenderer;
  #grabManager;
  #categoryRenderer;
  #connectionGhostPreview;
  #blockSpawner;
  #blockWorkspaceDrag;
  #blockContainerEl;
  #dragOverlayEl;
  #workspaceEl;

  constructor() {
    this.#blockContainerEl = document.getElementById(DOM_IDS.blockContainer);
    this.#dragOverlayEl = document.getElementById(DOM_IDS.dragOverlay);
    this.#workspaceEl = document.getElementById(DOM_IDS.workspace);


    this.#categoryLogic = new CategoryLogic();
    this.#blockLogic = new BlockLogic(this.#categoryLogic.categoriesMap);
    this.#blockRenderer = new BlockRenderer(DOM_IDS.blockTemplates);
    this.#grabManager = new GrabManager({
      workspace: q(DOM_IDS.workspace),
      blockTemplates: q(DOM_IDS.blockTemplates),
    });

    this.#categoryRenderer = new CategoryRenderer(DOM_IDS.categoryList, categoryId => {
      if (this.#categoryLogic.setActive(categoryId)) {
        this.#categoryRenderer.updateActive(categoryId);
        this.#blockRenderer.renderLibrary(this.#prepareBlocksForCategory(categoryId));
      }
    });

    this.#connectionGhostPreview = new ConnectionGhostPreview({
      dragOverlayEl: this.#dragOverlayEl,
      blockContainerEl: this.#blockContainerEl,
    });

    this.#blockSpawner = new BlockSpawner(this.#blockLogic, this.#grabManager, {
      blockTemplatesId: DOM_IDS.blockTemplates,
      workspaceId: DOM_IDS.workspace,
      dragOverlayId: DOM_IDS.dragOverlay,
      blockContainerId: DOM_IDS.blockContainer,
      onPaletteDragMove: (block, gm) =>
        this.#connectionGhostPreview.sync(block.element, this.#blockSpawner.blockRegistry, gm),
      onPaletteDragEnd: () => this.#connectionGhostPreview.clear(),
      tryPaletteStackConnect: (block, gm) =>
        this.#commitStackConnectAndRefresh(block.element, gm),
    });

    this.#blockWorkspaceDrag = new BlockWorkspaceDrag(
      this.#blockContainerEl,
      this.#workspaceEl,
      this.#dragOverlayEl,
      this.#grabManager,
      {
        blockRegistry: this.#blockSpawner.blockRegistry,
        onBlockDragMove: (el, gm) =>
          this.#connectionGhostPreview.sync(el, this.#blockSpawner.blockRegistry, gm),
        onBlockDragEnd: () => {
          this.#connectionGhostPreview.clear();
          this.#blockSpawner.refreshWorkspaceConnectorZones();
        },
        tryCommitStackConnect: (dragging, gm) =>
          this.#commitStackConnectAndRefresh(dragging.element, gm),
      }
    );

    new BlockDeletionManager({
      blockRegistry: this.#blockSpawner.blockRegistry,
      workspaceEl: this.#workspaceEl,
      trashCanId: DOM_IDS.trashCan,
      sidebarId: DOM_IDS.sidebar,
      blockWorkspaceDrag: this.#blockWorkspaceDrag,
      grabManager: this.#grabManager,
    });

    attachWorkspacePersistence(this.#workspaceEl, () => this.#blockSpawner.blockRegistry);

    this.#exposeDebugApi();
    this.#bootstrapUi();
    void hydrateWorkspaceFromServer(this.#blockSpawner);
  }

  #prepareBlocksForCategory(categoryId) {
    return this.#blockLogic
      .getBlocksByCategory(categoryId)
      .map(b => this.#blockLogic.prepareBlockData(b.blockKey));
  }

  #commitStackConnectAndRefresh(draggedElement, grabManager) {
    return tryCommitStackConnect({
      ghostPreview: this.#connectionGhostPreview,
      draggedElement,
      blockRegistry: this.#blockSpawner.blockRegistry,
      grabManager,
    });
  }

  #exposeDebugApi() {
    const blockRegistry = this.#blockSpawner.blockRegistry;
    const blockContainerEl = this.#blockContainerEl;
    const dragOverlayEl = this.#dragOverlayEl;

    const debug = { active: false };
    let stopConnectorOverlay = null;

    const setParserScratchDebug = (on) => {
      const want = Boolean(on);
      if (want === debug.active) {
        return;
      }
      debug.active = want;
      if (want) {
        stopConnectorOverlay?.();
        stopConnectorOverlay = enableConnectorDebug(
          blockRegistry,
          blockContainerEl,
          dragOverlayEl
        );
      } else {
        stopConnectorOverlay?.();
        stopConnectorOverlay = null;
      }
    };

    window.enableConnectorDebug = () => setParserScratchDebug(true);
    window.disableConnectorDebug = () => setParserScratchDebug(false);

    const hadDebugProp = Object.prototype.hasOwnProperty.call(window, '__DEBUG__');
    const debugInitiallyOn = hadDebugProp && window.__DEBUG__ === true;
    if (hadDebugProp) {
      try {
        delete window.__DEBUG__;
      } catch {
        /* non-configurable */
      }
    }

    Object.defineProperty(window, '__DEBUG__', {
      get() {
        return debug.active;
      },
      set(v) {
        setParserScratchDebug(v);
      },
      enumerable: true,
      configurable: true,
    });

    if (debugInitiallyOn) {
      setParserScratchDebug(true);
    }
  }

  #bootstrapUi() {
    const categoriesArray = this.#categoryLogic.categoriesArray;
    const defaultCategory = categoriesArray[0]?.key;

    this.#categoryRenderer.renderList(categoriesArray, defaultCategory);
    if (defaultCategory) {
      this.#categoryLogic.setActive(defaultCategory);
      this.#blockRenderer.renderLibrary(this.#prepareBlocksForCategory(defaultCategory));
    }
  }
}

new ScratchEditor();
