/** Вставка в middle: шов на родителе, полоса в координатах клиента. */

import * as MiddleJointBand from '../../calculations/middleJointClientBand.js';
import * as ConnectorClientGeometry from './connectorClientGeometry.js';

/** Зона middle на `<g>` родителя; связь с нижним блоком через `linkedChildUUID`. */
export function middleJointOnParent(parentBlock, childBlock) {
  if (!parentBlock || !childBlock) return null;
  const zones = parentBlock.connectorZones;
  if (!zones || typeof zones.find !== 'function') return null;
  const middleZoneMatch = zones.find(
    zone =>
      zone.type === 'middle' && zone.linkedChildUUID === childBlock.blockUUID
  );
  if (middleZoneMatch === undefined) return null;
  return middleZoneMatch;
}

/**
 * Полоса шва в viewport: учитывает сдвиг ребёнка (`translate`), не только родителя.
 */
export function middleJointBandClientRect(parentBlock, childBlock, middleZone) {
  if (!parentBlock || !parentBlock.element || !childBlock || !childBlock.element || !middleZone) return null;
  const middleZoneClientRect = ConnectorClientGeometry.zoneToClientRect(
    parentBlock.element,
    middleZone
  );
  if (!middleZoneClientRect) return null;
  const parentClientRect = parentBlock.element.getBoundingClientRect();
  const childClientRect = childBlock.element.getBoundingClientRect();
  const seamCenterY = MiddleJointBand.middleSeamCenterClientY(
    parentClientRect,
    childClientRect
  );
  const verticalBounds = MiddleJointBand.symmetricVerticalBandClientBounds(
    seamCenterY,
    middleZone.height
  );
  return {
    left: middleZoneClientRect.left,
    right: middleZoneClientRect.right,
    top: verticalBounds.top,
    bottom: verticalBounds.bottom,
  };
}
