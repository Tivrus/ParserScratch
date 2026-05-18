import * as SvgUtils from '../../infrastructure/svg/SvgUtils.js';
import * as StackSnapGhostLayout from '../../calculations/stackSnapGhostLayout.js';
import * as StackSnapStartBlockOffsets from '../../calculations/stackSnapStartBlockOffsets.js';

/** Раскладка стека: мировые координаты под `#block-world-root` плюс смещение сетки. */
export class StackSnapLayout {
  static translateInContainer(
    anchorBlock,
    draggedElement,
    mode,
    { isMiddleZone = false } = {}
  ){
    const anchorElement = anchorBlock.element;
    if (!anchorElement) return null;

    const { x: anchorTranslateX, y: anchorTranslateY } =
      SvgUtils.parseTranslateTransform(anchorElement);
    let anchorLocalBBox;
    try {
      anchorLocalBBox = anchorElement.getBBox();
    } catch {
      return null;
    }

    let draggedBlockHeight;
    try {
      draggedBlockHeight = draggedElement.getBBox().height;
    } catch {
      return null;
    }

    const startBlockSnapExtraWorldYRaw = StackSnapStartBlockOffsets.calc_StartBlockGhost_Pos(draggedElement, isMiddleZone);
    let startBlockSnapExtraWorldY;
    if (Number.isFinite(startBlockSnapExtraWorldYRaw)){
      startBlockSnapExtraWorldY = startBlockSnapExtraWorldYRaw;
    } else {
      startBlockSnapExtraWorldY = 0;
    }

    if (mode === 'below'){
      return StackSnapGhostLayout.calcDragGhostTopLeftWorldXYForSnapBelowStackAnchor(
        anchorTranslateX,
        anchorTranslateY,
        anchorLocalBBox.y,
        anchorLocalBBox.height,
        startBlockSnapExtraWorldY
      );
    }

    if (mode === 'above'){
      const plainBlockAboveAnchorNudgeWorldY = StackSnapStartBlockOffsets.calc_StartBlock_PosFix(draggedElement);
      return StackSnapGhostLayout.calcDragGhostTopLeftWorldXYForSnapAboveStackAnchor(
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

  /** Слот между родителем и ребёнком; middle: дополнительный сдвиг только для start-block. */
  static translateMiddleInsert(parentBlock, draggedElement){
    return this.translateInContainer(parentBlock, draggedElement, 'below', {
      isMiddleZone: true,
    });
  }
}
