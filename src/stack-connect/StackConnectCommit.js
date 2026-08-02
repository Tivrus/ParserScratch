import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as ZoneModule from '../blocks/ZoneModule.js';
import * as StackSnapHitTest from './stackSnapHitTest.js';
import * as StackSnapWorldLayout from './stackSnapWorldLayout.js';
import * as StackChainGraph from './stackChainGraph.js';
import * as StackChainDrag from '../blocks/StackChainDrag.js';
import * as CBlockInnerGhostPos from '../c-block/CBlockInnerGhostPos.js';
import * as ScratchCallTrace from '../infrastructure/debug/scratchCallTrace.js';
import * as MiddleChainSplit from '../calculations/MiddleChainSplitMath.js';
import * as Global from '../constants/Global.js';

function dispatch_WorkspaceStructureChanged(){
  const workspaceRootEl = document.getElementById(Global.DOM_IDS.workspace);
  if (workspaceRootEl){
    workspaceRootEl.dispatchEvent(
      new CustomEvent(Global.WORKSPACE_EVENTS.structureChanged, {
        bubbles: true,
      })
    );
  }
}

class StackConnectCommit {
  static tryCommit({
    ghostPreview,
    draggedElement,
    blockRegistry,
    grabManager,
  }){
    const snap = ghostPreview.getActiveSnap();
    if (!snap) return null;

    const draggedBlockUUID = StackSnapHitTest.resolve_DraggedBlockUUID(
      draggedElement,
      grabManager
    );
    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    if (!draggedBlock) return null;

    if (snap.mode === 'topInner' || snap.mode === 'bottomInner'){
      const cBlock = blockRegistry.get(snap.snapUUID);
      if (!cBlock || cBlock.type !== 'c-block') return null;

      if (draggedBlock.type === 'start-block') return null;

      if (!ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'top')) return null;

      if (draggedBlock.parentUUID != null) return null;

      if (snap.mode === 'bottomInner'){
        const innerHead = cBlock.innerStackHeadUUID
          ? blockRegistry.get(cBlock.innerStackHeadUUID)
          : null;
        const innerTail = innerHead
          ? StackChainGraph.find_StackTail_Block(blockRegistry, innerHead)
          : null;
        if (!innerTail || innerTail.type === 'stop-block') return null;
      }
      const insertWorldPosition = this.#commitCBlockInnerSnap(
        cBlock,
        draggedBlock,
        draggedElement,
        ghostPreview,
        blockRegistry,
        snap.mode
      );
      if (insertWorldPosition == null){
        return null;
      }
      return insertWorldPosition;
    }

    if (snap.mode === 'middle'){
      const parentBlock = blockRegistry.get(snap.parentUUID);
      const childBlock = blockRegistry.get(snap.snapUUID);
      if (!parentBlock || !childBlock) return null;
      const insertWorldPosition = this.#commitMiddleInsert(
        parentBlock,
        draggedBlock,
        childBlock,
        draggedElement,
        ghostPreview,
        blockRegistry
      );
      if (insertWorldPosition == null){
        return null;
      }
      return insertWorldPosition;
    }

    const anchorAndDragged = this.#resolveBlocks(
      draggedElement,
      snap.snapUUID,
      blockRegistry,
      grabManager
    );
    if (!anchorAndDragged) return null;

    const { dragged: draggedStackHead, anchor: anchorBlock } = anchorAndDragged;
    if (snap.mode === 'prefixOnHead'){
      const insertWorldPosition = this.#commitPrefixOnHead(
        anchorBlock,
        draggedStackHead,
        draggedElement,
        ghostPreview,
        blockRegistry
      );
      if (insertWorldPosition == null){
        return null;
      }
      return insertWorldPosition;
    }
    if (snap.mode === 'below'){
      const insertWorldPosition = this.#commitBelow(
        anchorBlock,
        draggedStackHead,
        draggedElement,
        ghostPreview,
        blockRegistry
      );
      if (insertWorldPosition == null){
        return null;
      }
      return insertWorldPosition;
    }
    if (snap.mode === 'above'){
      const insertWorldPosition = this.#commitAbove(
        anchorBlock,
        draggedStackHead,
        draggedElement,
        ghostPreview,
        blockRegistry
      );
      if (insertWorldPosition == null){
        return null;
      }
      return insertWorldPosition;
    }
    return null;
  }

  static #commitCBlockInnerSnap(
    cBlock,
    draggedStackHead,
    draggedElement,
    ghostPreview,
    blockRegistry,
    mode
  ){
    ghostPreview.clear();

    if (cBlock.innerStackHeadUUID){
      const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
      if (!innerHead || !innerHead.element){
        cBlock.innerStackHeadUUID = null;
      }
    }

    let snapWorldPosition;
    if (!cBlock.innerStackHeadUUID){
      if (mode !== 'topInner') return null;
      snapWorldPosition =
        CBlockInnerGhostPos.calc_CblockTopInnerGhost_WorldPos(cBlock);
      if (!snapWorldPosition) return null;
      cBlock.innerStackHeadUUID = draggedStackHead.blockUUID;
      draggedStackHead.parentUUID = cBlock.blockUUID;
    } else {
      const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
      if (!innerHead || !innerHead.element) return null;

      if (mode === 'topInner'){
        snapWorldPosition =
          CBlockInnerGhostPos.calc_CblockTopInnerGhost_WorldPos(cBlock);
        if (!snapWorldPosition) return null;
        const heldTail = StackChainGraph.find_StackTail_Block(
          blockRegistry,
          draggedStackHead
        );
        if (!heldTail) return null;
        heldTail.nextUUID = innerHead.blockUUID;
        innerHead.parentUUID = heldTail.blockUUID;
        cBlock.innerStackHeadUUID = draggedStackHead.blockUUID;
        draggedStackHead.parentUUID = cBlock.blockUUID;
      } else {
        const innerTail = StackChainGraph.find_StackTail_Block(
          blockRegistry,
          innerHead
        );
        if (
          !innerTail ||
          !innerTail.element ||
          innerTail.nextUUID ||
          innerTail.type === 'stop-block'
        ){
          return null;
        }
        snapWorldPosition =
          StackSnapWorldLayout.StackSnapWorldLayout.calc_BlockWorldPosition_ForSnap(
            innerTail,
            draggedElement,
            'below'
          );
        if (!snapWorldPosition) return null;
        innerTail.nextUUID = draggedStackHead.blockUUID;
        draggedStackHead.parentUUID = innerTail.blockUUID;
      }
    }

    for (const b of StackChainDrag.collect_StackChain_BlocksFromHead(
      blockRegistry,
      draggedStackHead
    )){
      b.topLevel = false;
    }
    cBlock.topLevel = cBlock.parentUUID == null;

    return snapWorldPosition;
  }

  static #resolveBlocks(
    draggedElement,
    anchorStaticUUID,
    blockRegistry,
    grabManager
  ){
    const draggedBlockUUID = StackSnapHitTest.resolve_DraggedBlockUUID(
      draggedElement,
      grabManager
    );
    if (!draggedBlockUUID) return null;
    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    const anchorBlock = blockRegistry.get(anchorStaticUUID);
    if (!draggedBlock || !anchorBlock) return null;
    return { dragged: draggedBlock, anchor: anchorBlock };
  }

  static #commitBelow(
    anchorBlock,
    draggedBlock,
    draggedElement,
    ghostPreview,
    blockRegistry
  ){
    if (anchorBlock.nextUUID || draggedBlock.parentUUID) return null;

    const snapWorldPosition =
      StackSnapWorldLayout.StackSnapWorldLayout.calc_BlockWorldPosition_ForSnap(
        anchorBlock,
        draggedElement,
        'below'
      );
    if (!snapWorldPosition) return null;

    anchorBlock.nextUUID = draggedBlock.blockUUID;
    draggedBlock.parentUUID = anchorBlock.blockUUID;
    draggedBlock.topLevel = false;
    anchorBlock.topLevel = anchorBlock.parentUUID == null;

    ghostPreview.clear();
    return snapWorldPosition;
  }

  static #commitAbove(
    anchorBlock,
    draggedBlock,
    draggedElement,
    ghostPreview,
    blockRegistry
  ){
    if (anchorBlock.parentUUID || draggedBlock.parentUUID) return null;

    let tailBlock = draggedBlock;
    while (tailBlock.nextUUID){
      const nextInChain = blockRegistry.get(tailBlock.nextUUID);
      if (!nextInChain) break;
      tailBlock = nextInChain;
    }

    const snapWorldPosition =
      StackSnapWorldLayout.StackSnapWorldLayout.calc_BlockWorldPosition_ForSnap(
        anchorBlock,
        draggedElement,
        'above'
      );
    if (!snapWorldPosition) return null;

    tailBlock.nextUUID = anchorBlock.blockUUID;
    anchorBlock.parentUUID = tailBlock.blockUUID;
    anchorBlock.topLevel = false;
    draggedBlock.topLevel = true;

    ghostPreview.clear();
    return snapWorldPosition;
  }

  static #commitPrefixOnHead(
    anchorBlock,
    draggedBlock,
    draggedElement,
    ghostPreview,
    blockRegistry
  ){
    if (anchorBlock.parentUUID || draggedBlock.parentUUID) return null;
    if (!draggedBlock.nextUUID) return null;
    if (!ZoneModule.Zone.zoneByType(anchorBlock.Zones, 'top')) return null;

    const heldChainTail = StackChainGraph.find_StackTail_Block(
      blockRegistry,
      draggedBlock
    );
    if (!heldChainTail || heldChainTail.type === 'stop-block') return null;

    const { x: anchorHeadX, y: anchorHeadY } = SvgUtils.parseTranslateTransform(
      anchorBlock.element
    );
    const snapWorldPosition = {
      x: Math.round(anchorHeadX),
      y: Math.round(anchorHeadY),
    };

    heldChainTail.nextUUID = anchorBlock.blockUUID;
    anchorBlock.parentUUID = heldChainTail.blockUUID;
    anchorBlock.topLevel = false;
    draggedBlock.topLevel = true;

    ghostPreview.clear();
    requestAnimationFrame(function(){
      dispatch_WorkspaceStructureChanged();
    });
    return snapWorldPosition;
  }

  static #commitMiddleInsert(
    parentBlock,
    draggedBlock,
    childBlock,
    draggedElement,
    ghostPreview,
    blockRegistry
  ){
    if (
      parentBlock.nextUUID !== childBlock.blockUUID ||
      childBlock.parentUUID !== parentBlock.blockUUID
    ){
      return null;
    }
    if (draggedBlock.parentUUID || draggedBlock.nextUUID) return null;

    const insertWorldPosition =
      StackSnapWorldLayout.StackSnapWorldLayout.calc_BlockWorldPosition_ForMiddleZoneInsert(
        parentBlock,
        draggedElement
      );
    if (!insertWorldPosition) return null;

    if (draggedBlock.type === 'start-block'){
      return this.#commitStartBlockMiddleChainSplit(
        parentBlock,
        draggedBlock,
        childBlock,
        insertWorldPosition,
        ghostPreview,
        blockRegistry
      );
    }
    if (draggedBlock.type === 'stop-block'){
      return this.#commitStopBlockMiddleChainSplit(
        parentBlock,
        draggedBlock,
        childBlock,
        insertWorldPosition,
        ghostPreview,
        blockRegistry
      );
    }

    parentBlock.nextUUID = draggedBlock.blockUUID;
    draggedBlock.parentUUID = parentBlock.blockUUID;
    draggedBlock.nextUUID = childBlock.blockUUID;
    childBlock.parentUUID = draggedBlock.blockUUID;
    draggedBlock.topLevel = false;
    parentBlock.topLevel = parentBlock.parentUUID == null;
    childBlock.topLevel = false;

    ghostPreview.clear();
    draggedBlock.setPosition(insertWorldPosition.x, insertWorldPosition.y);
    StackSnapWorldLayout.reposition_FollowingStackBlocks(
      draggedBlock,
      blockRegistry
    );
    return insertWorldPosition;
  }

  static #commitStartBlockMiddleChainSplit(
    parentBlock,
    draggedBlock,
    childBlock,
    insertWorldPosition,
    ghostPreview,
    blockRegistry
  ){
    ghostPreview.clear();

    const detachedHead = StackChainGraph.find_StackHead_Block(
      blockRegistry,
      parentBlock
    );
    const upperSegmentBlocks =
      StackChainGraph.collect_StackChain_FromHeadToInclusive(
        blockRegistry,
        detachedHead,
        parentBlock
      );
    const { x: splitOffsetX, y: splitOffsetY } =
      MiddleChainSplit.calc_MiddleChainSplit_StartBlock_OffsetPx();

    parentBlock.nextUUID = null;
    draggedBlock.parentUUID = null;
    draggedBlock.topLevel = true;
    draggedBlock.nextUUID = childBlock.blockUUID;
    childBlock.parentUUID = draggedBlock.blockUUID;
    childBlock.topLevel = false;
    parentBlock.topLevel = parentBlock.parentUUID == null;

    draggedBlock.setPosition(insertWorldPosition.x, insertWorldPosition.y);

    for (const blockInUpperSegment of upperSegmentBlocks){
      blockInUpperSegment.setPosition(
        Math.round(blockInUpperSegment.x + splitOffsetX),
        Math.round(blockInUpperSegment.y + splitOffsetY)
      );
    }

    StackSnapWorldLayout.reposition_FollowingStackBlocks(
      draggedBlock,
      blockRegistry
    );
    dispatch_WorkspaceStructureChanged();
    return insertWorldPosition;
  }

  static #commitStopBlockMiddleChainSplit(
    parentBlock,
    draggedBlock,
    childBlock,
    insertWorldPosition,
    ghostPreview,
    blockRegistry
  ){
    ghostPreview.clear();

    const lowerSegmentBlocks = StackChainDrag.collect_StackChain_BlocksFromHead(
      blockRegistry,
      childBlock
    );
    const { x: splitOffsetX, y: splitOffsetY } =
      MiddleChainSplit.calc_MiddleChainSplit_StopBlock_OffsetPx();

    parentBlock.nextUUID = draggedBlock.blockUUID;
    draggedBlock.parentUUID = parentBlock.blockUUID;
    draggedBlock.nextUUID = null;
    draggedBlock.topLevel = false;
    parentBlock.topLevel = parentBlock.parentUUID == null;

    childBlock.parentUUID = null;
    childBlock.topLevel = true;

    draggedBlock.setPosition(insertWorldPosition.x, insertWorldPosition.y);

    for (const blockInLowerSegment of lowerSegmentBlocks){
      blockInLowerSegment.setPosition(
        Math.round(blockInLowerSegment.x + splitOffsetX),
        Math.round(blockInLowerSegment.y + splitOffsetY)
      );
    }

    StackSnapWorldLayout.reposition_FollowingStackBlocks(
      childBlock,
      blockRegistry
    );
    dispatch_WorkspaceStructureChanged();
    return insertWorldPosition;
  }
}

export function tryCommitStackConnect(args){
  let snapSnapshot = null;
  const snapActive = args.ghostPreview.getActiveSnap();
  if (snapActive){
    snapSnapshot = {
      mode: snapActive.mode,
      snapUUID: snapActive.snapUUID,
      parentUUID: snapActive.parentUUID,
    };
  }
  const result = StackConnectCommit.tryCommit(args);
  ScratchCallTrace.scratchCallRecord('tryCommitStackConnect', {
    snap: snapSnapshot,
    ok: result != null,
  });
  return result;
}

export { reposition_FollowingStackBlocks as repositionFollowingStackBlocks } from './stackSnapWorldLayout.js';
export {
  layout_CblockInnerStack_Blocks as layoutInnerStackUnderCBlock,
  layout_AllCblockInnerStacks as layoutAllCBlockInnerStacks,
} from '../c-block/CBlockInnerStackLayout.js';
