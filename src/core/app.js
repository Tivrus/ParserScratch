import { CategoryLogic, CategoryRenderer } from '../factories/CategoryFactory.js';
import { BlockLogic, BlockRenderer } from '../factories/BlockFactory.js';
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

// --- Domain: categories + block definitions ---
const ObjCategoryLogic = new CategoryLogic();
const categoriesArray = ObjCategoryLogic.categoriesArray;
const categoriesMap = ObjCategoryLogic.categoriesMap;
const ObjBlockLogic = new BlockLogic(categoriesMap);

// Library rows for one category key
function prepareBlocksForCategory(categoryId) {
  return ObjBlockLogic.getBlocksByCategory(categoryId)
    .map(b => ObjBlockLogic.prepareBlockData(b.blockKey));
}

// --- UI: block templates panel ---
const ObjBlockRenderer = new BlockRenderer(DOM_IDS.blockTemplates);

// --- Drag: grab from library, spawn into workspace ---
const grabManager = new GrabManager({
  workspace: q(DOM_IDS.workspace),
  blockTemplates: q(DOM_IDS.blockTemplates),
});

// --- UI: category rail; switches library + active state ---
const categoryUI = new CategoryRenderer('category-list', categoryId => {
  if (ObjCategoryLogic.setActive(categoryId)) {
    categoryUI.updateActive(categoryId);
    ObjBlockRenderer.renderLibrary(prepareBlocksForCategory(categoryId));
  }
});

// --- Workspace: DOM refs + stack snap (palette + workspace drag) ---
const blockContainerEl = document.getElementById(DOM_IDS.blockContainer);
const dragOverlayEl = document.getElementById(DOM_IDS.dragOverlay);
const workspaceElForDrag = document.getElementById(DOM_IDS.workspace);

const stackSnapGhost = new ConnectionGhostPreview({
  dragOverlay: dragOverlayEl,
  blockContainer: blockContainerEl,
});

const spawner = new BlockSpawner(ObjBlockLogic, grabManager, {
  blockTemplatesId: DOM_IDS.blockTemplates,
  workspaceId: DOM_IDS.workspace,
  dragOverlayId: DOM_IDS.dragOverlay,
  blockContainerId: DOM_IDS.blockContainer,
  onPaletteDragMove: (block, gm) => stackSnapGhost.sync(block.element, spawner.blockRegistry, gm),
  onPaletteDragEnd: () => stackSnapGhost.clear(),
  tryPaletteStackConnect: (block, gm) =>
    tryCommitStackConnect({
      ghostPreview: stackSnapGhost,
      draggedElement: block.element,
      blockRegistry: spawner.blockRegistry,
      grabManager: gm,
    }),
});

function tryWorkspaceStackConnect(dragging, gm) {
  return tryCommitStackConnect({
    ghostPreview: stackSnapGhost,
    draggedElement: dragging.element,
    blockRegistry: spawner.blockRegistry,
    grabManager: gm,
  });
}

const workspaceDrag = new BlockWorkspaceDrag(
  blockContainerEl,
  workspaceElForDrag,
  dragOverlayEl,
  grabManager,
  {
    onBlockDragMove: (el, gm) => stackSnapGhost.sync(el, spawner.blockRegistry, gm),
    onBlockDragEnd: () => stackSnapGhost.clear(),
    tryCommitStackConnect: tryWorkspaceStackConnect,
  }
);

new BlockDeletionManager({
  blockRegistry: spawner.blockRegistry,
  workspaceEl: workspaceElForDrag,
  trashCanId: DOM_IDS.trashCan,
  sidebarId: DOM_IDS.sidebar,
  workspaceDrag,
  grabManager,
});

attachWorkspacePersistence(workspaceElForDrag, () => spawner.blockRegistry);

// --- Debug (browser console) ---
window.enableConnectorDebug = () => {
  window.disableConnectorDebug = enableConnectorDebug(
    spawner.blockRegistry,
    blockContainerEl,
    dragOverlayEl
  );
};

// --- Bootstrap ---
const defaultCategory = categoriesArray[0]?.key;

categoryUI.renderList(categoriesArray, defaultCategory);
if (defaultCategory) {
  ObjCategoryLogic.setActive(defaultCategory);
  ObjBlockRenderer.renderLibrary(prepareBlocksForCategory(defaultCategory));
}

void hydrateWorkspaceFromServer(spawner);
