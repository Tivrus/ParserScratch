import * as ConnectorZoneModule from '../blocks/ConnectorZone.js';
import * as ConnectorClientGeometry from '../stack-connect/hit-test/connectorClientGeometry.js';

/** @returns {{ cBlock: object, zone: object }|null} */
export function findCBlockTopInnerHit(draggedBlock, draggedElement, blockRegistry) {
  if (!draggedBlock?.element || !draggedElement || !blockRegistry) return null;
  let draggedRect;
  try {
    draggedRect = draggedElement.getBoundingClientRect();
  } catch {
    return null;
  }

  for (const block of blockRegistry.values()) {
    if (block.type !== 'c-block' || !block.element) continue;
    if (block.blockUUID === draggedBlock.blockUUID) continue;

    const zone = ConnectorZoneModule.ConnectorZone.zoneByType(block.connectorZones, 'top-inner');
    if (!zone) continue;

    const zoneClient = ConnectorClientGeometry.zoneToClientRect(block.element, zone);
    if (
      zoneClient &&
      ConnectorClientGeometry.rectsIntersectClient(draggedRect, zoneClient)
    ) {
      return { cBlock: block, zone };
    }
  }
  return null;
}

/** Внутренний превью — только одиночный блок с верхним коннектором. */
export function isTopInnerGhostEligible(draggedBlock) {
  if (!draggedBlock?.element) return false;
  if (draggedBlock.nextUUID) return false;
  return Boolean(
    ConnectorZoneModule.ConnectorZone.zoneByType(draggedBlock.connectorZones, 'top')
  );
}
