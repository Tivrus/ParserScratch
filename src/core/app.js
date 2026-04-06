import { CategoryLogic, CategoryRenderer } from '../factories/CategoryFactory.js';  
import { BlockLogic, BlockRenderer } from '../factories/BlockFactory.js';
import { GrabManager } from '../managers/GrabManager.js';
import { BlockSpawner } from '../managers/BlockSpawner.js';

// 1. Инициализация логики
const ObjCategoryLogic = new CategoryLogic();
const categoriesList = new Map(ObjCategoryLogic.categories.map(b => [b.key, b]));
const ObjBlockLogic = new BlockLogic(categoriesList);

// 2. Инициализация рендереров
const ObjBlockRenderer = new BlockRenderer('block-templates');
// 3. Инициализация менеджеров захвата и спавна
const grabManager = new GrabManager({
  workspace: '#workspace',
  blockTemplates: '#block-templates',
  dragOverlay: '#drag-overlay'
});

// Пробрасываем ObjBlockRenderer как blockSetup для BlockSpawner
const spawner = new BlockSpawner(ObjBlockRenderer, grabManager, {
  blockTemplatesId: 'block-templates',
  workspaceId: 'workspace',
  dragOverlayId: 'drag-overlay'
});

// Подменяем метод создания в spawner, чтобы он использовал BlockLogic
ObjBlockRenderer.createWorkspaceBlockOriginal = ObjBlockRenderer.createWorkspaceBlock;
ObjBlockRenderer.createWorkspaceBlock = (id, params) => ObjBlockRenderer.createWorkspaceBlockOriginal(id, params, ObjBlockLogic);

const categoryUI = new CategoryRenderer('category-list', (categoryId) => {
  if (ObjCategoryLogic.setActive(categoryId)) {
    categoryUI.updateActive(categoryId);
    const prepared = ObjBlockLogic.getBlocksByCategory(categoryId)
      .map(b => ObjBlockLogic.prepareBlockData(b.blockKey));
    // console.log(prepared)
    ObjBlockRenderer.renderLibrary(prepared);
  }
});

// 4. Start (When page loads)
const defaultCategory = ObjCategoryLogic.categories[0]?.key;

categoryUI.renderList(categoriesList, defaultCategory);
if (defaultCategory) {
  ObjCategoryLogic.setActive(defaultCategory);
  const startBlocks = ObjBlockLogic.getBlocksByCategory(defaultCategory)
  .map(b => ObjBlockLogic.prepareBlockData(b.blockKey));
  ObjBlockRenderer.renderLibrary(startBlocks);
}