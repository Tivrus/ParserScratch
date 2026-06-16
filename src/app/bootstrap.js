import * as CategoryFactory from '../Factories/CategoryFactory.js';
import * as BlockFactory from '../Factories/BlockFactory.js';
import * as GrabManagerModule from '../input/GrabManager.js';
import * as BlockSpawnerModule from '../services/BlockSpawner.js';
import * as BlockDeletionManagerModule from '../services/BlockDeletionManager.js';
import * as WorkspacePersistence from '../workspace/WorkspacePersistence.js';
import * as Interactions from '../editor/index.js';
import * as Grid from '../workspace/grid.js';
import * as WorkspaceModeToggles from '../workspace/workspaceModeToggles.js';
import * as Global from '../../../src/constants/Global.js';

function resolveScratchEditorDom(){
  const ids = Global.DOM_IDS;
  return {
    workspaceEl: document.getElementById(ids.workspace),
    blockTemplatesEl: document.getElementById(ids.blockTemplates),
    blockContainerEl: document.getElementById(ids.blockContainer),
    blockWorldRootEl: document.getElementById(ids.blockWorldRoot),
    dragOverlayEl: document.getElementById(ids.dragOverlay),
    gridEl: document.getElementById(ids.grid),
    categoryListEl: document.getElementById(ids.categoryList),
    trashCanEl: document.getElementById(ids.trashCan),
    sidebarEl: document.getElementById(ids.sidebar),
    toggleCameraInertiaEl: document.getElementById(ids.toggleCameraInertia),
    toggleBlockGridSnapEl: document.getElementById(ids.toggleBlockGridSnap),
  };
}

class ScratchEditor {
  #workspaceEl;
  #blockTemplatesEl;
  #blockContainerEl;
  #blockWorldRootEl;
  #dragOverlayEl;
  #gridEl;
  #categoryListEl;
  #trashCanEl;
  #sidebarEl;
  #toggleCameraInertiaEl;
  #toggleBlockGridSnapEl;

  #gridPan;
  #categoryLogic;
  #blockLogic;
  #blockRenderer;
  #grabManager;
  #categoryRenderer;
  #connectionGhostPreview;
  #blockSpawner;
  #blockWorkspaceDrag;

  constructor(){
    const dom = resolveScratchEditorDom();
    this.#workspaceEl = dom.workspaceEl;
    this.#blockTemplatesEl = dom.blockTemplatesEl;
    this.#blockContainerEl = dom.blockContainerEl;
    this.#blockWorldRootEl = dom.blockWorldRootEl;
    this.#dragOverlayEl = dom.dragOverlayEl;
    this.#gridEl = dom.gridEl;
    this.#categoryListEl = dom.categoryListEl;
    this.#trashCanEl = dom.trashCanEl;
    this.#sidebarEl = dom.sidebarEl;
    this.#toggleCameraInertiaEl = dom.toggleCameraInertiaEl;
    this.#toggleBlockGridSnapEl = dom.toggleBlockGridSnapEl;

    //├─grid
    //├─categories
    //│ └─category-list
    //├─sidebar
    //│ └─block-templates
    //├─workspace
    //│ └─block-container
    //│     ├─block-world-root
    //│     └─workspace-top-actions
    //│        ├─start-btn
    //│        └─trash-can
    //└─drag-overlay
      
    this.#gridPan = Grid.attachWorkspaceGridPan(
      this.#workspaceEl,
      this.#gridEl,
      { blockWorldRootEl: this.#blockWorldRootEl }
    );

    WorkspaceModeToggles.attachWorkspaceModeToggles(this.#workspaceEl, {
      inertiaBtn: this.#toggleCameraInertiaEl,
      snapBtn: this.#toggleBlockGridSnapEl,
    });
    const getWorkspaceGridOffset = () => this.#gridPan.getOffset();

    this.#categoryLogic = new CategoryFactory.CategoryLogic();
    this.#blockLogic = new BlockFactory.BlockLogic(this.#categoryLogic.categoriesMap);
    this.#blockRenderer = new BlockFactory.BlockRenderer(this.#blockTemplatesEl);

