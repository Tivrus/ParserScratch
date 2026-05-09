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

/** CSS-селектор по значению `id` в разметке (`#…`). */
function domIdSelector(domId) {
  return `#${domId}`;
}

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
      { blockWorldRootEl }
    );

    WorkspaceModeToggles.attachWorkspaceModeToggles(this.#workspaceEl);
    const getWorkspaceGridOffset = () => this.#gridPan.getOffset();

    this.#categoryLogic = new CategoryFactory.CategoryLogic();

    this.#blockLogic = new BlockFactory.BlockLogic(
      this.#categoryLogic.categoriesMap
    );
    this.#blockRenderer = new BlockFactory.BlockRenderer(
      Global.DOM_IDS.blockTemplates
    );
    this.#grabManager = new GrabManagerModule.GrabManager({
      workspace: domIdSelector(Global.DOM_IDS.workspace),
      blockTemplates: domIdSelector(Global.DOM_IDS.blockTemplates),
    });

    this.#categoryRenderer = new CategoryFactory.CategoryRenderer(
      Global.DOM_IDS.categoryList,
      categoryId => {
        if (this.#categoryLogic.setActive(categoryId)) {
          this.#categoryRenderer.updateActive(categoryId);
          this.#blockRenderer.renderLibrary(
            this.#prepareBlocksForCategory(categoryId)
          );
        }
      }
    );

    this.#connectionGhostPreview = new Interactions.ConnectionGhostPreview({
      dragOverlayEl: this.#dragOverlayEl,
      blockContainerEl: this.#blockContainerEl,
      getWorkspaceGridOffset,
      refreshConnectorZones: () =>
        this.#blockSpawner.refreshWorkspaceConnectorZones(
          this.#connectionGhostPreview.getTopInnerStretchCBlockUuid()
        ),
    });

    this.#blockSpawner = new BlockSpawnerModule.BlockSpawner(
      this.#blockLogic,
      this.#grabManager,
      {
        blockTemplatesId: Global.DOM_IDS.blockTemplates,
        workspaceId: Global.DOM_IDS.workspace,
        dragOverlayId: Global.DOM_IDS.dragOverlay,
        blockContainerId: Global.DOM_IDS.blockContainer,
        blockMountParent,
        getWorkspaceGridOffset,
        onPaletteDragMove: (block, grabManager) =>
          this.#connectionGhostPreview.sync(
            block.element,
            this.#blockSpawner.blockRegistry,
            grabManager
          ),
        onPaletteDragEnd: () => this.#connectionGhostPreview.clear(),
        tryPaletteStackConnect: (block, grabManager) =>
          this.#commitStackConnectAndRefresh(block.element, grabManager),
      }
    );

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

    this.#workspaceEl.addEventListener(
      Global.WORKSPACE_EVENTS.structureChanged,
      () => this.#onWorkspaceStructureChanged()
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
    void WorkspacePersistence.hydrateWorkspaceFromServer(
      this.#blockSpawner,
      this.#gridPan
    );
  }

  #prepareBlocksForCategory(categoryId) {
    return this.#blockLogic
      .getBlocksByCategory(categoryId)
      .map(block => this.#blockLogic.prepareBlockData(block.blockKey));
  }

  #onWorkspaceStructureChanged() {
    this.#blockSpawner.refreshWorkspaceConnectorZones(
      this.#connectionGhostPreview.getTopInnerStretchCBlockUuid()
    );
  }

  #commitStackConnectAndRefresh(draggedElement, grabManager) {
    return Interactions.tryCommitStackConnect({
      ghostPreview: this.#connectionGhostPreview,
      draggedElement,
      blockRegistry: this.#blockSpawner.blockRegistry,
      grabManager,
    });
  }

  /**
   * Режим отладки (`window.__DEBUG__`), оверлей коннекторов и вспомогательные глобалы для E2E
   * при `__SCRATCH_E2E_SUPPRESS_CONNECTOR__`.
   */
  #exposeDebugApi() {
    const blockRegistry = this.#blockSpawner.blockRegistry;
    const blockContainerEl = this.#blockContainerEl;
    const dragOverlayEl = this.#dragOverlayEl;

    this.#installWindowDebugToggle({
      blockRegistry,
      blockContainerEl,
      dragOverlayEl,
    });
    this.#installE2eScratchHelpersIfNeeded(blockRegistry);
  }

  /**
   * @param {{
   *   blockRegistry: import('../services/BlockSpawner.js').BlockSpawner['blockRegistry'];
   *   blockContainerEl: HTMLElement | null;
   *   dragOverlayEl: HTMLElement | null;
   * }} options
   */
  #installWindowDebugToggle(options) {
    const { blockRegistry, blockContainerEl, dragOverlayEl } = options;

    const debugToggleState = { active: false };
    let teardownConnectorOverlay = null;

    const applyDebugActive = shouldBeActive => {
      const nextActive = Boolean(shouldBeActive);
      if (nextActive === debugToggleState.active) {
        return;
      }
      debugToggleState.active = nextActive;

      if (teardownConnectorOverlay) {
        teardownConnectorOverlay();
        teardownConnectorOverlay = null;
      }

      if (!nextActive) {
        return;
      }

      const suppressConnectorOverlay = Boolean(
        globalThis.__SCRATCH_E2E_SUPPRESS_CONNECTOR__
      );
      if (suppressConnectorOverlay) {
        return;
      }

      teardownConnectorOverlay = Interactions.enableConnectorDebug(
        blockRegistry,
        blockContainerEl,
        dragOverlayEl
      );
    };

    window.enableConnectorDebug = () => applyDebugActive(true);
    window.disableConnectorDebug = () => applyDebugActive(false);

    const hadOwnDebugProperty = Object.prototype.hasOwnProperty.call(
      window,
      '__DEBUG__'
    );
    const restoreDebugAfterDefine =
      hadOwnDebugProperty && window.__DEBUG__ === true;
    if (hadOwnDebugProperty) {
      try {
        delete window.__DEBUG__;
      } catch {
        /* свойство не configurable */
      }
    }

    Object.defineProperty(window, '__DEBUG__', {
      get() {
        return debugToggleState.active;
      },
      set(nextValue) {
        applyDebugActive(nextValue);
      },
      enumerable: true,
      configurable: true,
    });

    if (restoreDebugAfterDefine) {
      applyDebugActive(true);
    }
  }

  /**
   * @param {Map<string, import('../blocks/Block.js').Block>} blockRegistry
   */
  #installE2eScratchHelpersIfNeeded(blockRegistry) {
    if (!globalThis.__SCRATCH_E2E_SUPPRESS_CONNECTOR__) {
      return;
    }

    window.__SCRATCH_getBlockLinkSnapshot = () =>
      this.#buildPlainBlockLinkSnapshot(blockRegistry);

    window.__SCRATCH_resetCallHistory = () => {
      globalThis.__SCRATCH_CALL_HISTORY__ = [];
    };
  }

  /**
   * Плоский снимок графа блоков для E2E (JSON-сериализуемые поля).
   *
   * @param {Map<string, import('../blocks/Block.js').Block>} blockRegistry
   */
  #buildPlainBlockLinkSnapshot(blockRegistry) {
    /** @type {Record<string, { blockUUID: string; blockKey: string; type: string; parentUUID: string|null; nextUUID: string|null; innerStackHeadUUID: string|null; topLevel: boolean }>} */
    const snapshotByBlockUuid = {};
    for (const [blockUUID, workspaceBlock] of blockRegistry) {
      snapshotByBlockUuid[blockUUID] = {
        blockUUID,
        blockKey: workspaceBlock.blockKey,
        type: workspaceBlock.type,
        parentUUID: workspaceBlock.parentUUID,
        nextUUID: workspaceBlock.nextUUID,
        innerStackHeadUUID: workspaceBlock.innerStackHeadUUID,
        topLevel: workspaceBlock.topLevel,
      };
    }
    return snapshotByBlockUuid;
  }

  #bootstrapUi() {
    const categoriesArray = this.#categoryLogic.categoriesArray;
    const firstCategory = categoriesArray[0];
    const defaultCategoryKey = firstCategory ? firstCategory.key : undefined;

    this.#categoryRenderer.renderList(categoriesArray, defaultCategoryKey);
    if (!defaultCategoryKey) {
      return;
    }
    this.#categoryLogic.setActive(defaultCategoryKey);
    this.#blockRenderer.renderLibrary(
      this.#prepareBlocksForCategory(defaultCategoryKey)
    );
  }
}

new ScratchEditor();
