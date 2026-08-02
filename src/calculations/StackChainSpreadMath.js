import * as Global from '../constants/Global.js';

export function calc_StackChain_MiddlePreviewTail_WorldY(
  tailBlockModelWorldY,
  spreadDeltaYFromGhost
){
  return (
    tailBlockModelWorldY +
    spreadDeltaYFromGhost -
    Global.ZONE_SOCKET_HEIGHT +
    Global.EXTRA_Y
  );
}

export function calc_MiddleZone_HitBandTopLocalY(seamCenterLocalY){
  return seamCenterLocalY;
}
