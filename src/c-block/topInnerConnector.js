import * as Global from '../constants/Global.js';

/**
 * Прямоугольник зоны `top-inner` в локальных координатах `<g>` c-block.
 * По ширине совпадает с верхним/нижним коннектором (вся длина силуэта).
 */
export function computeCBlockTopInnerRect(localGeom) {
  const { connectorX, width } = localGeom;
  const threshold = Global.CONNECTOR_THRESHOLD;
  const y = threshold / 2 + threshold - Global.CONNECTOR_SOCKET_HEIGHT / 2;
  return {
    type: 'top-inner',
    x: connectorX + Global.CBLOCK_NESTED_X_OFFSET,
    y,
    width: width - Global.CBLOCK_NESTED_X_OFFSET,
    height: threshold,
  };
}
