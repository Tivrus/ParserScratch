import * as Global from '../../constants/Global.js';
import * as SvgUtils from '../../infrastructure/svg/SvgUtils.js';
import * as ConnectorZoneModule from '../../blocks/ConnectorZone.js';
import * as BlockConnectionCheckModule from '../hit-test/BlockConnectionCheck.js';
import * as SnapLayout from '../layout/stackSnapLayout.js';
import * as StackChainGraph from '../layout/stackChainGraph.js';
import * as StackChainDrag from '../../blocks/StackChainDrag.js';
import * as CBlockInnerGhostLayout from '../../c-block/innerGhostLayout.js';
import * as ScratchCallTrace from '../../infrastructure/debug/scratchCallTrace.js';

function dispatchWorkspaceStructureChanged() {
  const workspaceRootEl = document.getElementById(Global.DOM_IDS.workspace);
  if (workspaceRootEl) {
    workspaceRootEl.dispatchEvent(
      new CustomEvent(Global.WORKSPACE_EVENTS.structureChanged, {
        bubbles: true,
      })
    );
  }
}

/** Пересчитать мировые позиции всех блоков ниже `fromBlock` по `nextUUID`. */
export function repositionFollowingStackBlocks(fromBlock, blockRegistry) {
  let currentBlock = fromBlock;
  while (currentBlock.nextUUID) {
    const nextBlock = blockRegistry.get(currentBlock.nextUUID);
    if (!nextBlock || !nextBlock.element) break;
    const nextWorldPosition = SnapLayout.StackSnapLayout.translateInContainer(
      currentBlock,
      nextBlock.element,
      'below'
    );
    if (!nextWorldPosition) break;
    nextBlock.setPosition(nextWorldPosition.x, nextWorldPosition.y);
    currentBlock = nextBlock;
  }
}

/** Раскладка внутреннего стека от мировой позиции c-block (рекурсивно для вложенных c-block). */
export function layoutInnerStackUnderCBlock(blockRegistry, cBlock) {
  if (!cBlock || !cBlock.innerStackHeadUUID || !cBlock.element) return;
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
  if (!innerHead || !innerHead.element) return;
  const pos = CBlockInnerGhostLayout.computeTopInnerGhostWorldPosition(
    cBlock,
    innerHead.element
  );
  if (!pos) return;
  innerHead.setPosition(Math.round(pos.x), Math.round(pos.y));
  repositionFollowingStackBlocks(innerHead, blockRegistry);
  let cur = innerHead;
  const visited = new Set();
  while (cur && cur.blockUUID && !visited.has(cur.blockUUID)) {
    visited.add(cur.blockUUID);
    if (cur.type === 'c-block') {
      layoutInnerStackUnderCBlock(blockRegistry, cur);
    }
    let nextBlockInChain = null;
    if (cur.nextUUID) {
      nextBlockInChain = blockRegistry.get(cur.nextUUID);
      if (nextBlockInChain === undefined) {
        nextBlockInChain = null;
      }
    }
    cur = nextBlockInChain;
  }
}

/** Перерасчёт «рта» всех c-block на верхнеуровневых стеках (после загрузки или структурного snap). */
export function layoutAllCBlockInnerStacks(blockRegistry) {
  for (const block of blockRegistry.values()) {
    if (block.parentUUID != null) continue;
    for (const b of StackChainDrag.collectChainBlocksFromHead(
      blockRegistry,
      block
    )) {
      if (b.type === 'c-block') {
        layoutInnerStackUnderCBlock(blockRegistry, b);
      }
    }
  }
}

