import * as Global from '../constants/Global.js';

function getBlockType(element){
  if (!element || typeof element.getAttribute !== 'function') return undefined;
  return element.getAttribute('data-type') || undefined;
}

export function calc_StackSnap_StartBlockGhost_ExtraY(
  draggedElement,
  isMiddleZoneSnap
){
  const draggedType = getBlockType(draggedElement);
  if (draggedType === 'start-block') return 0;
  if (isMiddleZoneSnap) return Global.ZONE_SOCKET_HEIGHT;
  return Global.EXTRA_Y;
}

export function calc_StackSnap_StopBlockGhost_ExtraY(draggedElement){
  const tailBlockType = getBlockType(draggedElement);
  if (tailBlockType === 'start-block' || tailBlockType === 'stop-block'){
    return Global.ZONE_SOCKET_HEIGHT;
  }
  return 0;
}

export function calc_StackSnap_StartBlock_PosFixY(draggedElement){
  const draggedType = getBlockType(draggedElement);
  if (draggedType !== 'start-block') return Global.EXTRA_Y;
  return 0;
}
