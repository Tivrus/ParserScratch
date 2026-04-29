import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as ConnectorZoneModule from '../blocks/ConnectorZone.js';
import * as SnapLayout from '../stack-connect/layout/stackSnapLayout.js';

/**
 * World-space top-left of the ghost when snapping into a c-block inner stack (`#block-world-root`).
 */
export function computeTopInnerGhostWorldPosition(cBlock, draggedElement) {
  if (!cBlock?.element || !draggedElement) return null;
  const zone = ConnectorZoneModule.ConnectorZone.zoneByType(cBlock.connectorZones, 'top-inner');
  if (!zone) return null;

  const { x: cbx, y: cby } = SvgUtils.parseTranslateTransform(cBlock.element);
  const hatExtraY = SnapLayout.capStackExtraY(draggedElement, {});
  const worldY =
    cby +
    zone.y +
    zone.height -
    Global.CONNECTOR_THRESHOLD +
    Global.CONNECTOR_SOCKET_HEIGHT / 2 +
    hatExtraY;
  const worldX = cbx + zone.x;

  return { x: worldX, y: worldY };
}
