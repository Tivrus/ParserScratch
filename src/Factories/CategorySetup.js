import * as CategoriesData from '../data/CategoriesData.js';

export class CategoryList {
  constructor({ categoriesContainerId = 'category-list', onCategoryChange } = {}) {
    this.categoriesContainer = document.getElementById(categoriesContainerId);
    this.categoriesArray = Array.isArray(CategoriesData.categories_list) ? CategoriesData.categories_list : [];

    if (this.categoriesArray.length === 0) {console.warn('[CategoryList]: No categories available in CategoriesData.');}

    this.activeCategory
    this.onCategoryChange = onCategoryChange
    this.renderItem = this.#defaultRenderItem;

    this.#renderCategories();
    this.#selectDefaultCategory();
  }

 
  #renderCategories() {
    const seenIds = new Set();
    for (const category of this.categoriesArray) {
      if (seenIds.has(category.key)) {
        console.error(
          `[CategoryList] Duplicate category ID detected: "${category.key}". ` +
          `All category IDs must be unique. Rendering aborted.`
        );
        return;
      }seenIds.add(category.key)}

    this.categoriesContainer.innerHTML = '';
    this.categoriesArray.forEach((category) => {
      const element = this.renderItem(category);
      element.dataset.key = category.key;
      element.addEventListener('click', () => this.selectCategory(category.key));
      this.categoriesContainer.appendChild(element);
    });
  }
  

  #defaultRenderItem(category) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('category-item');

    const colorBox = document.createElement('div');
    colorBox.classList.add('category-color');
    colorBox.style.backgroundColor = category.color || '#ccc';

    const label = document.createElement('div');
    label.classList.add('category-label');
    label.classList.add('selectable');
    label.textContent = category.text || category.key;

    wrapper.appendChild(colorBox);
    wrapper.appendChild(label);
    return wrapper;
  }


  #selectDefaultCategory() {
    this.selectCategory(this.categoriesArray[0].key);
  }


  selectCategory(categoryId) {
    const categoryExists = this.categoriesArray.some(cat => cat.key === categoryId);
    if (!categoryExists) {
      console.warn(`[CategoryList]: Category with ID "${categoryId}" not found.`);
      return;
    }
    if (this.activeCategory === categoryId) return;
    const prevActive = this.categoriesContainer.querySelector('.category-item--active');
    if (prevActive) prevActive.classList.remove('category-item--active');
    const newActive = this.categoriesContainer.querySelector(`[data-key="${categoryId}"]`);
    if (newActive) {
      newActive.classList.add('category-item--active');
      this.activeCategory = categoryId;
      if (this.onCategoryChange) {
        this.onCategoryChange(categoryId);
      }
    }
  }

  setOnCategoryChange(handler) {
    this.onCategoryChange = handler;
    if (this.activeCategory && this.onCategoryChange) {
      this.onCategoryChange(this.activeCategory);
    }
  }
}
