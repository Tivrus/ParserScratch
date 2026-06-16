import * as Global from '../../../src/constants/Global.js';

export function sumStackedBlockNominalHeightsPxWithSocketOverlapBetweenLinks(
    orderedBlockHeightsPx,
    ZoneSocketHeightPx = Global.ZONE_SOCKET_HEIGHT
  ){
  if (!orderedBlockHeightsPx.length){
    return 0;
  }
  let totalPx = orderedBlockHeightsPx[0];
  for (let index = 1; index < orderedBlockHeightsPx.length; index++){
    totalPx += orderedBlockHeightsPx[index] - ZoneSocketHeightPx;
  }
  return totalPx;
}
