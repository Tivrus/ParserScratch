import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

const C_BLOCK_RESIZE_KEY = 'c-block';

/**
 * Вертикальное растяжение c-block при top-inner: высота силуэта перетаскиваемого блока
 * (как у ghost) минус `START_BLOCK_NORMAL_STACK_EXTRA_Y` из `constants/Global`.
 */
export function cBlockTopInnerStretchDeltaY(draggedElement) {
  if (!draggedElement || typeof draggedElement.getBBox !== 'function') {
    return 0;
  }
  let h;
  try {
    h = draggedElement.getBBox().height;
  } catch {
    return 0;
  }
  if (!Number.isFinite(h) || h <= 0) {
    return 0;
  }
  const raw = h - Global.START_BLOCK_NORMAL_STACK_EXTRA_Y;
  return raw > 0 ? raw : 0;
}

/**
 * У c-block два индекса `v` в resize — делим дельту, чтобы суммарное растяжение совпало с ожидаемым.
 */
export function cBlockVerticalStretchPerVCommand(totalVerticalPx) {
  const vIndices = SvgUtils.getResizeConfig(C_BLOCK_RESIZE_KEY).vIndices;
  const n = vIndices?.length ?? 1;
  return n > 0 ? totalVerticalPx / n : totalVerticalPx;
}

export function buildStretchedCBlockPathD(basePathD, totalVerticalPx) {
  if (!basePathD || totalVerticalPx <= 0) {
    return basePathD;
  }
  const perV = cBlockVerticalStretchPerVCommand(totalVerticalPx);
  return SvgUtils.resizePath(basePathD, {
    vertical: perV,
    horizontal: 0,
    ...SvgUtils.getResizeConfig(C_BLOCK_RESIZE_KEY),
  });
}

export function getWorkspaceBlockPathElement(block) {
  if (!block?.element || typeof block.element.querySelector !== 'function') {
    return null;
  }
  return block.element.querySelector(':scope > path') ?? null;
}
