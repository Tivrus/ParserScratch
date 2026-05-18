/** Сокеты stack snap снизу / сверху в координатах клиента. */

import * as ZoneModule from '../../blocks/ZoneModule.js';
import * as ZoneClientGeometry from './ZoneClientGeometry.js';
import * as StackMiddleJoint from './stackMiddleJoint.js';

/**
 * @returns {{ el: Element, zone: object, middlePair?: { parent: object, child: object } }|null}
 */
export function getStackSocketBelow(anchorBlock, blockRegistry){
  const bottomZone = ZoneModule.Zone.zoneByType(anchorBlock.Zones, 'bottom');
  
  if (bottomZone) return { el: anchorBlock.element, zone: bottomZone };
  if (blockRegistry && anchorBlock.nextUUID){
    const childBlock = blockRegistry.get(anchorBlock.nextUUID);
    const middleZone = childBlock
      ? StackMiddleJoint.middleJointOnParent(anchorBlock, childBlock)
      : null;
    if (middleZone && anchorBlock && anchorBlock.element){
      return {
        el: anchorBlock.element,
        zone: middleZone,
        middlePair: { parent: anchorBlock, child: childBlock },
      };
    }
  }
  return null;
}

/**
 * @returns {{ el: Element, zone: object, middlePair?: { parent: object, child: object } }|null}
 */
export function getStackSocketAbove(anchorBlock, blockRegistry){
  const topZone = ZoneModule.Zone.zoneByType(anchorBlock.Zones, 'top');

  if (topZone) return { el: anchorBlock.element, zone: topZone };
  if (blockRegistry && anchorBlock.parentUUID){
    const parentBlock = blockRegistry.get(anchorBlock.parentUUID);
    const middleZone = parentBlock ? StackMiddleJoint.middleJointOnParent(parentBlock, anchorBlock) : null;
    if (middleZone && parentBlock && parentBlock.element){
      return {
        el: parentBlock.element,
        zone: middleZone,
        middlePair: { parent: parentBlock, child: anchorBlock },
      };
    }
  }
  return null;
}

/** Пересечение bbox перетаскиваемого `<g>` с зоной; для middle — живая полоса шва (`middlePair`). */
export function draggedOutlineIntersectsSocket(draggedBlock, resolvedSocket){
  const draggedClientRect = draggedBlock.element.getBoundingClientRect();
  let socketClientRect;
  if (resolvedSocket.zone && resolvedSocket.zone.type === 'middle' && resolvedSocket.middlePair){

    const { parent, child } = resolvedSocket.middlePair;
    socketClientRect = StackMiddleJoint.middleJointBandClientRect(parent, child, resolvedSocket.zone);

  }else{
    socketClientRect = ZoneClientGeometry.zoneToClientRect(resolvedSocket.el, resolvedSocket.zone);
  }
  if (!socketClientRect) return false;
  return ZoneClientGeometry.rectsIntersectClient(
    draggedClientRect,
    socketClientRect
  );
}
