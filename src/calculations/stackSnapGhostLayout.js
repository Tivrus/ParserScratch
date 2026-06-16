import * as Global from '../../../src/constants/Global.js';

export function calcDragGhostTopLeftWorldXYForSnapBelowStackAnchor(
    anchorTranslateX,
    anchorTranslateY,
    anchorLocalTopY,
    anchorLocalHeight,
    startBlockSnapExtraWorldY
  ){
  return {
    x: anchorTranslateX,
    y: anchorTranslateY + anchorLocalTopY + (anchorLocalHeight - Global.ZONE_SOCKET_HEIGHT) + startBlockSnapExtraWorldY
  };
}

export function calcDragGhostTopLeftWorldXYForSnapAboveStackAnchor(
    anchorTranslateX,
    anchorTranslateY,
    anchorLocalTopY,
    draggedBlockHeight,
    startBlockSnapExtraWorldY,
    plainBlockStackMicroNudgeWorldY
  ){
  return {
    x: anchorTranslateX,
    y: anchorTranslateY + anchorLocalTopY + Global.ZONE_SOCKET_HEIGHT - draggedBlockHeight - startBlockSnapExtraWorldY - plainBlockStackMicroNudgeWorldY
  };
}

export function calcDragGhostTopLeftWorldXYForSnapChainPrefixOnStackHead(
    anchorHeadTranslateX,
    anchorHeadTranslateY,
    heldChainHeadHeight
  ){
  return {
    x: anchorHeadTranslateX,
    y: anchorHeadTranslateY - heldChainHeadHeight + Global.ZONE_SOCKET_HEIGHT - Global.EXTRA_Y
  };
}
