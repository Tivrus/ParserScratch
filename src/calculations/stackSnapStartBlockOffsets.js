import * as Global from '../../../src/constants/Global.js';

function getBlockType(element){
  if (!element || typeof element.getAttribute !== 'function'){
    return undefined;
  }
  const fromAttr = element.getAttribute('data-type');
  return fromAttr || undefined;
}

export function calc_StartBlockGhost_Pos(draggedElement, isMiddleZoneSnap){
  const draggedType = getBlockType(draggedElement);

  if (draggedType == 'start-block') return 0;
  if (isMiddleZoneSnap) return Global.ZONE_SOCKET_HEIGHT;
  return Global.EXTRA_Y;
}


export function calc_StopBlockGhost_Pos(draggedElement){
  const tailBlockType = getBlockType(draggedElement);
  if (tailBlockType === 'start-block' || tailBlockType === 'stop-block'){
    return Global.ZONE_SOCKET_HEIGHT;
  }
  return 0;
}


export function calc_StartBlock_PosFix(draggedElement){
  const draggedType = getBlockType(draggedElement);
  
  if (draggedType !== 'start-block') return Global.EXTRA_Y;
  return 0;
}
