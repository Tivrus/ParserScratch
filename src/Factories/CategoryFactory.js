import * as CategoriesData from '../data/CategoriesData.js';
import * as Global from '../constans/Global.js';

export class CategoryLogic {
  constructor() {
    this.categoriesArray = this.#parseCategories();
    this.categoriesMap = CategoriesData.categories_map;
    this.activeCategoryId = null;
  }

  #collectOriginalCategoryKeys(raw) {
    const keys = new Set();
    for (const cat of raw) {
      if (cat?.key && cat.orig === true) {
        keys.add(cat.key);
      }
    }
    return keys;
  }
  #validateParsedCategory(cat, originalKeys, seenNonOriginalKeys) {
    if (!cat?.key) {
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
    const raw = Array.isArray(CategoriesData.categories_array) ? CategoriesData.categories_array : [];
    const originalKeys = this.#collectOriginalCategoryKeys(raw);
    const seenNonOriginalKeys = new Set();
    const result = [];
    for (const cat of raw) {
      const { isValid, errorReason } = this.#validateParsedCategory(
        cat,
        originalKeys,
        seenNonOriginalKeys
      );
      if (!isValid) {
        Global.logError(`Invalid category (${errorReason}): ${cat.key}`, {
          context: 'CategoryLogic',
          category: cat
        });
      }
      result.push({ ...cat, inc: !isValid });
      if (cat?.key && !originalKeys.has(cat.key)) {
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
      wrapper.className = [
        'category-item',
        isActive ? 'category-item--active' : '',
        cat.inc ? 'category-item--invalid' : '',
      ].filter(Boolean).join(' ');
      wrapper.dataset.key = cat.key;
      wrapper.innerHTML = `
        <div class="category-color" style="background-color: ${cat.color}"></div>
        <div class="category-label selectable">${cat.text}</div>
      `;
      wrapper.addEventListener('click', () => { if (!cat.inc) this.onSelect(cat.key); });
      return wrapper;
    }
  
    updateActive(activeId) {
      this.containerEl.querySelectorAll('.category-item').forEach(el => {
        el.classList.toggle('category-item--active', el.dataset.key === activeId);
      });
    }
  }
