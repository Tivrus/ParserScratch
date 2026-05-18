import * as Global from '../constants/Global.js';

export function applyMiddlePreviewTailWorldYDeltaForChainSpreadBelowSeam(
    tailBlockModelWorldY,
    spreadDeltaYFromGhost
  ){
  return (tailBlockModelWorldY + spreadDeltaYFromGhost - Global.ZONE_SOCKET_HEIGHT + Global.EXTRA_Y
  );
}

export function calcMiddleZoneHitBandTopLocalYFromSeamMidline(seamCenterLocalY){
  return seamCenterLocalY;
}
