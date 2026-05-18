import * as Global from '../constants/Global.js';
import * as MathUtils from '../infrastructure/math/MathUtils.js';

export function calc_CblockZone_TopInner_Pos_WhenIsEmpty(){
  return (Global.ZONE_HEIGHT/2 + Global.ZONE_HEIGHT - Global.ZONE_SOCKET_HEIGHT/2);
}

export function calc_CblockZone_TopInner_Pos(CblockYPos, innerHeadBlockYPos){
  return (CblockYPos + 1) - innerHeadBlockYPos;
}

export function build_CblockZone_TopInner(CblockXPos, width, CblockInnerZoneYPos){
  return {
    type: 'top-inner',
    x: CblockXPos + Global.CBLOCK_NESTED_X_OFFSET,
    y: CblockInnerZoneYPos,
    width: width - Global.CBLOCK_NESTED_X_OFFSET,
    height: Global.ZONE_HEIGHT,
  };
}



export function calc_CblockZone_BottomInner_Pos(innerTailBlockBottomEdgeYPos){
  return innerTailBlockBottomEdgeYPos - Global.ZONE_HEIGHT/2 + Global.ZONE_SOCKET_HEIGHT/2;
}


export function calc_CblockGhost_and_InnerBlocks_Pos(cBlockTranslateY, slotTopLocalY, slotHeightPx){
  return cBlockTranslateY + slotTopLocalY + slotHeightPx - Global.ZONE_HEIGHT + Global.ZONE_SOCKET_HEIGHT/2;
}

export function calc_Cblock_InputBlocks_childrenNested_Xoffset(cBlockTranslateX, slotLeftLocalX){
  return cBlockTranslateX + slotLeftLocalX;
}


export function calcTopInnerPrependSpreadClampedPx(silhouetteHeightPx){
  return MathUtils.clampNonNegative(silhouetteHeightPx - Global.ZONE_SOCKET_HEIGHT);
}

export function calcTopInnerPrependTotalSpreadPx(baseSpreadPx, draggedChainEndsWithStopBlock){
  if (draggedChainEndsWithStopBlock){
    return baseSpreadPx + Global.ZONE_SOCKET_HEIGHT
  }
  return baseSpreadPx;
}

export function calc_CblockInnerStack_BodyPath_PerLeg_VerticalStretchPx_FromGhostHeight_ForTopInnerPreview(
    ghostSilhouetteHeightPx,
    isInnerStackEmpty = true,
    draggedChainEndsWithStopBlock
  ){
  if (isInnerStackEmpty){
    if (draggedChainEndsWithStopBlock)
      return (
        ghostSilhouetteHeightPx - Global.C_BLOCK_EMPTY_INNER_SPACE + Global.ZONE_SOCKET_HEIGHT/2 - Global.EXTRA_Y
      );
    return (
      ghostSilhouetteHeightPx - Global.C_BLOCK_EMPTY_INNER_SPACE - Global.ZONE_SOCKET_HEIGHT/2 - Global.EXTRA_Y
    );
  }
  return ghostSilhouetteHeightPx - Global.ZONE_SOCKET_HEIGHT/2 - Global.EXTRA_Y;
}

export function calc_CblockInnerStack_BodyPath_PerLeg_VerticalStretchDeltaPx_ForInnerStackNominalHeight(
    ghostPathHeightPx,
    innerStackChainEndsWithStopBlock
  ){
  if (!Number.isFinite(ghostPathHeightPx)) return 0;
  const emptyInnerSpacePx = Global.C_BLOCK_EMPTY_INNER_SPACE;

  if (innerStackChainEndsWithStopBlock){
    return ghostPathHeightPx - emptyInnerSpacePx + Global.ZONE_SOCKET_HEIGHT/2 - Global.EXTRA_Y*2;
  }

  return ghostPathHeightPx - emptyInnerSpacePx - Global.ZONE_SOCKET_HEIGHT/2 - Global.EXTRA_Y*2;
}