/** Фиксация стека: parent / next / topLevel. */
class StackConnectCommit {
  static tryCommit({
    ghostPreview,
    draggedElement,
    blockRegistry,
    grabManager,
  }) {
    const snap = ghostPreview.getActiveSnap();
    if (!snap) return null;

    const draggedBlockUUID =
      BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(
        draggedElement,
        grabManager
      );
    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    if (!draggedBlock) return null;

    if (snap.mode === 'topInner' || snap.mode === 'bottomInner') {
      const cBlock = blockRegistry.get(snap.staticUUID);
      if (!cBlock || cBlock.type !== 'c-block') return null;
      if (draggedBlock.type === 'start-block') return null;
      if (
        !ConnectorZoneModule.ConnectorZone.zoneByType(
          draggedBlock.connectorZones,
          'top'
        )
      )
        return null;
      if (draggedBlock.parentUUID != null) return null;
      if (snap.mode === 'bottomInner') {
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
      if (insertWorldPosition == null) {
        return null;
      }
      return insertWorldPosition;
    }

    if (snap.mode === 'middle') {
      const parentBlock = blockRegistry.get(snap.parentUUID);
      const childBlock = blockRegistry.get(snap.staticUUID);
      if (!parentBlock || !childBlock) return null;
      const insertWorldPosition = this.#commitMiddleInsert(
        parentBlock,
        draggedBlock,
        childBlock,
        draggedElement,
        ghostPreview,
        blockRegistry
      );
      if (insertWorldPosition == null) {
        return null;
      }
      return insertWorldPosition;
    }

    const anchorAndDragged = this.#resolveBlocks(
      draggedElement,
      snap.staticUUID,
      blockRegistry,
      grabManager
    );
    if (!anchorAndDragged) return null;

