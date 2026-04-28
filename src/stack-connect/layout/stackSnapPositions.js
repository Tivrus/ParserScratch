// --- Workspace positions for ghost preview and snap priority ---

import * as Global from '../../constants/Global.js';
import * as SvgUtils from '../../infrastructure/svg/SvgUtils.js';
import * as SnapLayout from './stackSnapLayout.js';
import * as CBlockInnerGhostLayout from '../../c-block/innerGhostLayout.js';

/**
 * World coordinates under `#block-world-root` (+ grid offset applied later in overlay).
 */
export function workspacePositionForGhostSnap(snap, blockRegistry, draggedElement) {
  if (snap.mode === 'topInner') {
    const cBlock = blockRegistry.get(snap.staticUUID);
    return CBlockInnerGhostLayout.computeTopInnerGhostWorldPosition(cBlock, draggedElement);
  }

  if (snap.mode === 'middle') {
    const parentBlock = blockRegistry.get(snap.parentUUID);
    const childBlock = blockRegistry.get(snap.staticUUID);
    if (!parentBlock?.element || !childBlock?.element) {
      return null;
    }
    return SnapLayout.StackSnapLayout.translateMiddleInsert(parentBlock, draggedElement);
  }

  if (snap.mode === 'prefixOnHead') {
    const anchorHeadBlock = blockRegistry.get(snap.staticUUID);
    if (!anchorHeadBlock?.element) {
      return null;
    }
    const anchorHeadTranslate = SvgUtils.parseTranslateTransform(anchorHeadBlock.element);
    let heldChainHeadHeight = Global.DEFAULT_BLOCK_HEIGHT;
    try {
      heldChainHeadHeight = draggedElement.getBBox().height;
    } catch {
      /* keep default */
    }
    const ghostHeadWorldY =
      anchorHeadTranslate.y -
      heldChainHeadHeight +
      Global.CONNECTOR_SOCKET_HEIGHT -
      Global.START_BLOCK_NORMAL_STACK_EXTRA_Y;
    return {
      x: anchorHeadTranslate.x,
      y: ghostHeadWorldY,
    };
  }

  const anchorBlock = blockRegistry.get(snap.staticUUID);
  if (!anchorBlock?.element) {
    return null;
  }
  return SnapLayout.StackSnapLayout.translateInContainer(anchorBlock, draggedElement, snap.mode);
}

/** Priority: middle → prefix-on-head → below → above. */
export function pickStackSnapFromCandidates(candidates) {
  const middleInsertCandidate = candidates.find(entry => entry.middle);
  if (middleInsertCandidate) {
    return {
      staticUUID: middleInsertCandidate.staticUUID,
      parentUUID: middleInsertCandidate.parentUUID,
      mode: 'middle',
    };
  }
  const chainPrefixOnHeadCandidate = candidates.find(entry => entry.prefixOnHead);
  if (chainPrefixOnHeadCandidate) {
    return { staticUUID: chainPrefixOnHeadCandidate.staticUUID, mode: 'prefixOnHead' };
  }
  const stackBelowCandidate = candidates.find(entry => entry.below);
  if (stackBelowCandidate) {
    return { staticUUID: stackBelowCandidate.staticUUID, mode: 'below' };
  }
  const stackAboveCandidate = candidates.find(entry => entry.above);
  if (stackAboveCandidate) {
    return { staticUUID: stackAboveCandidate.staticUUID, mode: 'above' };
  }
  return null;
}
