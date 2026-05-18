import * as ZoneModule from '../blocks/ZoneModule.js';
import * as ZoneClientGeometry from '../stack-connect/hit-test/ZoneClientGeometry.js';
import * as StackChainGraph from '../stack-connect/layout/stackChainGraph.js';

/** @returns {{ cBlock: object, zone: object }|null} */
export function findCBlockTopInnerHit(
  draggedBlock,
  draggedElement,
  blockRegistry
  ){
  if (!draggedBlock || !draggedBlock.element || !draggedElement || !blockRegistry) return null;
  let draggedRect;
  try {
    draggedRect = draggedElement.getBoundingClientRect();
  } catch {
    return null;
  }

  for (const block of blockRegistry.values()){
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
    ){
      continue;
    }

    const zone = ZoneModule.Zone.zoneByType(block.Zones, 'top-inner');
    if (!zone) continue;
    
    const zoneClient = ZoneClientGeometry.zoneToClientRect(block.element, zone);
    if (zoneClient && ZoneClientGeometry.rectsIntersectClient(draggedRect, zoneClient)){
      return { cBlock: block, zone };
    }
  }
  return null;
}

/**
 * Призрак внутреннего стека: у головы перетаскиваемой цепочки должен быть верхний коннектор (не start-block).
 * Цепочки разрешены; головы start-block исключены и без верхней зоны.
 */
export function isTopInnerGhostEligible(draggedBlock){
  if (!draggedBlock || !draggedBlock.element) return false;
  if (draggedBlock.type === 'start-block') return false;
  return Boolean(
    ZoneModule.Zone.zoneByType(
      draggedBlock.Zones,
      'top'
    )
  );
}
