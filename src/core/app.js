import { CategoryLogic, CategoryRenderer } from '../Factories/CategoryFactory.js';
import { BlockLogic, BlockRenderer } from '../Factories/BlockFactory.js';
import { GrabManager } from '../managers/GrabManager.js';
import { BlockSpawner } from '../managers/BlockSpawner.js';
import { BlockDeletionManager } from '../managers/BlockDeletionManager.js';
import {
  attachWorkspacePersistence,
  hydrateWorkspaceFromServer,
} from '../managers/WorkspacePersistence.js';
import { BlockWorkspaceDrag, enableConnectorDebug } from '../interactions/blocks/index.js';
import {
  ConnectionGhostPreview,
  tryCommitStackConnect,
} from '../interactions/connections/index.js';
import { DOM_IDS } from '../constans/Global.js';

const q = id => `#${id}`;

class ScratchEditor {
  #categoryLogic;
  #blockLogic;
  #blockRenderer;
  #grabManager;
  #categoryUI;
  #stackSnapGhost;
  #spawner;
  #workspaceDrag;
  #blockContainerEl;
  #dragOverlayEl;
  #workspaceEl;

  constructor() {
    this.#categoryLogic = new CategoryLogic();
    this.#blockLogic = new BlockLogic(this.#categoryLogic.categoriesMap);
    this.#blockRenderer = new BlockRenderer(DOM_IDS.blockTemplates);
    this.#grabManager = new GrabManager({
      workspace: q(DOM_IDS.workspace),
      blockTemplates: q(DOM_IDS.blockTemplates),
    });

    this.#categoryUI = new CategoryRenderer('category-list', categoryId => {
      if (this.#categoryLogic.setActive(categoryId)) {
        this.#categoryUI.updateActive(categoryId);
        this.#blockRenderer.renderLibrary(this.#prepareBlocksForCategory(categoryId));
      }
    });

    this.#blockContainerEl = document.getElementById(DOM_IDS.blockContainer);
    this.#dragOverlayEl = document.getElementById(DOM_IDS.dragOverlay);
    this.#workspaceEl = document.getElementById(DOM_IDS.workspace);

    this.#stackSnapGhost = new ConnectionGhostPreview({
      dragOverlay: this.#dragOverlayEl,
      blockContainer: this.#blockContainerEl,
    });

    this.#spawner = new BlockSpawner(this.#blockLogic, this.#grabManager, {
      blockTemplatesId: DOM_IDS.blockTemplates,
      workspaceId: DOM_IDS.workspace,
      dragOverlayId: DOM_IDS.dragOverlay,
      blockContainerId: DOM_IDS.blockContainer,
      onPaletteDragMove: (block, gm) =>
        this.#stackSnapGhost.sync(block.element, this.#spawner.blockRegistry, gm),
      onPaletteDragEnd: () => this.#stackSnapGhost.clear(),
      tryPaletteStackConnect: (block, gm) =>
        this.#commitStackConnectAndRefresh(block.element, gm),
    });

    this.#workspaceDrag = new BlockWorkspaceDrag(
      this.#blockContainerEl,
      this.#workspaceEl,
      this.#dragOverlayEl,
      this.#grabManager,
      {
        onBlockDragMove: (el, gm) =>
          this.#stackSnapGhost.sync(el, this.#spawner.blockRegistry, gm),
        onBlockDragEnd: () => this.#stackSnapGhost.clear(),
        tryCommitStackConnect: (dragging, gm) =>
          this.#commitStackConnectAndRefresh(dragging.element, gm),
      }
    );

    new BlockDeletionManager({
      blockRegistry: this.#spawner.blockRegistry,
      workspaceEl: this.#workspaceEl,
      trashCanId: DOM_IDS.trashCan,
      sidebarId: DOM_IDS.sidebar,
      workspaceDrag: this.#workspaceDrag,
      grabManager: this.#grabManager,
    });

    attachWorkspacePersistence(this.#workspaceEl, () => this.#spawner.blockRegistry);

    this.#exposeDebugApi();
    this.#bootstrapUi();
    void hydrateWorkspaceFromServer(this.#spawner);
  }

  #prepareBlocksForCategory(categoryId) {
    return this.#blockLogic
      .getBlocksByCategory(categoryId)
      .map(b => this.#blockLogic.prepareBlockData(b.blockKey));
  }

  #commitStackConnectAndRefresh(draggedElement, grabManager) {
    const pos = tryCommitStackConnect({
      ghostPreview: this.#stackSnapGhost,
      draggedElement,
      blockRegistry: this.#spawner.blockRegistry,
      grabManager,
    });
    if (pos) this.#spawner.refreshWorkspaceConnectorZones();
    return pos;
  }

  #exposeDebugApi() {
    const blockRegistry = this.#spawner.blockRegistry;
    const blockContainerEl = this.#blockContainerEl;
    const dragOverlayEl = this.#dragOverlayEl;

    window.enableConnectorDebug = () => {
      window.disableConnectorDebug = enableConnectorDebug(
        blockRegistry,
        blockContainerEl,
        dragOverlayEl
      );
    };
  }

  #bootstrapUi() {
    const categoriesArray = this.#categoryLogic.categoriesArray;
    const defaultCategory = categoriesArray[0]?.key;

    this.#categoryUI.renderList(categoriesArray, defaultCategory);
    if (defaultCategory) {
      this.#categoryLogic.setActive(defaultCategory);
      this.#blockRenderer.renderLibrary(this.#prepareBlocksForCategory(defaultCategory));
    }
  }
}

new ScratchEditor();
