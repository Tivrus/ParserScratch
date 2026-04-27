import * as CategoryFactory from '../Factories/CategoryFactory.js';
import * as BlockFactory from '../Factories/BlockFactory.js';
import * as GrabManagerModule from '../input/GrabManager.js';
import * as BlockSpawnerModule from '../services/BlockSpawner.js';
import * as BlockDeletionManagerModule from '../services/BlockDeletionManager.js';
import * as WorkspacePersistence from '../workspace/WorkspacePersistence.js';
import * as Interactions from '../editor/index.js';
import * as Grid from '../workspace/grid.js';
import * as WorkspaceModeToggles from '../workspace/workspaceModeToggles.js';
import * as Global from '../constants/Global.js';

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
    this.#blockContainerEl = document.getElementById(Global.DOM_IDS.blockContainer);
    this.#dragOverlayEl = document.getElementById(Global.DOM_IDS.dragOverlay);
    this.#workspaceEl = document.getElementById(Global.DOM_IDS.workspace);

    const blockWorldRootEl = document.getElementById(Global.DOM_IDS.blockWorldRoot);
    const blockMountParent = blockWorldRootEl ?? this.#blockContainerEl;
    this.#gridPan = Grid.attachWorkspaceGridPan(
      this.#workspaceEl,
      document.getElementById(Global.DOM_IDS.grid),
      {
        blockWorldRootEl,
      }
    );
    WorkspaceModeToggles.attachWorkspaceModeToggles(this.#workspaceEl);
    const getWorkspaceGridOffset = () => this.#gridPan.getOffset();

    this.#categoryLogic = new CategoryFactory.CategoryLogic();
    this.#blockLogic = new BlockFactory.BlockLogic(this.#categoryLogic.categoriesMap);
    this.#blockRenderer = new BlockFactory.BlockRenderer(Global.DOM_IDS.blockTemplates);
    this.#grabManager = new GrabManagerModule.GrabManager({
      workspace: q(Global.DOM_IDS.workspace),
      blockTemplates: q(Global.DOM_IDS.blockTemplates),
    });

    this.#categoryRenderer = new CategoryFactory.CategoryRenderer(Global.DOM_IDS.categoryList, categoryId => {
      if (this.#categoryLogic.setActive(categoryId)) {
        this.#categoryRenderer.updateActive(categoryId);
        this.#blockRenderer.renderLibrary(this.#prepareBlocksForCategory(categoryId));
      }
    });

    this.#connectionGhostPreview = new Interactions.ConnectionGhostPreview({
      dragOverlayEl: this.#dragOverlayEl,
      blockContainerEl: this.#blockContainerEl,
      getWorkspaceGridOffset,
    });

    this.#blockSpawner = new BlockSpawnerModule.BlockSpawner(this.#blockLogic, this.#grabManager, {
      blockTemplatesId: Global.DOM_IDS.blockTemplates,
      workspaceId: Global.DOM_IDS.workspace,
      dragOverlayId: Global.DOM_IDS.dragOverlay,
      blockContainerId: Global.DOM_IDS.blockContainer,
      blockMountParent,
      getWorkspaceGridOffset,
      onPaletteDragMove: (block, grabManager) =>
        this.#connectionGhostPreview.sync(block.element, this.#blockSpawner.blockRegistry, grabManager),
      onPaletteDragEnd: () => this.#connectionGhostPreview.clear(),
      tryPaletteStackConnect: (block, grabManager) =>
        this.#commitStackConnectAndRefresh(block.element, grabManager),
    });

    this.#blockWorkspaceDrag = new Interactions.BlockWorkspaceDrag(
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

    this.#workspaceEl.addEventListener(Global.WORKSPACE_EVENTS.structureChanged, () =>
      this.#onWorkspaceStructureChanged()
    );

    new BlockDeletionManagerModule.BlockDeletionManager({
      blockRegistry: this.#blockSpawner.blockRegistry,
      workspaceEl: this.#workspaceEl,
      trashCanId: Global.DOM_IDS.trashCan,
      sidebarId: Global.DOM_IDS.sidebar,
      blockWorkspaceDrag: this.#blockWorkspaceDrag,
      grabManager: this.#grabManager,
    });

    WorkspacePersistence.attachWorkspacePersistence(
      this.#workspaceEl,
      () => this.#blockSpawner.blockRegistry,
      () => this.#gridPan.getOffset()
    );

    this.#exposeDebugApi();
    this.#bootstrapUi();
    void WorkspacePersistence.hydrateWorkspaceFromServer(this.#blockSpawner, this.#gridPan);
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
    return Interactions.tryCommitStackConnect({
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
        stopConnectorOverlay = Interactions.enableConnectorDebug(
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
