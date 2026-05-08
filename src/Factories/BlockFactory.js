import * as BlocksData from '../data/BlocksData.js';
import * as MathUtils from '../infrastructure/math/MathUtils.js';
import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as BlockModule from '../blocks/Block.js';

export class BlockLogic {
  constructor(categoriesMap) {
    this.blocksMap = new Map(BlocksData.blocks_list.map(b => [b.blockKey, b]));
    this.blockForms = new Map(Global.BLOCK_FORMS.map(b => [b.type, b]));
    this.categoriesMap = categoriesMap;
  }

  getBlocksByCategory(categoryId) {
    return BlocksData.blocks_list.filter(b => b.category === categoryId);
  }

  prepareBlockData(categoryId) {
    const config = this.blocksMap.get(categoryId);
    if (!config) return null;
    const form = this.blockForms.get(config.type);
    if (!form) return null;
    let { path: pathData, width, height } = form;
    const vb = [0, 0, width, height];

    // Доп. ширина path/viewBox: config.size вида ['+', 12] или ['-', 4]
    if (Array.isArray(config.size) && config.size.length == 2) {
      const [sign, amountRaw] = config.size;
      const amount = Number(amountRaw);
      if (!isNaN(amount) && amount !== 0) {
        let horizontalResizeDelta;
        if (sign === '-') {
          horizontalResizeDelta = -amount;
        } else {
          horizontalResizeDelta = amount;
        }
        const resizeConfig = SvgUtils.getResizeConfig(config.type);
        pathData = SvgUtils.resizePath(pathData, {
          horizontal: horizontalResizeDelta,
          ...resizeConfig,
        });
        width += horizontalResizeDelta;
        if (vb.length === 4) {
          vb[2] += horizontalResizeDelta;
        }
      }
    }
    const viewBox = vb.join(' ');
    const categoryRow = this.categoriesMap.get(config.category);
    let fillColor;
    if (categoryRow && categoryRow.color) {
      fillColor = categoryRow.color;
    } else {
      fillColor = Global.DEFAULT_BLOCK_COLOR;
    }
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

  renderLibrary(blocksPreparedData) {
    if (!this.libraryContainerEl) return;
    this.libraryContainerEl.innerHTML = '';
    blocksPreparedData.forEach(data => {
      if (data)
        this.libraryContainerEl.appendChild(
          BlockModule.Block.createLibrarySvg(data)
        );
    });
  }

  /**
   * @param {object} data
   * @param {{ blockUUID?: string | null; x?: number; y?: number }} [placement]
   */
  createWorkspaceBlock(data, placement = {}) {
    const { blockUUID, x = 0, y = 0 } = placement;
    return new BlockModule.Block(data, { blockUUID, x, y });
  }
}
