import { buildCBlockInnerStackStretchedPathD } from './cBlockInnerStackPathStretch.js';

// Same silhouette as GhostBlock: first child `<path>` bbox, else the group bbox.
function silhouetteHeightPx(draggedElement) {
  if (!draggedElement) return 0;
  try {
    const pathEl = draggedElement.querySelector?.(':scope > path');
    if (pathEl && typeof pathEl.getBBox === 'function') {
      const { height } = pathEl.getBBox();
      if (Number.isFinite(height) && height > 0) return height;
    }
    if (typeof draggedElement.getBBox === 'function') {
      const { height } = draggedElement.getBBox();
      if (Number.isFinite(height) && height > 0) return height;
    }
  } catch {
    return 0;
  }
  return 0;
}

/** Vertical stretch budget for top-inner preview: matches ghost path height. */
export function cBlockTopInnerStretchDeltaY(draggedElement) {
  const h = silhouetteHeightPx(draggedElement);
  return h > 0 ? h : 0;
}

/**
 * Delegates to explicit inner-stack path stretch; `draggedBlockType` selects the per-leg formula.
 */
export function buildStretchedCBlockPathD(basePathD, ghostPathHeightPx, draggedBlockType) {
  if (!basePathD || ghostPathHeightPx <= 0) {
    return basePathD;
  }
  return buildCBlockInnerStackStretchedPathD(basePathD, ghostPathHeightPx, draggedBlockType);
}

export function getWorkspaceBlockPathElement(block) {
  if (!block?.element || typeof block.element.querySelector !== 'function') {
    return null;
  }
  return block.element.querySelector(':scope > path') ?? null;
}
