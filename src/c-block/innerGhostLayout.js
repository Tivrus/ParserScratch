import * as ZoneModule from '../blocks/ZoneModule.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as CBlockMath from '../calculations/CBlockMath.js';
import * as CBlockTopInner from './topInnerZone.js';

/**
 * Мировые координаты левого верхнего угла призрака при snap во **внутренний стек c-block** (`#block-world-root`).
 * Берётся номинальный rect слота **`top-inner`** из `calcCBlockTopInnerWhenIsEmpty` (слот при пустом inner stack),
 * а не зона на DOM-блоке (она может сдвигаться для hit-test при уже непустом inner stack).
 */
export function calcTopInnerGhostWorldPosition(cBlock, draggedElement){
  if (!cBlock || !cBlock.element || !draggedElement) return null;
  if (cBlock.type !== 'c-block') return null;

  const g = ZoneModule.Zone.getLocalGeometry(
    { type: 'c-block' },
    cBlock.element
  );
  const slot = CBlockTopInner.calcCBlockTopInnerWhenIsEmpty(g);

  const { x: cbx, y: cby } = SvgUtils.parseTranslateTransform(cBlock.element);
  const worldY = CBlockMath.calc_CblockGhost_and_InnerBlocks_Pos(cby, slot.y, slot.height);
  const worldX = CBlockMath.calc_Cblock_InputBlocks_childrenNested_Xoffset(cbx, slot.x);
  return { x: worldX, y: worldY };
}
