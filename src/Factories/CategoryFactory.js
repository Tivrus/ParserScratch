import * as CategoriesData from '../data/CategoriesData.js';
import * as Global from '../constants/Global.js';

export class CategoryLogic {
  constructor() {
    this.categoriesArray = this.#parseCategories();
    this.categoriesMap = CategoriesData.categories_map;
    this.activeCategoryId = null;
  }

  #collectOriginalCategoryKeys(categoriesFromDataFile) {
    const keys = new Set();
    for (const categoryRow of categoriesFromDataFile) {
      if (categoryRow && categoryRow.key && categoryRow.orig === true) {
        keys.add(categoryRow.key);
      }
    }
    return keys;
  }
  #validateParsedCategory(cat, originalKeys, seenNonOriginalKeys) {
    if (!cat || !cat.key) {
      return { isValid: false, errorReason: 'missing key' };
    }
    if (originalKeys.has(cat.key) && cat.orig === true) {
      return { isValid: true, errorReason: null };
    }
    if (originalKeys.has(cat.key)) {
      return { isValid: false, errorReason: 'duplicate of original' };
    }
    if (seenNonOriginalKeys.has(cat.key)) {
      return { isValid: false, errorReason: 'duplicate' };
    }
    return { isValid: true, errorReason: null };
  }

  #parseCategories() {
    let categoriesFromDataFile;
    if (Array.isArray(CategoriesData.categories_array)) {
      categoriesFromDataFile = CategoriesData.categories_array;
    } else {
      categoriesFromDataFile = [];
    }
    const originalKeys = this.#collectOriginalCategoryKeys(categoriesFromDataFile);
    const seenNonOriginalKeys = new Set();
    const result = [];
    for (const cat of categoriesFromDataFile) {
      const { isValid, errorReason } = this.#validateParsedCategory(
        cat,
        originalKeys,
        seenNonOriginalKeys
      );
      if (!isValid) {
        Global.logError(`Invalid category (${errorReason}): ${cat.key}`, {
          context: 'CategoryLogic',
          category: cat,
        });
      }
      result.push({ ...cat, inc: !isValid });
      if (cat && cat.key && !originalKeys.has(cat.key)) {
        seenNonOriginalKeys.add(cat.key);
      }
    }
    return result;
  }

  setActive(id) {
    const cat = this.categoriesArray.find(c => c.key === id);
    if (cat && !cat.inc) {
      this.activeCategoryId = id;
      return true;
    }
    return false;
  }
}

export class CategoryRenderer {
  constructor(containerId, onSelect) {
    this.containerEl = document.getElementById(containerId);
    this.onSelect = onSelect;
  }

  renderList(categories, activeId) {
    if (!this.containerEl) return;
    this.containerEl.innerHTML = '';
    categories.forEach(cat => {
      const el = this.#createItem(cat, cat.key === activeId);
      this.containerEl.appendChild(el);
    });
  }

  #createItem(cat, isActive) {
    const wrapper = document.createElement('div');
    let activeModifierClass;
    if (isActive) {
      activeModifierClass = 'category-item--active';
    } else {
      activeModifierClass = '';
    }
    let invalidModifierClass;
    if (cat.inc) {
      invalidModifierClass = 'category-item--invalid';
    } else {
      invalidModifierClass = '';
    }
    wrapper.className = [
      'category-item',
      activeModifierClass,
      invalidModifierClass,
    ]
      .filter(Boolean)
      .join(' ');
    wrapper.dataset.key = cat.key;
    wrapper.innerHTML = `
        <div class="category-color" style="background-color: ${cat.color}"></div>
        <div class="category-label selectable">${cat.text}</div>
      `;
    wrapper.addEventListener('click', () => {
      if (!cat.inc) this.onSelect(cat.key);
    });
    return wrapper;
  }

  updateActive(activeId) {
    this.containerEl.querySelectorAll('.category-item').forEach(el => {
      const row = /** @type {HTMLElement} */ (el);
      row.classList.toggle('category-item--active', row.dataset.key === activeId);
    });
  }
}
