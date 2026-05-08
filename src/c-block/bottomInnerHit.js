import * as ConnectorZoneModule from '../blocks/ConnectorZone.js';
import * as ConnectorClientGeometry from '../stack-connect/hit-test/connectorClientGeometry.js';
import * as StackChainGraph from '../stack-connect/layout/stackChainGraph.js';

/** @returns {{ cBlock: object, zone: object }|null} */
export function findCBlockBottomInnerHit(
  draggedBlock,
  draggedElement,
  blockRegistry
) {
  if (!draggedBlock || !draggedElement || !blockRegistry) return null;
  let draggedRect;
  try {
    draggedRect = draggedElement.getBoundingClientRect();
  } catch {
    return null;
  }

  for (const block of blockRegistry.values()) {
    if (block.type !== 'c-block' || !block.element) continue;
    if (block.blockUUID === draggedBlock.blockUUID) continue;
    if (
      StackChainGraph.isBlockOnCBlockInnerSubstack(
        draggedBlock,
        block,
        blockRegistry
      ) ||
      (draggedBlock.type === 'c-block' &&
        StackChainGraph.isBlockOnCBlockInnerSubstack(
          block,
          draggedBlock,
          blockRegistry
        ))
    ) {
      continue;
    }

    const zone = ConnectorZoneModule.ConnectorZone.zoneByType(
      block.connectorZones,
      'bottom-inner'
    );
    if (!zone) continue;

    const zoneClient = ConnectorClientGeometry.zoneToClientRect(
      block.element,
      zone
    );
    if (
      zoneClient &&
      ConnectorClientGeometry.rectsIntersectClient(draggedRect, zoneClient)
    ) {
      return { cBlock: block, zone };
    }
  }
  return null;
}
