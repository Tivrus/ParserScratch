import { CONNECTOR_SOCKET_HEIGHT } from '../../constans/Global.js';
import { parseTranslateTransform } from '../../utils/SvgUtils.js';

// Translate for the dragged block in block-container space when it stacks to another block.

export function stackSnapTranslateInContainer(anchorBlock, draggedElement, mode) {
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

  if (mode === 'below') {
    return { x: tx, y: ty + staticBBox.y + staticBBox.height - CONNECTOR_SOCKET_HEIGHT };
  }

  if (mode === 'above') {
    return { x: tx, y: ty + staticBBox.y + CONNECTOR_SOCKET_HEIGHT - draggedHeight };
  }

  return null;
}
