import * as SvgUtils from '../../infrastructure/svg/SvgUtils.js';
import * as StackWorkspaceMath from '../../calculations/StackWorkspaceMath.js';
import * as StackHatOffsets from '../../calculations/stackHatOffsets.js';

export { capStackExtraY, middleTailSpreadExtraY } from '../../calculations/stackHatOffsets.js';

/** Раскладка стека: мировые координаты под `#block-world-root` плюс смещение сетки. */
export class StackSnapLayout {
  static translateInContainer(
    anchorBlock,
    draggedElement,
    mode,
    { isMiddleConnector = false } = {}
  ) {
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

    const hatBlockExtraYRaw = StackHatOffsets.capStackExtraY(draggedElement, {
      middleConnector: isMiddleConnector,
    });
    const hatBlockExtraY = Number.isFinite(hatBlockExtraYRaw)
      ? hatBlockExtraYRaw
      : 0;

    if (mode === 'below') {
      return {
        x: anchorTranslateX,
        y: StackWorkspaceMath.worldYStackBelow(
          anchorTranslateY,
          anchorLocalBBox.y,
          anchorLocalBBox.height,
          hatBlockExtraY
        ),
      };
    }

    if (mode === 'above') {
      const nonHatStackNudgeY =
        StackHatOffsets.stackAboveNudgeYForNonStartDragged(draggedElement);
      return {
        x: anchorTranslateX,
        y: StackWorkspaceMath.worldYStackAbove(
          anchorTranslateY,
          anchorLocalBBox.y,
          draggedBlockHeight,
          hatBlockExtraY,
          nonHatStackNudgeY
        ),
      };
    }

    return null;
  }

  /** Слот между родителем и ребёнком; middle: доп. сдвиг шляпы только для start-block. */
  static translateMiddleInsert(parentBlock, draggedElement) {
    return this.translateInContainer(parentBlock, draggedElement, 'below', {
      isMiddleConnector: true,
    });
  }
}