    const { dragged: draggedStackHead, anchor: anchorBlock } = anchorAndDragged;
    if (snap.mode === 'prefixOnHead') {
      const insertWorldPosition = this.#commitPrefixOnHead(
        anchorBlock,
        draggedStackHead,
        draggedElement,
        ghostPreview,
        blockRegistry
      );
      if (insertWorldPosition == null) {
        return null;
      }
      return insertWorldPosition;
    }
    if (snap.mode === 'below') {
      const insertWorldPosition = this.#commitBelow(
        anchorBlock,
        draggedStackHead,
        draggedElement,
        ghostPreview,
        blockRegistry
      );
      if (insertWorldPosition == null) {
        return null;
      }
      return insertWorldPosition;
    }
    if (snap.mode === 'above') {
      const insertWorldPosition = this.#commitAbove(
        anchorBlock,
        draggedStackHead,
        draggedElement,
        ghostPreview,
        blockRegistry
      );
      if (insertWorldPosition == null) {
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
  ) {
    ghostPreview.clear();

    if (cBlock.innerStackHeadUUID) {
      const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
      if (!innerHead || !innerHead.element) {
        cBlock.innerStackHeadUUID = null;
      }
    }

    let snapWorldPosition;
    if (!cBlock.innerStackHeadUUID) {
      if (mode !== 'topInner') return null;
      snapWorldPosition =
        CBlockInnerGhostLayout.computeTopInnerGhostWorldPosition(
          cBlock,
          draggedElement
        );
      if (!snapWorldPosition) return null;
      cBlock.innerStackHeadUUID = draggedStackHead.blockUUID;
      draggedStackHead.parentUUID = cBlock.blockUUID;
    } else {
      const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
      if (!innerHead || !innerHead.element) return null;

      if (mode === 'topInner') {
        snapWorldPosition =
          CBlockInnerGhostLayout.computeTopInnerGhostWorldPosition(
            cBlock,
            draggedElement
          );
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
        ) {
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
    )) {
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
  ) {
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
  ) {
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
  ) {
    if (anchorBlock.parentUUID || draggedBlock.parentUUID) return null;

    let tailBlock = draggedBlock;
    while (tailBlock.nextUUID) {
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
  ) {
    if (anchorBlock.parentUUID || draggedBlock.parentUUID) return null;
    if (!draggedBlock.nextUUID) return null;
    if (
      !ConnectorZoneModule.ConnectorZone.zoneByType(
        anchorBlock.connectorZones,
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
    requestAnimationFrame(() => dispatchWorkspaceStructureChanged());
    return snapWorldPosition;
  }

  static #commitMiddleInsert(
    parentBlock,
    draggedBlock,
    childBlock,
    draggedElement,
    ghostPreview,
    blockRegistry
  ) {
    if (
      parentBlock.nextUUID !== childBlock.blockUUID ||
      childBlock.parentUUID !== parentBlock.blockUUID
    ) {
      return null;
    }
    if (draggedBlock.parentUUID || draggedBlock.nextUUID) return null;

    const insertWorldPosition =
      SnapLayout.StackSnapLayout.translateMiddleInsert(
        parentBlock,
        draggedElement
      );
    if (!insertWorldPosition) return null;

    if (draggedBlock.type === 'start-block') {
      return this.#commitStartBlockMiddleChainSplit(
        parentBlock,
        draggedBlock,
        childBlock,
        insertWorldPosition,
        ghostPreview,
        blockRegistry
      );
    }
    if (draggedBlock.type === 'stop-block') {
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
    repositionFollowingStackBlocks(draggedBlock, blockRegistry);
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
  ) {
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
      Global.START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET;

    parentBlock.nextUUID = null;
    draggedBlock.parentUUID = null;
    draggedBlock.topLevel = true;
    draggedBlock.nextUUID = childBlock.blockUUID;
    childBlock.parentUUID = draggedBlock.blockUUID;
    childBlock.topLevel = false;
    parentBlock.topLevel = parentBlock.parentUUID == null;

    draggedBlock.setPosition(insertWorldPosition.x, insertWorldPosition.y);

    for (const blockInUpperSegment of upperSegmentBlocks) {
      blockInUpperSegment.setPosition(
        Math.round(blockInUpperSegment.x + splitOffsetX),
        Math.round(blockInUpperSegment.y + splitOffsetY)
      );
    }

    repositionFollowingStackBlocks(draggedBlock, blockRegistry);
    dispatchWorkspaceStructureChanged();
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
  ) {
    ghostPreview.clear();

    const lowerSegmentBlocks = [];
    let currentBlock = childBlock;
    const visitedUUIDs = new Set();
    while (currentBlock && !visitedUUIDs.has(currentBlock.blockUUID)) {
      visitedUUIDs.add(currentBlock.blockUUID);
      lowerSegmentBlocks.push(currentBlock);
      let nextBlockInChain = null;
      if (currentBlock.nextUUID) {
        const fetchedNext = blockRegistry.get(currentBlock.nextUUID);
        if (fetchedNext != null) {
          nextBlockInChain = fetchedNext;
        }
      }
      currentBlock = nextBlockInChain;
    }
    const { x: splitOffsetX, y: splitOffsetY } =
      Global.STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET;

    parentBlock.nextUUID = draggedBlock.blockUUID;
    draggedBlock.parentUUID = parentBlock.blockUUID;
    draggedBlock.nextUUID = null;
    draggedBlock.topLevel = false;
    parentBlock.topLevel = parentBlock.parentUUID == null;

    childBlock.parentUUID = null;
    childBlock.topLevel = true;

    draggedBlock.setPosition(insertWorldPosition.x, insertWorldPosition.y);

    for (const blockInLowerSegment of lowerSegmentBlocks) {
      blockInLowerSegment.setPosition(
        Math.round(blockInLowerSegment.x + splitOffsetX),
        Math.round(blockInLowerSegment.y + splitOffsetY)
      );
    }

    repositionFollowingStackBlocks(childBlock, blockRegistry);
    dispatchWorkspaceStructureChanged();
    return insertWorldPosition;
  }
}

export function tryCommitStackConnect(args) {
  let snapSnapshot = null;
  const snapActive = args.ghostPreview.getActiveSnap();
  if (snapActive) {
    snapSnapshot = {
      mode: snapActive.mode,
      staticUUID: snapActive.staticUUID,
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
