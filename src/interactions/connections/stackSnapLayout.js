import {
  CONNECTOR_SOCKET_HEIGHT,
  START_BLOCK_NORMAL_STACK_EXTRA_Y,
} from '../../constans/Global.js';
import { parseTranslateTransform } from '../../utils/SvgUtils.js';

/** Extra Y offset for hat blocks only: normal stack → small gap; middle insert → socket height. */
export function capStackExtraY(draggedElement, options = {}) {
  const middleConnector = options.middleConnector === true;
  if (!draggedElement || !draggedElement.dataset || draggedElement.dataset.type !== 'start-block') return 0

  if (middleConnector) {
    return CONNECTOR_SOCKET_HEIGHT;
  } else {
    return START_BLOCK_NORMAL_STACK_EXTRA_Y;
  }
}

// Middle-preview tail spread: +CONNECTOR_SOCKET_HEIGHT for hat and cap blocks.
export function middleTailSpreadExtraY(draggedElement) {
  const t = draggedElement?.dataset?.type;
  if (t === 'start-block' || t === 'stop-block') return CONNECTOR_SOCKET_HEIGHT;
  return 0;
}

// --- Stack layout (block-container translate) ---
export class StackSnapLayout {
  static translateInContainer(anchorBlock, draggedElement, mode, { isMiddleConnector = false } = {}) {
    const el = anchorBlock.element;
    if (!el) return null;

    const { x: tx, y: ty } = parseTranslateTransform(el);
    let staticBBox;
    try {
      staticBBox = el.getBBox();
    } catch {
      return null;
    }

    let draggedHeight;
    try {
      draggedHeight = draggedElement.getBBox().height;
    } catch {
      return null;
    }

    const capRaw = capStackExtraY(draggedElement, { middleConnector: isMiddleConnector });
    const capY = Number.isFinite(capRaw) ? capRaw : 0;

    if (mode === 'below') {
      return {
        x: tx,
        y: ty + staticBBox.y + staticBBox.height - CONNECTOR_SOCKET_HEIGHT + capY,
      };
    }

    if (mode === 'above') {
      let aboveNonHatNudge = 0;
      if (draggedElement && draggedElement.dataset && draggedElement.dataset.type !== 'start-block') {
        aboveNonHatNudge = START_BLOCK_NORMAL_STACK_EXTRA_Y;
      }
      return {
        x: tx,
        y: ty + staticBBox.y + CONNECTOR_SOCKET_HEIGHT - draggedHeight - capY - aboveNonHatNudge,
      };
    }
    
    return null;
  }

  // Slot between parent and child — middle: +cap offset only for start-block.
  static translateMiddleInsert(parentBlock, draggedElement) {
    return this.translateInContainer(parentBlock, draggedElement, 'below', { isMiddleConnector: true });
  }
}
