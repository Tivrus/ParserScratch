import * as CategoriesData from '../../data/CategoriesData.js';
import { logError } from '../../constans/Global.js'; // Путь к вашей функции

export class CategoryList {
  constructor({ categoriesContainerId = 'category-list', onCategoryChange } = {}) {
    this.categoriesContainer = document.getElementById(categoriesContainerId);
    this.onCategoryChange = onCategoryChange;
    this.activeCategory = null;
    this.renderItem = this.#defaultRenderItem;

    this.parsedCategories = this.#parseCategories();
    
    this.#renderAllCategories();
    
    this.#selectDefaultCategory();
  }

  #parseCategories() {
    const rawCategories = Array.isArray(CategoriesData.categories_list) 
      ? CategoriesData.categories_list 
      : [];
    if (rawCategories.length === 0) {
      logError('No categories available in CategoriesData.', { context: 'CategoryList' });
      return [];
    }
    const seenIds = new Set();
    const validCategories = [];
    for (const category of rawCategories) {
      if (!category.key) {
        logError('Category missing required "key" property. Skipping.', { 
          context: 'CategoryList' 
        });
        continue;
      }
      if (seenIds.has(category.key)) {
        logError(`Duplicate category ID detected: "${category.key}". Skipping duplicate.`, { 
          context: 'CategoryList' 
        });
        continue;
      }

      seenIds.add(category.key);
      validCategories.push({
        key: category.key,
        text: category.text || category.key,
        color: category.color || '#ccc',
        data: category 
      });
    }

    return validCategories;
  }

  #renderAllCategories() {
    if (this.parsedCategories.length === 0) {
      logError('No valid categories to render.', { context: 'CategoryList' });
      return;
    }
    this.categoriesContainer.innerHTML = '';
    
    this.parsedCategories.forEach((parsedCategory) => {
      this.#renderSingleCategory(parsedCategory);
    });
  }

  #renderSingleCategory(parsedCategory) {
    const element = this.renderItem(parsedCategory);
    element.dataset.key = parsedCategory.key;
    element.addEventListener('click', () => this.selectCategory(parsedCategory.key));
    this.categoriesContainer.appendChild(element);
  }

  /**
   * Дефолтный рендерер одного элемента
   * @param {Object} category - Распарсенные данные категории
   * @returns {HTMLElement} DOM элемент категории
   */
  #defaultRenderItem(category) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('category-item');

    const colorBox = document.createElement('div');
    colorBox.classList.add('category-color');
    colorBox.style.backgroundColor = category.color;

    const label = document.createElement('div');
    label.classList.add('category-label');
    label.classList.add('selectable');
    label.textContent = category.text;

    wrapper.appendChild(colorBox);
    wrapper.appendChild(label);
    return wrapper;
  }

  /**
   * Выбор категории по умолчанию
   */
  #selectDefaultCategory() {
    if (this.parsedCategories.length > 0) {
      this.selectCategory(this.parsedCategories[0].key);
    }
  }

  /**
   * Выбор активной категории
   * @param {string} categoryId - ID категории
   */
  selectCategory(categoryId) {
    const category = this.parsedCategories.find(cat => cat.key === categoryId);
    
    if (!category) {
      logError(`Category with ID "${categoryId}" not found.`, { 
        context: 'CategoryList' 
      });
      return;
    }

    if (this.activeCategory === categoryId) return;

    // Убираем активный класс с предыдущего элемента
    const prevActive = this.categoriesContainer.querySelector('.category-item--active');
    if (prevActive) prevActive.classList.remove('category-item--active');

    // Добавляем активный класс к новому элементу
    const newActive = this.categoriesContainer.querySelector(`[data-key="${categoryId}"]`);
    if (newActive) {
      newActive.classList.add('category-item--active');
      this.activeCategory = categoryId;
      
      // Вызываем колбэк изменения категории
      if (this.onCategoryChange) {
        this.onCategoryChange(categoryId, category.data);
      }
    }
  }

  /**
   * Установка обработчика изменения категории
   * @param {Function} handler - Функция-обработчик
   */
  setOnCategoryChange(handler) {
    this.onCategoryChange = handler;
    if (this.activeCategory && this.onCategoryChange) {
      const activeCategoryData = this.parsedCategories.find(cat => cat.key === this.activeCategory);
      if (activeCategoryData) {
        this.onCategoryChange(this.activeCategory, activeCategoryData.data);
      }
    }
  }

  /**
   * Получение всех распарсенных категорий
   * @returns {Array} Массив распарсенных категорий
   */
  getParsedCategories() {
    return [...this.parsedCategories];
  }

  /**
   * Получение активной категории
   * @returns {Object|null} Активная категория или null
   */
  getActiveCategory() {
    if (!this.activeCategory) return null;
    const category = this.parsedCategories.find(cat => cat.key === this.activeCategory);
    return category ? { ...category } : null;
  }
}