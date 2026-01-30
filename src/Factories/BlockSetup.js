// src/factories/BlockManager.js
import { blocks_list } from '../ScratchData/BlocksData.js';
import { categories_list } from '../ScratchData/CategoriesData.js';
import * as SvgUtils from '../Factories/SvgUtils.js';
import * as global from '../global.js';

export class BlockManager {
  // === Часть 1: Управление библиотекой (UI) ===
  constructor(BlockLibraryContainerId='block-templates') {
    this.BlockLibraryContainer = document.getElementById(BlockLibraryContainerId)
    this.BlocksMap = new Map(blocks_list.map(block => [block.id, block]));
    this.CategoriesMap = new Map(categories_list.map(cat => [cat.id, cat]));
  }

  #clearBlockLibrary() {
    this.BlockLibraryContainer.innerHTML = '';
  }

  loadBlocksForCategory(categoryId) {
    this.#clearBlockLibrary();

    const category = categories_list.find(c => c.id === categoryId);
    if (!category) {
      console.warn(`[BlockManager] Category "${categoryId}" not found.`);
      return;
    }

    const categoryBlocks = blocks_list.filter(b => b.category === categoryId);
    for (const block of categoryBlocks) {
      const template = this.createTemplate(block.id);
      if (template) this.BlockLibraryContainer.appendChild(template);
    }
  }

  // === Часть 2: Фабрика блоков (рендеринг) ===
  getBlockConfig(blockId) {
    if (!blockId) return null;
    const config = this.BlocksMap.get(blockId);
    return config ? { ...config } : null;
  }

  getCategoryColor(categoryId) {
    if (typeof categoryId !== 'string') return global.DEFAULT_BLOCK_COLOR;
    const cat = this.CategoriesMap.get(categoryId);
    return cat?.color || global.DEFAULT_BLOCK_COLOR;
  }

  createTemplate(blockId) {
    const config = this.getBlockConfig(blockId);
    if (!config) return null;

    const svgContent = this.#createSVGContent(config);
    if (!svgContent) return null;

    const { pathEl, labelEls, width, height, viewBox } = svgContent;

    const template = document.createElement('div');
    template.className = 'block-template';
    template.dataset.blockId = config.id;
    template.dataset.type = config.type;
    template.dataset.category = config.category;
    template.style.width = `${width}px`;
    template.style.height = `${height}px`;

    const svgEl = SvgUtils.createElement('svg', { viewBox, width: String(width), height: String(height) });
    svgEl.setAttribute('class', 'block-svg');
    svgEl.appendChild(pathEl);
    labelEls.forEach(el => svgEl.appendChild(el));
    template.appendChild(svgEl);

    return template;
  }

  createWorkspaceBlock(blockId, { unicId, x = 0, y = 0 } = {}) {
    const config = this.getBlockConfig(blockId);
    if (!config) return null;
    const svgContent = this.#createSVGContent(config);
    if (!svgContent) return null;
    const { pathEl, labelEls, width, height } = svgContent;
    const group = SvgUtils.createElement('g', { transform: `translate(${x}, ${y})` });
    group.className = 'workspace-block';
    group.dataset.blockId = config.id;
    group.dataset.type = config.type;
    group.dataset.category = config.category;
    group.dataset.unicId = unicId;

    group.appendChild(pathEl);
    labelEls.forEach(el => group.appendChild(el));
    return group;
  }

  // === Приватный рендеринг ===
  #createSVGContent(blockConfig) {
    const { type, labels = [], size } = blockConfig;
    const form = global.BLOCK_FORMS[type];
    if (!form) {
      console.warn(`[BlockManager] Form for type "${type}" not defined.`);
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
    const strokeColor = SvgUtils.darkenColor(fillColor);

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
      textEl.textContent = label.text ?? ''
      return textEl;
    });

    return { pathEl, labelEls, width, height, viewBox };
  }
}

export default BlockManager;