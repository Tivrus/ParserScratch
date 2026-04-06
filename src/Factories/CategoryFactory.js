import { categories_list } from '../data/CategoriesData.js';
import { logError } from '../constans/Global.js';

export class CategoryLogic {
  constructor() {
    this.categories = this.#parseCategories();
    this.activeCategoryId = null;
  }

  #parseCategories() {
    const raw = Array.isArray(categories_list) ? categories_list : [];
    const seenIds = new Set();
    return raw.filter(cat => {
      if (!cat.key || seenIds.has(cat.key)) {
        logError(`Duplicate or invalid category: ${cat.key}`, { context: 'CategoryLogic' });
        return false;
      }
      seenIds.add(cat.key);
      return true;
    })
  }

  setActive(id) {
    const exists = this.categories.some(c => c.key === id);
    if (exists) {
      this.activeCategoryId = id;
      return true;
    }
    return false;
  }
}


export class CategoryRenderer {
    constructor(containerId, onSelect) {
      this.container = document.getElementById(containerId);
      this.onSelect = onSelect;
    }
  
    renderList(categories, activeId) {
      if (!this.container) return;
      this.container.innerHTML = '';
      categories.forEach(cat => {
        const el = this.#createItem(cat, cat.key === activeId);
        this.container.appendChild(el);
      });
    }
  
    #createItem(cat, isActive) {
      const wrapper = document.createElement('div');
      wrapper.className = `category-item ${isActive ? 'category-item--active' : ''}`;
      wrapper.dataset.key = cat.key;
      wrapper.innerHTML = `
        <div class="category-color" style="background-color: ${cat.color}"></div>
        <div class="category-label selectable">${cat.text}</div>
      `;
      wrapper.addEventListener('click', () => this.onSelect(cat.key));
      return wrapper;
    }
  
    updateActive(activeId) {
      this.container.querySelectorAll('.category-item').forEach(el => {
        el.classList.toggle('category-item--active', el.dataset.key === activeId);
      });
    }
  }