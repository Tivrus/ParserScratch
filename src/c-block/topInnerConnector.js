import * as Global from '../constants/Global.js';

/**
 * Local `top-inner` hit band for a c-block `<g>` (same width as top/bottom stack bands).
 * @param {{ connectorX: number, width: number }} localGeom from ConnectorZone geometry read
 */
export function computeCBlockTopInnerRect(localGeom) {
  const { connectorX, width } = localGeom;
  const inset = Global.CBLOCK_NESTED_X_OFFSET;
  const threshold = Global.CONNECTOR_THRESHOLD;
  const y = threshold / 2 + threshold - Global.CONNECTOR_SOCKET_HEIGHT / 2;
  return {
    type: 'top-inner',
    x: connectorX + inset,
    y,
    width: width - inset,
    height: threshold,
  };
}
