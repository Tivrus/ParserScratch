import { CategoryLogic, CategoryRenderer } from '../factories/CategoryFactory.js';
import { BlockLogic, BlockRenderer } from '../factories/BlockFactory.js';
import { GrabManager } from '../managers/GrabManager.js';
import { BlockSpawner } from '../managers/BlockSpawner.js';

// DOM element ids (single source for selectors vs getElementById)
const DOM_IDS = {
  workspace: 'workspace',
  blockTemplates: 'block-templates',
  dragOverlay: 'drag-overlay',
};

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

// --- Bootstrap ---
const defaultCategory = categoriesArray[0]?.key;

categoryUI.renderList(categoriesArray, defaultCategory);
if (defaultCategory) {
  ObjCategoryLogic.setActive(defaultCategory);
  ObjBlockRenderer.renderLibrary(prepareBlocksForCategory(defaultCategory));
}
