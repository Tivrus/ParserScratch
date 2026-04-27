import * as Global from '../../constants/Global.js';
import * as SvgUtils from '../../infrastructure/svg/SvgUtils.js';
import * as ConnectorZoneModule from '../../blocks/ConnectorZone.js';
import * as BlockConnectionCheckModule from '../hit-test/BlockConnectionCheck.js';
import * as SnapLayout from '../layout/stackSnapLayout.js';
import * as StackChainGraph from '../layout/stackChainGraph.js';

function dispatchWorkspaceStructureChanged() {
  document.getElementById(Global.DOM_IDS.workspace)?.dispatchEvent(
    new CustomEvent(Global.WORKSPACE_EVENTS.structureChanged, { bubbles: true })
  );
}

/** Recompute absolute positions for every block below `fromBlock` (via `nextUUID`). */
export function repositionFollowingStackBlocks(fromBlock, blockRegistry) {
  let currentBlock = fromBlock;
  while (currentBlock.nextUUID) {
    const nextBlock = blockRegistry.get(currentBlock.nextUUID);
    if (!nextBlock?.element) break;
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

// --- Stack commit (parent/next / topLevel) ---
class StackConnectCommit {
  static tryCommit({ ghostPreview, draggedElement, blockRegistry, grabManager }) {
    const snap = ghostPreview.getActiveSnap();
    if (!snap) return null;

    const draggedBlockUUID = BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(draggedElement, grabManager);
    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    if (!draggedBlock) return null;

    if (snap.mode === 'middle') {
      const parentBlock = blockRegistry.get(snap.parentUUID);
      const childBlock = blockRegistry.get(snap.staticUUID);
      if (!parentBlock || !childBlock) return null;
      return (
        this.#commitMiddleInsert(
          parentBlock,
          draggedBlock,
          childBlock,
          draggedElement,
          ghostPreview,
          blockRegistry
        ) ?? null
      );
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
      return (
        this.#commitPrefixOnHead(
          anchorBlock,
          draggedStackHead,
          draggedElement,
          ghostPreview,
          blockRegistry
        ) ?? null
      );
    }
    if (snap.mode === 'below') {
      return (
        this.#commitBelow(anchorBlock, draggedStackHead, draggedElement, ghostPreview, blockRegistry) ??
        null
      );
    }
    if (snap.mode === 'above') {
      return (
        this.#commitAbove(anchorBlock, draggedStackHead, draggedElement, ghostPreview, blockRegistry) ??
        null
      );
    }
    return null;
  }

  static #resolveBlocks(draggedElement, anchorStaticUUID, blockRegistry, grabManager) {
    const draggedBlockUUID = BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(draggedElement, grabManager);
    if (!draggedBlockUUID) return null;
    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    const anchorBlock = blockRegistry.get(anchorStaticUUID);
    if (!draggedBlock || !anchorBlock) return null;
    return { dragged: draggedBlock, anchor: anchorBlock };
  }

  static #commitBelow(anchorBlock, draggedBlock, draggedElement, ghostPreview, blockRegistry) {
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

  static #commitAbove(anchorBlock, draggedBlock, draggedElement, ghostPreview, blockRegistry) {
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
   * Same links as {@link #commitAbove}: other stack hangs under held tail.
   * Held head snaps to the other head's former (x,y).
   */
  static #commitPrefixOnHead(anchorBlock, draggedBlock, draggedElement, ghostPreview, blockRegistry) {
    if (anchorBlock.parentUUID || draggedBlock.parentUUID) return null;
    if (!draggedBlock.nextUUID) return null;
    if (!ConnectorZoneModule.ConnectorZone.zoneByType(anchorBlock.connectorZones, 'top')) return null;

    const heldChainTail = StackChainGraph.stackTailBlock(blockRegistry, draggedBlock);
    if (!heldChainTail || heldChainTail.type === 'stop-block') return null;

    const { x: anchorHeadX, y: anchorHeadY } = SvgUtils.parseTranslateTransform(anchorBlock.element);
    const snapWorldPosition = { x: Math.round(anchorHeadX), y: Math.round(anchorHeadY) };

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

    const insertWorldPosition = SnapLayout.StackSnapLayout.translateMiddleInsert(parentBlock, draggedElement);
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
   * Upper chain (head … parent) detaches; start becomes hat of the lower chain (child…).
   * Upper segment shifts right/up.
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

    const detachedHead = StackChainGraph.findStackHeadBlock(blockRegistry, parentBlock);
    const upperSegmentBlocks = StackChainGraph.collectChainFromHeadToInclusive(
      blockRegistry,
      detachedHead,
      parentBlock
    );
    const { x: splitOffsetX, y: splitOffsetY } = Global.START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET;

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
   * Lower chain (child … tail) detaches; stop stays under parent; cap has no successor.
   * Lower segment shifts right/down.
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
      currentBlock = currentBlock.nextUUID ? blockRegistry.get(currentBlock.nextUUID) ?? null : null;
    }
    const { x: splitOffsetX, y: splitOffsetY } = Global.STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET;

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
  return StackConnectCommit.tryCommit(args);
}
