import * as Global from '../constants/Global.js'

export function calc_GridSnap(
  x, y, cellPx = Global.WORKSPACE_GRID_CELL_PX){
  const sx = Math.round(Number(x)) || 0
  const sy = Math.round(Number(y)) || 0
  if (!Global.WORKSPACE_BLOCK_GRID_SNAP.enabled){
    return { x: sx, y: sy }
  }
  return {
    x: Math.round(sx / cellPx) * cellPx,
    y: Math.round(sy / cellPx) * cellPx,
  }
}
