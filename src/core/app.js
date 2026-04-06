import { CategoryList } from '../factories/CategorySetup.js';
import { BlockSetup } from '../factories/BlockSetup.js';
import { BlockSpawner } from '../Blocks/BlockSpawner.js';
import { GrabManager } from '../Blocks/GrabManager.js';

document.addEventListener('DOMContentLoaded', () => {
  const blockSetup = new BlockSetup();
   // Инициализируем менеджер захвата для ВСЕХ областей
  const grabManager = new GrabManager({
    workspace: '#workspace',
    blockTemplates: '#block-templates',
    dragOverlay: '#drag-overlay' // если есть такой элемент
  }, { debug: true });

  
  const categoryList = new CategoryList({
    onCategoryChange: (categoryId) => {
      blockSetup.loadBlocksForCategory(categoryId);
    }
  });
  
  new BlockSpawner(blockSetup, grabManager);
});