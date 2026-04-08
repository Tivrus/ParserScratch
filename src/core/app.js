import { CategoryLogic, CategoryRenderer } from '../factories/CategoryFactory.js';
import { BlockLogic, BlockRenderer } from '../factories/BlockFactory.js';
import { GrabManager } from '../managers/GrabManager.js';
import { BlockSpawner } from '../managers/BlockSpawner.js';
import { BlockDeletionManager } from '../managers/BlockDeletionManager.js';
import { BlockWorkspaceDrag, enableConnectorDebug } from '../interactions/blocks/index.js';
import { DOM_IDS } from '../constans/Global.js';

const q = (id) => `#${id}`;

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

const spawner = new BlockSpawner(ObjBlockLogic, grabManager, {
  blockTemplatesId: DOM_IDS.blockTemplates,
  workspaceId: DOM_IDS.workspace,
  dragOverlayId: DOM_IDS.dragOverlay,
});

// --- UI: category rail; switches library + active state ---
const categoryUI = new CategoryRenderer('category-list', (categoryId) => {
  if (ObjCategoryLogic.setActive(categoryId)) {
    categoryUI.updateActive(categoryId);
    ObjBlockRenderer.renderLibrary(prepareBlocksForCategory(categoryId));
  }
});

// --- Interactions ---
const workspaceDrag = new BlockWorkspaceDrag(
  document.getElementById(DOM_IDS.blockContainer),
  document.getElementById(DOM_IDS.workspace),
  document.getElementById(DOM_IDS.dragOverlay),
  grabManager
);

new BlockDeletionManager({
  blockRegistry: spawner.blockRegistry,
  workspaceEl: document.getElementById(DOM_IDS.workspace),
  trashCanId: DOM_IDS.trashCan,
  sidebarId: DOM_IDS.sidebar,
  workspaceDrag,
});

// Debug tools exposed to browser console
window.enableConnectorDebug = () => {
  window.disableConnectorDebug = enableConnectorDebug(
    spawner.blockRegistry,
    document.getElementById(DOM_IDS.blockContainer),
    document.getElementById(DOM_IDS.dragOverlay)
  );
};

// --- Bootstrap ---
const defaultCategory = categoriesArray[0]?.key;

categoryUI.renderList(categoriesArray, defaultCategory);
if (defaultCategory) {
  ObjCategoryLogic.setActive(defaultCategory);
  ObjBlockRenderer.renderLibrary(prepareBlocksForCategory(defaultCategory));
}
