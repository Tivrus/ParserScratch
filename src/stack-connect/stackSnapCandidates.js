import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as StackSnapWorldLayout from './stackSnapWorldLayout.js';
import * as StackSnapGhostLayout from '../calculations/StackSnapGhostMath.js';
import * as CBlockInnerGhostPos from '../c-block/CBlockInnerGhostPos.js';
import * as StackChainGraph from './stackChainGraph.js';

export function calc_GhostSnap_WorldPosition(
  snap,
  blockRegistry,
  draggedElement
){
  if (snap.mode === 'topInner' || snap.mode === 'bottomInner'){
    const cBlock = blockRegistry.get(snap.snapUUID);
    if (!cBlock || !cBlock.element) return null;
    if (cBlock.innerStackHeadUUID){
      const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
      if (snap.mode === 'topInner'){
        if (innerHead && innerHead.element){
          return CBlockInnerGhostPos.calc_CblockTopInnerGhost_WorldPos(cBlock);
        }
      } else {
        let innerTail;
        if (innerHead){
          innerTail = StackChainGraph.find_StackTail_Block(
            blockRegistry,
            innerHead
          );
        } else {
          innerTail = null;
        }
        if (innerTail && innerTail.element){
          return StackSnapWorldLayout.StackSnapWorldLayout.calc_BlockWorldPosition_ForSnap(
            innerTail,
            draggedElement,
            'below'
          );
        }
      }
    }
    if (snap.mode === 'bottomInner') return null;
    return CBlockInnerGhostPos.calc_CblockTopInnerGhost_WorldPos(cBlock);
  }

  if (snap.mode === 'middle'){
    const parentBlock = blockRegistry.get(snap.parentUUID);
    const childBlock = blockRegistry.get(snap.snapUUID);
    if (
      !parentBlock ||
      !parentBlock.element ||
      !childBlock ||
      !childBlock.element
    ){
      return null;
    }
    return StackSnapWorldLayout.StackSnapWorldLayout.calc_BlockWorldPosition_ForMiddleZoneInsert(
      parentBlock,
      draggedElement
    );
  }

  if (snap.mode === 'prefixOnHead'){
    const anchorHeadBlock = blockRegistry.get(snap.snapUUID);
    if (!anchorHeadBlock || !anchorHeadBlock.element) return null;

    const anchorHeadTranslate = SvgUtils.parseTranslateTransform(
      anchorHeadBlock.element
    );
    const heldChainHeadHeight = SvgUtils.getElementBBoxHeight(draggedElement, Global.DEFAULT_BLOCK_HEIGHT);
    return StackSnapGhostLayout.calc_StackSnapGhost_ChainPrefixOnStackHead_WorldPos(
      anchorHeadTranslate.x,
      anchorHeadTranslate.y,
      heldChainHeadHeight
    );
  }

  const anchorBlock = blockRegistry.get(snap.snapUUID);
  if (!anchorBlock || !anchorBlock.element){
    return null;
  }
  return StackSnapWorldLayout.StackSnapWorldLayout.calc_BlockWorldPosition_ForSnap(
    anchorBlock,
    draggedElement,
    snap.mode
  );
}

export function pick_StackSnap_FromCandidates(candidates){
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
