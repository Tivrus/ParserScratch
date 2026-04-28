import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as ConnectorZoneModule from '../blocks/ConnectorZone.js';
import * as SnapLayout from '../stack-connect/layout/stackSnapLayout.js';

/**
 * Мир координат (`#block-world-root`): левый верх призрака при «вставке» во внутренний стек.
 */
export function computeTopInnerGhostWorldPosition(cBlock, draggedElement) {
  if (!cBlock?.element || !draggedElement) return null;
  const zone = ConnectorZoneModule.ConnectorZone.zoneByType(cBlock.connectorZones, 'top-inner');
  if (!zone) return null;

  const { x: cbx, y: cby } = SvgUtils.parseTranslateTransform(cBlock.element);
  let draggedHeight = Global.DEFAULT_BLOCK_HEIGHT;
  try {
    const h = draggedElement.getBBox().height;
    if (Number.isFinite(h) && h > 0) draggedHeight = h;
  } catch {
    /* keep default */
  }

  const hatExtraY = SnapLayout.capStackExtraY(draggedElement, {});
  const worldY = cby + zone.y + zone.height - Global.CONNECTOR_THRESHOLD + Global.CONNECTOR_SOCKET_HEIGHT/2 + hatExtraY;
  const worldX = cbx + zone.x;

  return { x: worldX, y: worldY };
}
