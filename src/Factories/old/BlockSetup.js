import { blocks_list } from '../../data/BlocksData.js';
import { categories_list } from '../../data/CategoriesData.js';
import * as SvgUtils from '../../utils/SvgUtils.js';
import { darkenColor } from '../utils/StringUtils.js';
import * as Global from '../../constans/Global.js';

export class BlockSetup {
  constructor(BlockLibraryContainerId = 'block-templates') {
    this.BlockLibraryContainer = document.getElementById(BlockLibraryContainerId);
    this.BlocksMap = new Map(blocks_list.map(block => [block.blockKey, block]));
    this.CategoriesMap = new Map(categories_list.map(cat => [cat.key, cat]));
  }

  #clearBlockLibrary() {
    this.BlockLibraryContainer.innerHTML = '';
  }

  loadBlocksForCategory(categoryId) {
    this.#clearBlockLibrary();

    const category = categories_list.find(c => c.key === categoryId);
    if (!category) {
      console.warn(`[BlockSetup] Category "${categoryId}" not found.`);
      return;
    }

    const categoryBlocks = blocks_list.filter(b => b.category === categoryId);
    for (const block of categoryBlocks) {
      const template = this.createTemplate(block.blockKey);
      if (template) this.BlockLibraryContainer.appendChild(template);
    }
  }

  getBlockConfig(blockId) {
    if (!blockId) return null;
    const config = this.BlocksMap.get(blockId);
    return config ? { ...config } : null;
  }

  getCategoryColor(categoryId) {
    if (typeof categoryId !== 'string') return Global.DEFAULT_BLOCK_COLOR;
    const cat = this.CategoriesMap.get(categoryId);
    return cat?.color || Global.DEFAULT_BLOCK_COLOR;
  }

  // Создаём ЧИСТЫЙ <svg> с атрибутами для запрета выделения
  createTemplate(blockId) {
    const config = this.getBlockConfig(blockId);
    if (!config) return null;

    const svgContent = this.#createSVGContent(config);  
    if (!svgContent) return null;

    const { pathEl, labelEls, width, height, viewBox } = svgContent;

    // Создаём <svg> напрямую как шаблон
    const svgTemplate = SvgUtils.createElement('svg', { 
      viewBox, 
      width: String(width), 
      height: String(height),
      class: 'block-template' // класс для стилей
    });

    // Дата-атрибуты
    svgTemplate.dataset.blockId = config.blockKey;
    svgTemplate.dataset.type = config.type;
    svgTemplate.dataset.category = config.category;
    
    // 🔒 ЗАПРЕЩАЕМ ВЫДЕЛЕНИЕ ТЕКСТА НА САМОМ ЭЛЕМЕНТЕ
    svgTemplate.setAttribute('unselectable', 'on'); // IE/Edge
    svgTemplate.style.userSelect = 'none';          // Standard
    svgTemplate.style.webkitUserSelect = 'none';    // Chrome/Safari
    svgTemplate.style.MozUserSelect = 'none';       // Firefox
    svgTemplate.style.msUserSelect = 'none';        // IE10+/Edge
    svgTemplate.style.cursor = 'grab';

    // Добавляем содержимое
    svgTemplate.appendChild(pathEl);
    labelEls.forEach(el => {
      // 🔒 ЗАПРЕЩАЕМ ВЫДЕЛЕНИЕ НА ТЕКСТОВЫХ ЭЛЕМЕНТАХ ВНУТРИ БЛОКА
      el.setAttribute('user-select', 'none');
      el.setAttribute('unselectable', 'on');
      el.style.userSelect = 'none';
      el.style.pointerEvents = 'none'; // текст не должен перехватывать события
      svgTemplate.appendChild(el);
    });

    return svgTemplate;
  }

  createWorkspaceBlock(blockId, { blockUUID, x = 0, y = 0 } = {}) {
    const config = this.getBlockConfig(blockId);
    if (!config) return null;
    
    const svgContent = this.#createSVGContent(config);
    if (!svgContent) return null;
    
    const { pathEl, labelEls, width, height } = svgContent;
    
    // Группа для позиционирования в рабочей области
    const group = SvgUtils.createElement('g', { 
      transform: `translate(${x}, ${y})`,
      class: 'workspace-block'
    });
    
    group.dataset.blockId = config.blockKey;
    group.dataset.type = config.type;
    group.dataset.category = config.category;
    group.dataset.blockUUID = blockUUID;

    // 🔒 ЗАПРЕЩАЕМ ВЫДЕЛЕНИЕ НА ГРУППЕ
    group.setAttribute('unselectable', 'on');
    group.style.userSelect = 'none';
    group.style.webkitUserSelect = 'none';
    group.style.MozUserSelect = 'none';
    group.style.msUserSelect = 'none';

    group.appendChild(pathEl);
    labelEls.forEach(el => {
      el.setAttribute('user-select', 'none');
      el.setAttribute('unselectable', 'on');
      el.style.userSelect = 'none';
      el.style.pointerEvents = 'none';
      group.appendChild(el);
    });
    
    return group;
  }

  // === Приватный рендеринг ===
  #createSVGContent(blockConfig) {
    const { type, labels = [], size } = blockConfig;
    const form = Global.BLOCK_FORMS[type];
    if (!form) {
      console.warn(`[BlockSetup] Form for type "${type}" not defined.`);
      return null;
    }

    let pathData = form.path;
    let width = form.width;
    let height = form.height;
    let viewBox = form.viewBox;

    if (Array.isArray(size) && size.length >= 2) {
      const [sign, amountRaw] = size;
      const amount = Number(amountRaw);
      if (!isNaN(amount) && amount !== 0 && (sign === '+' || sign === '-')) {
        const delta = sign === '-' ? -amount : amount;
        const resizeConfig = SvgUtils.getResizeConfig(type);
        pathData = SvgUtils.resizePath(pathData, { horizontal: delta, ...resizeConfig });
        width += delta;
        const vb = viewBox.split(/\s+/).map(Number);
        if (vb.length === 4) {
          vb[2] += delta;
          viewBox = vb.join(' ');
        }
      }
    }

    const fillColor = this.getCategoryColor(blockConfig.category);
    const strokeColor = darkenColor(fillColor);

    const pathEl = SvgUtils.createElement('path', {
      d: pathData,
      fill: fillColor,
      stroke: strokeColor,
      'stroke-width': 2,
      'stroke-linejoin': 'round'
    });

    const labelEls = (labels || []).map(label => {
      const textEl = SvgUtils.createElement('text', {
        x: String(label.pos?.[0] ?? 0),
        y: String(label.pos?.[1] ?? 0),
        fill: '#ffffff',
        'font-size': '14',
        'font-weight': '600',
        'font-family': 'Arial, sans-serif',
        'dominant-baseline': 'middle',
        'text-anchor': 'start'
      });
      textEl.textContent = label.text ?? '';
      return textEl;
    });

    return { pathEl, labelEls, width, height, viewBox };
  }
}

export default BlockSetup;