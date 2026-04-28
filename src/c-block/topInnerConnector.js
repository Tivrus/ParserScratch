import * as Global from '../constants/Global.js';

/**
 * Прямоугольник зоны `top-inner` в локальных координатах `<g>` c-block.
 * @param {{ connectorX: number, width: number }} localGeom
 */
export function computeCBlockTopInnerRect(localGeom) {
  const { connectorX, width } = localGeom;
  const inset = Global.CBLOCK_NESTED_X_OFFSET;
  const innerW = Math.max(32, width - inset * 2);
  const threshold = Global.CONNECTOR_THRESHOLD;
  const y = threshold / 2 + threshold - Global.CONNECTOR_SOCKET_HEIGHT / 2;
  return {
    type: 'top-inner',
    x: connectorX + inset,
    y,
    width: innerW,
    height: threshold,
  };
}
