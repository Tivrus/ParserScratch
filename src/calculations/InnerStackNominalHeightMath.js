import * as Global from '../constants/Global.js';

export function calc_InnerStack_NominalHeightPx(
  orderedBlockHeightsPx,
  zoneSocketHeightPx = Global.ZONE_SOCKET_HEIGHT
){
  if (!orderedBlockHeightsPx.length) return 0;
  let totalPx = orderedBlockHeightsPx[0];
  for (let index = 1; index < orderedBlockHeightsPx.length; index++){
    totalPx += orderedBlockHeightsPx[index] - zoneSocketHeightPx;
  }
  return totalPx;
}
