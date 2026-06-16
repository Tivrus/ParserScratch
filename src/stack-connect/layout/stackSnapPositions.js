/** Мировые позиции для призрака и приоритеты snap. */

import * as Global from '../../../../src/constants/Global.js';
import * as SvgUtils from '../../infrastructure/svg/SvgUtils.js';
import * as SnapLayout from './stackSnapLayout.js';
import * as StackSnapGhostLayout from '../../calculations/stackSnapGhostLayout.js';
import * as CBlockInnerGhostLayout from '../../c-block/innerGhostLayout.js';
import * as StackChainGraph from './stackChainGraph.js';

/**
 * Мировые координаты под `#block-world-root` (смещение сетки накладывается позже в overlay).
 */
export function workspacePositionForGhostSnap(snap, blockRegistry, draggedElement){
  if (snap.mode === 'topInner' || snap.mode === 'bottomInner'){
    const cBlock = blockRegistry.get(snap.snapUUID);
    if (!cBlock || !cBlock.element) return null;
    if (cBlock.innerStackHeadUUID){
      const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
      if (snap.mode === 'topInner'){
        if (innerHead && innerHead.element){
          return CBlockInnerGhostLayout.calcTopInnerGhostWorldPosition(cBlock);
        }
      } else {
        let innerTail;
        if (innerHead){
          innerTail = StackChainGraph.stackTailBlock(blockRegistry, innerHead);
        } else {
          innerTail = null;
        }
        if (innerTail && innerTail.element){
          return SnapLayout.StackSnapLayout.translateInContainer(
            innerTail,
            draggedElement,
            'below'
          );
        }
      }
    }
    if (snap.mode === 'bottomInner') return null;
    return CBlockInnerGhostLayout.calcTopInnerGhostWorldPosition(cBlock);
  }

  if (snap.mode === 'middle'){
    const parentBlock = blockRegistry.get(snap.parentUUID);
    const childBlock = blockRegistry.get(snap.snapUUID);
    if (!parentBlock || !parentBlock.element || !childBlock || !childBlock.element){
      return null;
    }
    return SnapLayout.StackSnapLayout.translateMiddleInsert(
      parentBlock,
      draggedElement
    );
  }
  console.log(1)

  if (snap.mode === 'prefixOnHead'){
    const anchorHeadBlock = blockRegistry.get(snap.snapUUID);
    if (!anchorHeadBlock || !anchorHeadBlock.element) return null;

    const anchorHeadTranslate = SvgUtils.parseTranslateTransform(anchorHeadBlock.element);
    let heldChainHeadHeight = Global.DEFAULT_BLOCK_HEIGHT;
    try {
      heldChainHeadHeight = draggedElement.getBBox().height;
    } catch {
      /* keep default */
    }
    return StackSnapGhostLayout.calcDragGhostTopLeftWorldXYForSnapChainPrefixOnStackHead(
      anchorHeadTranslate.x,
      anchorHeadTranslate.y,
      heldChainHeadHeight
    );
  }

  const anchorBlock = blockRegistry.get(snap.snapUUID);
  if (!anchorBlock || !anchorBlock.element){
    return null;
  }
  return SnapLayout.StackSnapLayout.translateInContainer(
    anchorBlock,
    draggedElement,
    snap.mode
  );
}

/** Приоритет: middle → prepend к голове → ниже → выше. */
export function pickStackSnapFromCandidates(candidates){
  const middleInsertCandidate = candidates.find(entry => entry.middle);
  if (middleInsertCandidate){
    return {
      snapUUID: middleInsertCandidate.snapUUID,
      parentUUID: middleInsertCandidate.parentUUID,
      mode: 'middle',
    };
  }
  const chainPrefixOnHeadCandidate = candidates.find(
    entry => entry.prefixOnHead
  );
  if (chainPrefixOnHeadCandidate){
    return {
      snapUUID: chainPrefixOnHeadCandidate.snapUUID,
      mode: 'prefixOnHead',
    };
  }
  const stackBelowCandidate = candidates.find(entry => entry.below);
  if (stackBelowCandidate){
    return { snapUUID: stackBelowCandidate.snapUUID, mode: 'below' };
  }
  const stackAboveCandidate = candidates.find(entry => entry.above);
  if (stackAboveCandidate){
    return { snapUUID: stackAboveCandidate.snapUUID, mode: 'above' };
  }
  return null;
}
