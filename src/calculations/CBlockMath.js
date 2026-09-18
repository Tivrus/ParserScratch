import * as Global from '../constants/Global.js'
import * as MathUtils from '../utils/MathUtils.js'

export function calc_TopInnerY_Empty(){
  return (
    Global.ZONE_HEIGHT / 2 + Global.ZONE_HEIGHT - Global.ZONE_SOCKET_HEIGHT / 2
  )
}

export function calc_TopInnerY(innerHeadY, cBlockY){
  const localY = innerHeadY + 1 - cBlockY
  if (!Number.isFinite(localY)) return null
  return localY - Global.ZONE_HEIGHT / 2
}

export function build_TopInnerZone(x, width, y){
  return {
    type: 'top-inner',
    x: x + Global.CBLOCK_NESTED_X_OFFSET,
    y,
    width: width - Global.CBLOCK_NESTED_X_OFFSET,
    height: Global.ZONE_HEIGHT,
  }
}

export function build_TopInnerZone_Empty(geom){
  return build_TopInnerZone(geom.ZoneX, geom.width, calc_TopInnerY_Empty())
}

export function calc_BottomInnerY(tailBottomY){
  return (
    tailBottomY - Global.ZONE_HEIGHT / 2 + Global.ZONE_SOCKET_HEIGHT / 2
  )
}

export function build_BottomInnerZone(geom, tailBottomY){
  return {
    type: 'bottom-inner',
    x: geom.ZoneX + Global.CBLOCK_NESTED_X_OFFSET,
    y: calc_BottomInnerY(tailBottomY),
    width: geom.width - Global.CBLOCK_NESTED_X_OFFSET,
    height: Global.ZONE_HEIGHT,
  }
}

export function calc_InnerGhostY(cBlockY, slotY, slotHeight){
  return (
    cBlockY + slotY + slotHeight - Global.ZONE_HEIGHT + Global.ZONE_SOCKET_HEIGHT / 2
  )
}

export function calc_PrependSpread(height){
  return MathUtils.clampNonNegative(height - Global.ZONE_SOCKET_HEIGHT)
}

export function calc_PrependSpread_Total(baseSpread, endsWithStop){
  if (endsWithStop) return baseSpread + Global.ZONE_SOCKET_HEIGHT
  return baseSpread
}

export function calc_PathStretch_FromGhost(ghostHeight, isEmpty, endsWithStop){
  if (isEmpty){
    if (endsWithStop){
      return (
        ghostHeight - Global.C_BLOCK_EMPTY_INNER_SPACE + Global.ZONE_SOCKET_HEIGHT / 2 - Global.EXTRA_Y
      )
    }
    return (
      ghostHeight - Global.C_BLOCK_EMPTY_INNER_SPACE - Global.ZONE_SOCKET_HEIGHT / 2 - Global.EXTRA_Y
    )
  }
  return ghostHeight - Global.ZONE_SOCKET_HEIGHT / 2 - Global.EXTRA_Y
}

export function calc_PathStretch_FromStack(stackHeight, endsWithStop){
  if (!Number.isFinite(stackHeight)) return 0
  if (endsWithStop){
    return (
      stackHeight - Global.C_BLOCK_EMPTY_INNER_SPACE + Global.ZONE_SOCKET_HEIGHT / 2 - Global.EXTRA_Y * 2
    )
  }
  return (
    stackHeight - Global.C_BLOCK_EMPTY_INNER_SPACE - Global.ZONE_SOCKET_HEIGHT / 2 - Global.EXTRA_Y * 2
  )
}

export function calc_InnerStackHeight(heights){
  if (!heights.length) return 0
  let total = heights[0]
  for (let i = 1; i < heights.length; i++){
    total += heights[i] - Global.ZONE_SOCKET_HEIGHT
  }
  return total
}
