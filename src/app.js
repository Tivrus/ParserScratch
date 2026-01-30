import { CategoryList } from './Factories/CategorySetup.js';
import { BlockManager } from './Factories/BlockSetup.js';

document.addEventListener('DOMContentLoaded', () => {
  
    const blockLibrary = new BlockManager('block-templates');
    const categoryList = new CategoryList({
      onCategoryChange: (categoryId) => {
        blockLibrary.loadBlocksForCategory(categoryId);
      }
    });
  });