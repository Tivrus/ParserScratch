import * as Global from '../constants/Global.js';

export function calc_StackSnapGhost_BelowAnchor_WorldPos(
  anchorTranslateX,
  anchorTranslateY,
  anchorLocalTopY,
  anchorLocalHeight,
  startBlockSnapExtraWorldY
){
  return {
    x: anchorTranslateX,
    y:
      anchorTranslateY +
      anchorLocalTopY +
      (anchorLocalHeight - Global.ZONE_SOCKET_HEIGHT) +
      startBlockSnapExtraWorldY,
  };
}

export function calc_StackSnapGhost_AboveAnchor_WorldPos(
  anchorTranslateX,
  anchorTranslateY,
  anchorLocalTopY,
  draggedBlockHeight,
  startBlockSnapExtraWorldY,
  plainBlockStackMicroNudgeWorldY
){
  return {
    x: anchorTranslateX,
    y:
      anchorTranslateY +
      anchorLocalTopY +
      Global.ZONE_SOCKET_HEIGHT -
      draggedBlockHeight -
      startBlockSnapExtraWorldY -
      plainBlockStackMicroNudgeWorldY,
  };
}

export function calc_StackSnapGhost_ChainPrefixOnStackHead_WorldPos(
  anchorHeadTranslateX,
  anchorHeadTranslateY,
  heldChainHeadHeight
){
  return {
    x: anchorHeadTranslateX,
    y:
      anchorHeadTranslateY -
      heldChainHeadHeight +
      Global.ZONE_SOCKET_HEIGHT -
      Global.EXTRA_Y,
  };
}
