import * as Global from '../constants/Global.js';
import * as CBlockMath from '../calculations/CBlockMath.js';
import * as ConnectorZoneModule from '../blocks/ConnectorZone.js';
import * as ConnectorClientGeometry from '../stack-connect/hit-test/connectorClientGeometry.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

function syntheticBottomZoneInnerTailLocal(innerTailElement, innerTailType) {
  const g = ConnectorZoneModule.ConnectorZone.getLocalGeometry(
    { type: innerTailType },
    innerTailElement
  );
  const y = CBlockMath.syntheticInnerTailBottomZoneLocalY(
    g.bottomBaseY
  );
  return {
    x: g.connectorX,
    y,
    width: g.width,
    height: Global.CONNECTOR_THRESHOLD,
  };
}

/**
 * Полоса `bottom-inner` на `<g>` c-block: тот же горизонтальный коридор, что у `top-inner`,
 * вертикально — по синтетическому нижнему сокету хвоста внутреннего стека (шов «стек снизу» внутри рта).
 */
export function computeCBlockBottomInnerRect(
  cBlockElement,
  innerTailElement,
  innerTailType,
  cBlockLocalGeom
) {
  if (!cBlockElement || !innerTailElement || !cBlockLocalGeom) return null;

  const zone = syntheticBottomZoneInnerTailLocal(
    innerTailElement,
    innerTailType
  );
  const client = ConnectorClientGeometry.zoneToClientRect(
    innerTailElement,
    zone
  );
  if (!client) return null;

  const corners = [
    [client.left, client.top],
    [client.right, client.top],
    [client.right, client.bottom],
    [client.left, client.bottom],
  ];
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [cx, cy] of corners) {
    const p = SvgUtils.clientPointToElementLocal(cBlockElement, cx, cy);
    if (!p) return null;
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const inset = Global.CBLOCK_NESTED_X_OFFSET;
  const { connectorX, width } = cBlockLocalGeom;
  const seamCenterY = (minY + maxY) / 2;
  const h = Global.CONNECTOR_THRESHOLD;

  return {
    type: 'bottom-inner',
    x: connectorX + inset,
    y: CBlockMath.bottomInnerHitBandLocalTopY(seamCenterY, h),
    width: width - inset,
    height: h,
  };
}
