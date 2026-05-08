import * as ConnectorZoneModule from '../blocks/ConnectorZone.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as CBlockMath from '../calculations/CBlockMath.js';
import * as StackHatOffsets from '../calculations/stackHatOffsets.js';
import * as CBlockTopInner from './topInnerConnector.js';

/**
 * Мировые координаты левого верхнего угла призрака при snap во внутренний стек c-block (`#block-world-root`).
 * Берётся номинальный слот пустого «рта» из `computeCBlockTopInnerRect`, а не зона на блоке
 * (она может сдвигаться для hit-test при уже существующем внутреннем стеке).
 */
export function computeTopInnerGhostWorldPosition(cBlock, draggedElement) {
  if (!cBlock || !cBlock.element || !draggedElement) return null;
  if (cBlock.type !== 'c-block') return null;

  const g = ConnectorZoneModule.ConnectorZone.getLocalGeometry(
    { type: 'c-block' },
    cBlock.element
  );
  const slot = CBlockTopInner.computeCBlockTopInnerRect(g);

  const { x: cbx, y: cby } = SvgUtils.parseTranslateTransform(cBlock.element);
  const hatExtraY = StackHatOffsets.capStackExtraY(draggedElement, {});
  const worldY = CBlockMath.topInnerGhostWorldY(
    cby,
    slot.y,
    slot.height,
    hatExtraY
  );
  const worldX = CBlockMath.topInnerGhostWorldX(cbx, slot.x);

  return { x: worldX, y: worldY };
}
