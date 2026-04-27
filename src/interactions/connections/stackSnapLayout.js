import * as Global from '../../constans/Global.js';
import * as SvgUtils from '../../utils/SvgUtils.js';

/** Extra Y offset for hat blocks only: normal stack → small gap; middle insert → socket height. */
export function capStackExtraY(draggedElement, options = {}) {
  const middleConnector = options.middleConnector === true;
  if (!draggedElement || !draggedElement.dataset || draggedElement.dataset.type !== 'start-block') {
    return 0;
  }
  if (middleConnector) {
    return Global.CONNECTOR_SOCKET_HEIGHT;
  }
  return Global.START_BLOCK_NORMAL_STACK_EXTRA_Y;
}

/** Middle-preview tail spread: +CONNECTOR_SOCKET_HEIGHT for hat and cap blocks. */
export function middleTailSpreadExtraY(draggedElement) {
  const blockDatasetType = draggedElement?.dataset?.type;
  if (blockDatasetType === 'start-block' || blockDatasetType === 'stop-block') {
    return Global.CONNECTOR_SOCKET_HEIGHT;
  }
  return 0;
}

// --- Stack layout (world coords under #block-world-root + grid view offset) ---
export class StackSnapLayout {
  static translateInContainer(anchorBlock, draggedElement, mode, { isMiddleConnector = false } = {}) {
    const anchorElement = anchorBlock.element;
    if (!anchorElement) return null;

    const { x: anchorTranslateX, y: anchorTranslateY } = SvgUtils.parseTranslateTransform(anchorElement);
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

    const hatBlockExtraYRaw = capStackExtraY(draggedElement, { middleConnector: isMiddleConnector });
    const hatBlockExtraY = Number.isFinite(hatBlockExtraYRaw) ? hatBlockExtraYRaw : 0;

    if (mode === 'below') {
      return {
        x: anchorTranslateX,
        y:
          anchorTranslateY +
          anchorLocalBBox.y +
          anchorLocalBBox.height -
          Global.CONNECTOR_SOCKET_HEIGHT +
          hatBlockExtraY,
      };
    }

    if (mode === 'above') {
      let nonHatStackNudgeY = 0;
      if (
        draggedElement &&
        draggedElement.dataset &&
        draggedElement.dataset.type !== 'start-block'
      ) {
        nonHatStackNudgeY = Global.START_BLOCK_NORMAL_STACK_EXTRA_Y;
      }
      return {
        x: anchorTranslateX,
        y:
          anchorTranslateY +
          anchorLocalBBox.y +
          Global.CONNECTOR_SOCKET_HEIGHT -
          draggedBlockHeight -
          hatBlockExtraY -
          nonHatStackNudgeY,
      };
    }

    return null;
  }

  // Slot between parent and child — middle: +cap offset only for start-block.
  static translateMiddleInsert(parentBlock, draggedElement) {
    return this.translateInContainer(parentBlock, draggedElement, 'below', {
      isMiddleConnector: true,
    });
  }
}
