// --- Middle insert: joint on parent, seam band in client space ---

import * as ConnectorClientGeometry from './connectorClientGeometry.js';

/** Middle zone on parent `<g>`; links to the block below via `linkedChildUUID`. */
export function middleJointOnParent(parentBlock, childBlock) {
  return (
    parentBlock?.connectorZones?.find(
      zone => zone.type === 'middle' && zone.linkedChildUUID === childBlock.blockUUID
    ) ?? null
  );
}

/**
 * Joint band in viewport: follows the child spread (`translate`), not the parent alone.
 */
export function middleJointBandClientRect(parentBlock, childBlock, middleZone) {
  if (!parentBlock?.element || !childBlock?.element || !middleZone) return null;
  const middleZoneClientRect = ConnectorClientGeometry.zoneToClientRect(
    parentBlock.element,
    middleZone
  );
  if (!middleZoneClientRect) return null;
  const parentClientRect = parentBlock.element.getBoundingClientRect();
  const childClientRect = childBlock.element.getBoundingClientRect();
  const seamCenterY = (parentClientRect.bottom + childClientRect.top) / 2;
  const halfBandHeight = middleZone.height / 2;
  return {
    left: middleZoneClientRect.left,
    right: middleZoneClientRect.right,
    top: seamCenterY - halfBandHeight,
    bottom: seamCenterY + halfBandHeight,
  };
}
