import * as SvgUtils from '../../infrastructure/svg/SvgUtils.js';
import * as ZoneModule from '../../blocks/ZoneModule.js';
import * as BlockConnectionCheckModule from '../hit-test/BlockConnectionCheck.js';
import * as SnapLayout from '../layout/stackSnapLayout.js';
import * as StackChainGraph from '../layout/stackChainGraph.js';
import * as StackChainDrag from '../../blocks/StackChainDrag.js';
import * as CBlockInnerGhostLayout from '../../c-block/innerGhostLayout.js';
import * as ScratchCallTrace from '../../infrastructure/debug/scratchCallTrace.js';
import * as MiddleChainSplit from '../../calculations/middleChainSplitTranslate.js';
import * as StackChainFollowLayout from '../layout/stackChainFollowLayout.js';
import * as WorkspaceStructureDispatch from './workspaceStructureDispatch.js';

class StackConnectCommit {
  static tryCommit({
    ghostPreview,
    draggedElement,
    blockRegistry,
    grabManager,
  }){
    const snap = ghostPreview.getActiveSnap();
    if (!snap) return null;

    const draggedBlockUUID =
      BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(
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
          ? StackChainGraph.stackTailBlock(blockRegistry, innerHead)
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
        CBlockInnerGhostLayout.calcTopInnerGhostWorldPosition(cBlock);
      if (!snapWorldPosition) return null;
      cBlock.innerStackHeadUUID = draggedStackHead.blockUUID;
      draggedStackHead.parentUUID = cBlock.blockUUID;
    } else {
      const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
      if (!innerHead || !innerHead.element) return null;

      if (mode === 'topInner'){
        snapWorldPosition =
          CBlockInnerGhostLayout.calcTopInnerGhostWorldPosition(cBlock);
        if (!snapWorldPosition) return null;
        const heldTail = StackChainGraph.stackTailBlock(
          blockRegistry,
          draggedStackHead
        );
        if (!heldTail) return null;
        heldTail.nextUUID = innerHead.blockUUID;
        innerHead.parentUUID = heldTail.blockUUID;
        cBlock.innerStackHeadUUID = draggedStackHead.blockUUID;
        draggedStackHead.parentUUID = cBlock.blockUUID;
      } else {
        const innerTail = StackChainGraph.stackTailBlock(
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
        snapWorldPosition = SnapLayout.StackSnapLayout.translateInContainer(
          innerTail,
          draggedElement,
          'below'
        );
        if (!snapWorldPosition) return null;
        innerTail.nextUUID = draggedStackHead.blockUUID;
        draggedStackHead.parentUUID = innerTail.blockUUID;
      }
    }

    for (const b of StackChainDrag.collectChainBlocksFromHead(
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
    const draggedBlockUUID =
      BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(
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

    const snapWorldPosition = SnapLayout.StackSnapLayout.translateInContainer(
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

    const snapWorldPosition = SnapLayout.StackSnapLayout.translateInContainer(
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

  /**
   * Те же связи, что {@link #commitAbove}: чужой стек подвешивается под хвост удерживаемого.
   * Голова удерживаемой цепочки snap к бывшим (x,y) головы другого стека.
   */
  static #commitPrefixOnHead(
    anchorBlock,
    draggedBlock,
    draggedElement,
    ghostPreview,
    blockRegistry
  ){
    if (anchorBlock.parentUUID || draggedBlock.parentUUID) return null;
    if (!draggedBlock.nextUUID) return null;
    if (
      !ZoneModule.Zone.zoneByType(
        anchorBlock.Zones,
        'top'
      )
    )
      return null;

    const heldChainTail = StackChainGraph.stackTailBlock(
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
      WorkspaceStructureDispatch.dispatchWorkspaceStructureChanged();
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
      SnapLayout.StackSnapLayout.translateMiddleInsert(
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
    StackChainFollowLayout.repositionFollowingStackBlocks(draggedBlock, blockRegistry);
    return insertWorldPosition;
  }

  /**
   * Верхняя цепочка (голова … parent) отцепляется; start становится шляпой нижней (child…).
   * Верхний сегмент сдвигается вправо/вверх.
   */
  static #commitStartBlockMiddleChainSplit(
    parentBlock,
    draggedBlock,
    childBlock,
    insertWorldPosition,
    ghostPreview,
    blockRegistry
  ){
    ghostPreview.clear();

    const detachedHead = StackChainGraph.findStackHeadBlock(
      blockRegistry,
      parentBlock
    );
    const upperSegmentBlocks = StackChainGraph.collectChainFromHeadToInclusive(
      blockRegistry,
      detachedHead,
      parentBlock
    );
    const { x: splitOffsetX, y: splitOffsetY } =
      MiddleChainSplit.getWorkspaceChainSegmentWorldOffsetPxAfterStartMiddleSplit();

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

    StackChainFollowLayout.repositionFollowingStackBlocks(draggedBlock, blockRegistry);
    WorkspaceStructureDispatch.dispatchWorkspaceStructureChanged();
    return insertWorldPosition;
  }

  /**
   * Нижняя цепочка (child … tail) отцепляется; stop остаётся под родителем; «крышка» без преемника.
   * Нижний сегмент сдвигается вправо/вниз.
   */
  static #commitStopBlockMiddleChainSplit(
    parentBlock,
    draggedBlock,
    childBlock,
    insertWorldPosition,
    ghostPreview,
    blockRegistry
  ){
    ghostPreview.clear();

    const lowerSegmentBlocks = [];
    let currentBlock = childBlock;
    const visitedUUIDs = new Set();
    while (currentBlock && !visitedUUIDs.has(currentBlock.blockUUID)){
      visitedUUIDs.add(currentBlock.blockUUID);
      lowerSegmentBlocks.push(currentBlock);
      let nextBlockInChain = null;
      if (currentBlock.nextUUID){
        const fetchedNext = blockRegistry.get(currentBlock.nextUUID);
        if (fetchedNext != null){
          nextBlockInChain = fetchedNext;
        }
      }
      currentBlock = nextBlockInChain;
    }
    const { x: splitOffsetX, y: splitOffsetY } =
      MiddleChainSplit.getWorkspaceChainSegmentWorldOffsetPxAfterStopMiddleSplit();

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

    StackChainFollowLayout.repositionFollowingStackBlocks(childBlock, blockRegistry);
    WorkspaceStructureDispatch.dispatchWorkspaceStructureChanged();
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

export { repositionFollowingStackBlocks } from '../layout/stackChainFollowLayout.js';
export {
  layoutInnerStackUnderCBlock,
  layoutAllCBlockInnerStacks,
} from '../../c-block/cBlockInnerStackWorkspaceLayout.js';
