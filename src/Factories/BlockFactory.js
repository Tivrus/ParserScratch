import * as BlocksData from '../data/BlocksData.js';
import * as MathUtils from '../infrastructure/math/MathUtils.js';
import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as BlockModule from '../constants/Block.js';

export class BlockLogic {
  constructor(categoriesMap) {
    this.blocksMap = new Map(BlocksData.blocks_list.map(b => [b.blockKey, b]));
    this.blockForms = new Map(Global.BLOCK_FORMS.map(b => [b.type, b]));
    this.categoriesMap = categoriesMap;
  }

  getBlocksByCategory(categoryId) {
    return BlocksData.blocks_list.filter(b => b.category === categoryId);
  }

  // --- Prepare (blockKey тЖТ data for Block / library SVG) ---
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
    return {
      ...config,
      pathData,
      width,
      height,
      viewBox,
      fillColor,
      strokeColor: MathUtils.ColorMath.darken(fillColor),
    };
  }
}

export class BlockRenderer {
  constructor(libraryContainerId) {
    this.libraryContainerEl = document.getElementById(libraryContainerId);
  }

  // --- API ---
  renderLibrary(blocksPreparedData) {
    if (!this.libraryContainerEl) return;
    this.libraryContainerEl.innerHTML = '';
    blocksPreparedData.forEach(data => {
      if (data) this.libraryContainerEl.appendChild(BlockModule.Block.createLibrarySvg(data));
    });
  }

  createWorkspaceBlock(data, { blockUUID, x = 0, y = 0 } = {}) {
    return new BlockModule.Block(data, { blockUUID, x, y });
  }
}
