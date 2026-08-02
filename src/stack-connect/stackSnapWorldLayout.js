import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as StackSnapGhostLayout from '../calculations/StackSnapGhostMath.js';
import * as StackSnapStartBlockOffsets from '../calculations/StackSnapStartBlockMath.js';

export class StackSnapWorldLayout {
  static calc_BlockWorldPosition_ForSnap(
    anchorBlock,
    draggedElement,
    mode,
    { isMiddleZone = false } = {}
  ){
    const anchorElement = anchorBlock.element;
    if (!anchorElement) return null;

    const { x: anchorTranslateX, y: anchorTranslateY } =
      SvgUtils.parseTranslateTransform(anchorElement);
    const anchorLocalBBox = SvgUtils.getElementBBox(anchorElement);
    if (!anchorLocalBBox) return null;

    const draggedBlockHeight = SvgUtils.getElementBBoxHeight(draggedElement);
    if (!draggedBlockHeight) return null;

    const startBlockSnapExtraWorldYRaw =
      StackSnapStartBlockOffsets.calc_StackSnap_StartBlockGhost_ExtraY(
        draggedElement,
        isMiddleZone
      );
    let startBlockSnapExtraWorldY;
    if (Number.isFinite(startBlockSnapExtraWorldYRaw)){
      startBlockSnapExtraWorldY = startBlockSnapExtraWorldYRaw;
    } else {
      startBlockSnapExtraWorldY = 0;
    }

    if (mode === 'below'){
      return StackSnapGhostLayout.calc_StackSnapGhost_BelowAnchor_WorldPos(
        anchorTranslateX,
        anchorTranslateY,
        anchorLocalBBox.y,
        anchorLocalBBox.height,
        startBlockSnapExtraWorldY
      );
    }

    if (mode === 'above'){
      const plainBlockAboveAnchorNudgeWorldY =
        StackSnapStartBlockOffsets.calc_StackSnap_StartBlock_PosFixY(draggedElement);
      return StackSnapGhostLayout.calc_StackSnapGhost_AboveAnchor_WorldPos(
        anchorTranslateX,
        anchorTranslateY,
        anchorLocalBBox.y,
        draggedBlockHeight,
        startBlockSnapExtraWorldY,
        plainBlockAboveAnchorNudgeWorldY
      );
    }

    return null;
  }

  static calc_BlockWorldPosition_ForMiddleZoneInsert(
    parentBlock,
    draggedElement
  ){
    return this.calc_BlockWorldPosition_ForSnap(
      parentBlock,
      draggedElement,
      'below',
      { isMiddleZone: true }
    );
  }
}

export function reposition_FollowingStackBlocks(fromBlock, blockRegistry){
  let currentBlock = fromBlock;
  while (currentBlock.nextUUID){
    const nextBlock = blockRegistry.get(currentBlock.nextUUID);
    if (!nextBlock || !nextBlock.element) break;
    const nextWorldPosition = StackSnapWorldLayout.calc_BlockWorldPosition_ForSnap(
      currentBlock,
      nextBlock.element,
      'below'
    );
    if (!nextWorldPosition) break;
    nextBlock.setPosition(nextWorldPosition.x, nextWorldPosition.y);
    currentBlock = nextBlock;
  }
}
