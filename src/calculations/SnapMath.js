import * as Global from '../constants/Global.js'

function read_Type(blockEl){
  if (!blockEl || typeof blockEl.getAttribute !== 'function') return undefined
  return blockEl.getAttribute('data-type') || undefined
}

export function calc_SnapExtraY_Below(blockEl, isMiddle){
  const type = read_Type(blockEl)
  if (type === 'start-block') return 0
  if (isMiddle) return Global.ZONE_SOCKET_HEIGHT
  return Global.EXTRA_Y
}

export function calc_SnapExtraY_Spread(blockEl){
  const type = read_Type(blockEl)
  if (type === 'start-block' || type === 'stop-block'){
    return Global.ZONE_SOCKET_HEIGHT
  }
  return 0
}

export function calc_SnapExtraY_Above(blockEl){
  const type = read_Type(blockEl)
  if (type !== 'start-block') return Global.EXTRA_Y
  return 0
}

export function calc_GhostBelow(anchorX, anchorY, localTop, localHeight, extraY){
  return {
    x: anchorX,
    y: anchorY + localTop + (localHeight - Global.ZONE_SOCKET_HEIGHT) + extraY,
  }
}

export function calc_GhostAbove(
  anchorX,
  anchorY,
  localTop,
  draggedHeight,
  extraY,
  nudgeY
){
  return {
    x: anchorX,
    y: anchorY + localTop + (draggedHeight - Global.ZONE_SOCKET_HEIGHT) + extraY + nudgeY,
  }
}

export function calc_GhostPrefix(anchorX, anchorY, headHeight){
  return {
    x: anchorX,
    y: anchorY + (headHeight - Global.ZONE_SOCKET_HEIGHT) + Global.EXTRA_Y,
  }
}

export function calc_SpreadTailY(blockY, deltaY){
  return blockY + deltaY - Global.ZONE_SOCKET_HEIGHT + Global.EXTRA_Y
}
