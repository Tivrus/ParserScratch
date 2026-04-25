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
import { attachWorkspaceGridPan } from '../background/grid.js';
import { attachWorkspaceModeToggles } from '../background/workspaceModeToggles.js';
import { DOM_IDS, WORKSPACE_EVENTS } from '../constans/Global.js';

const q = (id) => `#${id}`;

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
  #gridPan;

  constructor() {
    this.#blockContainerEl = document.getElementById(DOM_IDS.blockContainer);
    this.#dragOverlayEl = document.getElementById(DOM_IDS.dragOverlay);
    this.#workspaceEl = document.getElementById(DOM_IDS.workspace);

    const blockWorldRootEl = document.getElementById(DOM_IDS.blockWorldRoot);
    const blockMountParent = blockWorldRootEl ?? this.#blockContainerEl;
    this.#gridPan = attachWorkspaceGridPan(this.#workspaceEl, document.getElementById(DOM_IDS.grid), {
      blockWorldRootEl,
    });
    attachWorkspaceModeToggles(this.#workspaceEl);
    const getWorkspaceGridOffset = () => this.#gridPan.getOffset();

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
      getWorkspaceGridOffset,
    });

    this.#blockSpawner = new BlockSpawner(this.#blockLogic, this.#grabManager, {
      blockTemplatesId: DOM_IDS.blockTemplates,
      workspaceId: DOM_IDS.workspace,
      dragOverlayId: DOM_IDS.dragOverlay,
      blockContainerId: DOM_IDS.blockContainer,
      blockMountParent,
      getWorkspaceGridOffset,
      onPaletteDragMove: (block, grabManager) =>
        this.#connectionGhostPreview.sync(block.element, this.#blockSpawner.blockRegistry, grabManager),
      onPaletteDragEnd: () => this.#connectionGhostPreview.clear(),
      tryPaletteStackConnect: (block, grabManager) =>
        this.#commitStackConnectAndRefresh(block.element, grabManager),
    });

    this.#blockWorkspaceDrag = new BlockWorkspaceDrag(
      this.#blockContainerEl,
      this.#workspaceEl,
      this.#dragOverlayEl,
      this.#grabManager,
      {
        blockMountParentEl: blockMountParent,
        getWorkspaceGridOffset,
        blockRegistry: this.#blockSpawner.blockRegistry,
        onBlockDragMove: (draggedElement, grabManager) =>
          this.#connectionGhostPreview.sync(
            draggedElement,
            this.#blockSpawner.blockRegistry,
            grabManager
          ),
        onBlockDragEnd: () => {
          this.#connectionGhostPreview.clear();
          this.#blockSpawner.refreshWorkspaceConnectorZones();
        },
        tryCommitStackConnect: (dragging, grabManager) =>
          this.#commitStackConnectAndRefresh(dragging.headElement, grabManager),
      }
    );

    this.#workspaceEl.addEventListener(WORKSPACE_EVENTS.structureChanged, () =>
      this.#onWorkspaceStructureChanged()
    );

    new BlockDeletionManager({
      blockRegistry: this.#blockSpawner.blockRegistry,
      workspaceEl: this.#workspaceEl,
      trashCanId: DOM_IDS.trashCan,
      sidebarId: DOM_IDS.sidebar,
      blockWorkspaceDrag: this.#blockWorkspaceDrag,
      grabManager: this.#grabManager,
    });

    attachWorkspacePersistence(this.#workspaceEl, () => this.#blockSpawner.blockRegistry, () =>
      this.#gridPan.getOffset()
    );

    this.#exposeDebugApi();
    this.#bootstrapUi();
    void hydrateWorkspaceFromServer(this.#blockSpawner, this.#gridPan);
  }

  #prepareBlocksForCategory(categoryId) {
    return this.#blockLogic
      .getBlocksByCategory(categoryId)
      .map((block) => this.#blockLogic.prepareBlockData(block.blockKey));
  }

  #onWorkspaceStructureChanged() {
    this.#blockSpawner.refreshWorkspaceConnectorZones();
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
