import * as Global from '../constants/Global.js'

export function calc_TopZoneY(blockTopY){
  return blockTopY - Global.ZONE_HEIGHT
}

export function calc_BottomZoneY(blockBottomY){
  return blockBottomY - Global.ZONE_SOCKET_HEIGHT
}

export function is_RectsOverlap(a, b){
  if (!a || !b) return false
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  )
}

export function calc_ZoneClientRect(blockEl, zone){
  const svg = blockEl.ownerSVGElement
  if (!svg ||
    typeof svg.createSVGPoint !== 'function' ||
    typeof blockEl.getScreenCTM !== 'function'
  ){
    return null
  }

  const matrix = blockEl.getScreenCTM()
  if (!matrix) return null

  const point = svg.createSVGPoint()
  const corners = [
    [zone.x, zone.y],
    [zone.x + zone.width, zone.y],
    [zone.x + zone.width, zone.y + zone.height],
    [zone.x, zone.y + zone.height],
  ]

  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity

  for (const [x, y] of corners){
    point.x = x
    point.y = y
    try {
      const client = point.matrixTransform(matrix)
      left = Math.min(left, client.x)
      top = Math.min(top, client.y)
      right = Math.max(right, client.x)
      bottom = Math.max(bottom, client.y)
    } catch {
      return null
    }
  }

  return { left, top, right, bottom }
}

export function calc_OverlapMidY(parentRect, childRect){
  const top = Math.max(parentRect.top, childRect.top)
  const bottom = Math.min(parentRect.bottom, childRect.bottom)
  return (top + bottom) / 2
}

export function calc_AvgMidY(parentRect, childRect){
  const parentMid = (parentRect.top + parentRect.bottom) / 2
  const childMid = (childRect.top + childRect.bottom) / 2
  return (parentMid + childMid) / 2
}

export function calc_HitBand(centerY, height){
  const half = height / 2
  return {
    top: centerY - half,
    bottom: centerY + half,
  }
}
