import { blocks_list } from '../data/BlocksData.js';
import { darkenColor } from '../utils/MathUtils.js';
import * as Global from '../constans/Global.js';
import * as SvgUtils from '../utils/SvgUtils.js';
import { Block } from '../core/Block.js';

export class BlockLogic {
  constructor(categoriesMap) {
    this.blocksMap = new Map(blocks_list.map(b => [b.blockKey, b]));
    this.blockForms = new Map(Global.BLOCK_FORMS.map(b => [b.type, b]));
    this.categoriesMap = categoriesMap;
  }

  getBlocksByCategory(categoryId) {
    return blocks_list.filter(b => b.category === categoryId);
  }

  // --- Prepare (blockKey → data for Block / library SVG) ---
  prepareBlockData(categoryId) {
    const config = this.blocksMap.get(categoryId);
    if (!config) return null;
    const form = this.blockForms.get(config.type);
    if (!form) return null;
    let { path: pathData, width, height } = form;
    const vb = [0, 0, width, height];

    // Optional path/viewBox width tweak: config.size like ['+', 12] or ['-', 4]
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

  // --- API ---
  renderLibrary(blocksPreparedData) {
    if (!this.libraryContainer) return;
    this.libraryContainer.innerHTML = '';
    blocksPreparedData.forEach(data => {
      if (data) this.libraryContainer.appendChild(Block.createLibrarySvg(data));
    });
  }

  createWorkspaceBlock(data, { blockUUID, x = 0, y = 0 } = {}) {
    return new Block(data, { blockUUID, x, y });
  }
}