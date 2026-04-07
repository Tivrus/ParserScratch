import { blocks_list } from '../data/BlocksData.js';
import * as SvgUtils from '../utils/SvgUtils.js';
import { darkenColor } from '../utils/MathUtils.js';
import * as Global from '../constans/Global.js';

export class BlockLogic {
  constructor(categoriesMap) {
    this.blocksMap = new Map(blocks_list.map(b => [b.blockKey, b]));
    this.blockForms = new Map(Global.BLOCK_FORMS.map(b => [b.type, b]));
    this.categoriesMap = categoriesMap;
  }

  getBlocksByCategory(categoryId) {
    return blocks_list.filter(b => b.category === categoryId);
  }

  prepareBlockData(categoryId) {
    const config = this.blocksMap.get(categoryId);
    if (!config) return null;
    const form = this.blockForms.get(config.type);
    if (!form) return null;
    let { path: pathData, width, height } = form;
    const vb = [0, 0, width, height];
    // Расчет изменения размера блока
    if (Array.isArray(config.size) && config.size.length == 2) {
      const [sign, amountRaw] = config.size;
      const amount = Number(amountRaw);
      if (!isNaN(amount) && amount !== 0) {
        const delta = sign === '-' ? -amount : amount;
        const resizeConfig = SvgUtils.getResizeConfig(config.type);
        pathData = SvgUtils.resizePath(pathData, { horizontal: delta, ...resizeConfig });
        width += delta;
        if (vb.length === 4) {
          vb[2] += delta;
        }
      }
    }
    const viewBox = vb.join(' ');
    const fillColor = this.categoriesMap.get(config.category)?.color || Global.DEFAULT_BLOCK_COLOR;
    return { ...config, pathData, width, height, viewBox, fillColor, strokeColor: darkenColor(fillColor) };
  }
}



export class BlockRenderer {
  constructor(libraryContainerId) {
    this.libraryContainer = document.getElementById(libraryContainerId);
  }

  #createBaseSVG(data, className) {
    const svg = SvgUtils.createElement('svg', {
      viewBox: data.viewBox,
      width: String(data.width),
      height: String(data.height),
      class: className
    });

    // Применяем стили и атрибуты защиты от выделения
    Object.assign(svg.style, {
      userSelect: 'none',
      webkitUserSelect: 'none',
      cursor: 'grab'
    });
    svg.setAttribute('unselectable', 'on');
    
    svg.dataset.blockId = data.blockKey;
    svg.dataset.category = data.category;
    svg.dataset.type = data.type;

    const path = SvgUtils.createElement('path', {
      d: data.pathData,
      fill: data.fillColor,
      stroke: data.strokeColor,
      'stroke-width': 2,
      'stroke-linejoin': 'round'
    });
    
    svg.appendChild(path);

    data.labels?.forEach(label => {
      const text = SvgUtils.createElement('text', {
        x: String(label.pos?.[0] ?? 0),
        y: String(label.pos?.[1] ?? 0),
        fill: '#ffffff',
        'font-size': '14',
        'font-weight': '600',
        'font-family': 'Arial, sans-serif',
        'dominant-baseline': 'middle',
        'pointer-events': 'none'
      });
      text.textContent = label.text || '';
      svg.appendChild(text);
    });

    return svg;
  }

  renderLibrary(blocksPreparedData) {
    if (!this.libraryContainer) return;
    this.libraryContainer.innerHTML = '';
    blocksPreparedData.forEach(data => {
      const el = this.#createBaseSVG(data, 'block-template');
      this.libraryContainer.appendChild(el);
    });
  }

  createWorkspaceBlock(data, { blockUUID, x = 0, y = 0 } = {}) {
    const group = SvgUtils.createElement('g', { 
      transform: `translate(${x}, ${y})`,
      class: 'workspace-block'
    });
    
    const tempSvg = this.#createBaseSVG(data, '');
    while (tempSvg.firstChild) {
      group.appendChild(tempSvg.firstChild);
    }
    
    group.dataset.blockUUID = blockUUID;
    group.dataset.blockId = data.blockKey;
    group.dataset.type = data.type;
    group.dataset.category = data.category;
    return group;
  }
}