    this.#grabManager = new GrabManagerModule.GrabManager({
      workspace: this.#workspaceEl,
      blockTemplates: this.#blockTemplatesEl,
    });

    this.#categoryRenderer = new CategoryFactory.CategoryRenderer(
      this.#categoryListEl,
      function(categoryId){
        if (this.#categoryLogic.setActive(categoryId)){
          this.#categoryRenderer.updateActive(categoryId);
          this.#blockRenderer.renderLibrary(
            this.#prepareBlocksForCategory(categoryId)
          );
        }
      }.bind(this)
    );

    this.#connectionGhostPreview = new Interactions.ConnectionGhostPreview({
      dragOverlayEl: this.#dragOverlayEl,
      blockContainerEl: this.#blockContainerEl,
      getWorkspaceGridOffset: this.#getWorkspaceGridOffset.bind(this),
      refreshZones: function(){
        this.#blockSpawner.refreshWorkspaceZones(
          this.#connectionGhostPreview.getTopInnerStretchCBlockUuid()
        );
      }.bind(this),
    });

    this.#blockSpawner = new BlockSpawnerModule.BlockSpawner(
      this.#blockLogic,
      this.#grabManager,
      {
        blockTemplates: this.#blockTemplatesEl,
        workspace: this.#workspaceEl,
        dragOverlay: this.#dragOverlayEl,
        blockContainer: this.#blockContainerEl,
        blockMountParent: this.#blockWorldRootEl,
        getWorkspaceGridOffset: this.#getWorkspaceGridOffset.bind(this),
        onPaletteDragMove: function(block, grabManager){
          this.#connectionGhostPreview.sync(
            block.element,
            this.#blockSpawner.blockRegistry,
            grabManager
          );
        }.bind(this),
        onPaletteDragEnd: function(){
          this.#connectionGhostPreview.clear();
        }.bind(this),
        tryPaletteStackConnect: function(block, grabManager){
          return this.#commitStackConnectAndRefresh(block.element, grabManager);
        }.bind(this),
      }
    );

    this.#blockWorkspaceDrag = new Interactions.BlockWorkspaceDrag(
      this.#blockContainerEl,
      this.#workspaceEl,
      this.#dragOverlayEl,
      this.#grabManager,
      {
        blockMountParentEl: this.#blockWorldRootEl,
        getWorkspaceGridOffset: this.#getWorkspaceGridOffset.bind(this),
        blockRegistry: this.#blockSpawner.blockRegistry,
        onBlockDragMove: function(draggedElement, grabManager){
          this.#connectionGhostPreview.sync(
            draggedElement,
            this.#blockSpawner.blockRegistry,
            grabManager
          );
        }.bind(this),
        onBlockDragEnd: function(){
          this.#connectionGhostPreview.clear();
          this.#blockSpawner.refreshWorkspaceZones();
        }.bind(this),
        tryCommitStackConnect: function(dragging, grabManager){
          return this.#commitStackConnectAndRefresh(dragging.headElement, grabManager);
        }.bind(this),
      }
    );

    this.#workspaceEl.addEventListener(
      Global.WORKSPACE_EVENTS.structureChanged,
      this.#onWorkspaceStructureChanged.bind(this)
    );

    new BlockDeletionManagerModule.BlockDeletionManager({
      blockRegistry: this.#blockSpawner.blockRegistry,
      workspaceEl: this.#workspaceEl,
      trashCanEl: this.#trashCanEl,
      sidebarEl: this.#sidebarEl,
      blockWorkspaceDrag: this.#blockWorkspaceDrag,
      grabManager: this.#grabManager,
    });

    WorkspacePersistence.attachWorkspacePersistence(
      this.#workspaceEl,
      function(){
        return this.#blockSpawner.blockRegistry;
      }.bind(this),
      this.#getWorkspaceGridOffset.bind(this)
    );

    this.#exposeDebugApi();
    this.#bootstrapUi();
    void WorkspacePersistence.hydrateWorkspaceFromServer(
      this.#blockSpawner,
      this.#gridPan,
      {
        inertiaBtn: this.#toggleCameraInertiaEl,
        snapBtn: this.#toggleBlockGridSnapEl,
      }
    );
  }

  #getWorkspaceGridOffset(){
    return this.#gridPan.getOffset();
  }

  #prepareBlocksForCategory(categoryId){
    return this.#blockLogic
      .getBlocksByCategory(categoryId)
      .map(
        function(block){
          return this.#blockLogic.prepareBlockData(block.blockKey);
        }.bind(this)
      );
  }

  #onWorkspaceStructureChanged(){
    this.#blockSpawner.refreshWorkspaceZones(
      this.#connectionGhostPreview.getTopInnerStretchCBlockUuid()
    );
  }

  #commitStackConnectAndRefresh(draggedElement, grabManager){
    return Interactions.tryCommitStackConnect({
      ghostPreview: this.#connectionGhostPreview,
      draggedElement,
      blockRegistry: this.#blockSpawner.blockRegistry,
      grabManager,
    });
  }

  /**
   * Режим отладки (`window.__DEBUG__`), оверлей коннекторов и вспомогательные глобалы для E2E
   * при `__SCRATCH_E2E_SUPPRESS_Zone__`.
   */
  #exposeDebugApi(){
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

  #installWindowDebugToggle(options){
    const { blockRegistry, blockContainerEl, dragOverlayEl } = options;

    const debugToggleState = { active: false };
    let teardownZoneOverlay = null;

    function applyDebugActive(shouldBeActive){
      const nextActive = Boolean(shouldBeActive);
      if (nextActive === debugToggleState.active) return;
      debugToggleState.active = nextActive;

      if (teardownZoneOverlay){
        teardownZoneOverlay();
        teardownZoneOverlay = null;
      }

      if (!nextActive) return;

      const suppressZoneOverlay = Boolean(
        globalThis.__SCRATCH_E2E_SUPPRESS_Zone__
      );
      if (suppressZoneOverlay) return;

      teardownZoneOverlay = Interactions.enableZoneDebug(
        blockRegistry,
        blockContainerEl,
        dragOverlayEl
      );
    }

    window.enableZoneDebug = function(){
      applyDebugActive(true);
    };
    window.disableZoneDebug = function(){
      applyDebugActive(false);
    };

    const hadOwnDebugProperty = Object.prototype.hasOwnProperty.call(
      window,
      '__DEBUG__'
    );
    let restoreDebugAfterDefine = false;
    if (hadOwnDebugProperty && window.__DEBUG__ === true){
      restoreDebugAfterDefine = true;
    }
    if (hadOwnDebugProperty){
      try {
        delete window.__DEBUG__;
      } catch {
        /* non-configurable */
      }
    }

    Object.defineProperty(window, '__DEBUG__', {
      get(){
        return debugToggleState.active;
      },
      set(nextValue){
        applyDebugActive(nextValue);
      },
      enumerable: true,
      configurable: true,
    });

    if (restoreDebugAfterDefine){
      applyDebugActive(true);
    }
  }

  #installE2eScratchHelpersIfNeeded(blockRegistry){
    if (!globalThis.__SCRATCH_E2E_SUPPRESS_Zone__) return;

    window.__SCRATCH_getBlockLinkSnapshot = function(){
      return this.#buildPlainBlockLinkSnapshot(blockRegistry);
    }.bind(this);

    window.__SCRATCH_resetCallHistory = function(){
      globalThis.__SCRATCH_CALL_HISTORY__ = [];
    };
  }

  #buildPlainBlockLinkSnapshot(blockRegistry){
    const snapshotByBlockUuid = {};
    for (const [blockUUID, workspaceBlock] of blockRegistry){
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

  #bootstrapUi(){
    const categoriesArray = this.#categoryLogic.categoriesArray;
    const firstCategory = categoriesArray[0];
    let defaultCategoryKey = undefined;
    if (firstCategory){
      defaultCategoryKey = firstCategory.key;
    }

    this.#categoryRenderer.renderList(categoriesArray, defaultCategoryKey);
    if (!defaultCategoryKey) return;
    this.#categoryLogic.setActive(defaultCategoryKey);
    this.#blockRenderer.renderLibrary(
      this.#prepareBlocksForCategory(defaultCategoryKey)
    );
  }
}

new ScratchEditor();
