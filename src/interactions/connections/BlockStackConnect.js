import {
  DOM_IDS,
  START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET,
  STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET,
  WORKSPACE_EVENTS,
} from '../../constans/Global.js';
import { BlockConnectionCheck } from './BlockConnectionCheck.js';
import { StackSnapLayout } from './stackSnapLayout.js';

function findStackHeadBlock(blockRegistry, block) {
  let cur = block;
  while (cur?.parentUUID) {
    const p = blockRegistry.get(cur.parentUUID);
    if (!p) break;
    cur = p;
  }
  return cur;
}

/** Ordered blocks from `head` along nextUUID until `tailInclusive` is included. */
function collectChainFromHeadToInclusive(blockRegistry, head, tailInclusive) {
  const out = [];
  let cur = head;
  while (cur) {
    out.push(cur);
    if (cur.blockUUID === tailInclusive.blockUUID) break;
    if (!cur.nextUUID) break;
    cur = blockRegistry.get(cur.nextUUID) ?? null;
  }
  return out;
}

function dispatchWorkspaceStructureChanged() {
  document.getElementById(DOM_IDS.workspace)?.dispatchEvent(
    new CustomEvent(WORKSPACE_EVENTS.structureChanged, { bubbles: true })
  );
}

/** Recompute absolute positions for every block below `fromBlock` (via nextUUID). */
export function repositionFollowingStackBlocks(fromBlock, blockRegistry) {
  let cur = fromBlock;
  while (cur.nextUUID) {
    const next = blockRegistry.get(cur.nextUUID);
    if (!next?.element) break;
    const nextPos = StackSnapLayout.translateInContainer(cur, next.element, 'below');
    if (!nextPos) break;
    next.setPosition(nextPos.x, nextPos.y);
    cur = next;
  }
}

// --- Stack commit (parent/next / topLevel) ---
class StackConnectCommit {
  static tryCommit({ ghostPreview, draggedElement, blockRegistry, grabManager }) {
    const snap = ghostPreview.getActiveSnap();
    if (!snap) return null;

    const draggedUUID = BlockConnectionCheck.resolveDraggedBlockUUID(draggedElement, grabManager);
    const dragged = blockRegistry.get(draggedUUID);
    if (!dragged) return null;

    if (snap.mode === 'middle') {
      const parent = blockRegistry.get(snap.parentUUID);
      const child = blockRegistry.get(snap.staticUUID);
      if (!parent || !child) return null;
      return (
        this.#commitMiddleInsert(
          parent,
          dragged,
          child,
          draggedElement,
          ghostPreview,
          blockRegistry
        ) ?? null
      );
    }

    const pair = this.#resolveBlocks(draggedElement, snap.staticUUID, blockRegistry, grabManager);
    if (!pair) return null;

    const { dragged: d, anchor } = pair;
    if (snap.mode === 'below') {
      return this.#commitBelow(anchor, d, draggedElement, ghostPreview, blockRegistry) ?? null;
    }
    if (snap.mode === 'above') {
      return this.#commitAbove(anchor, d, draggedElement, ghostPreview, blockRegistry) ?? null;
    }
    return null;
  }

  static #resolveBlocks(draggedElement, staticUUID, blockRegistry, grabManager) {
    const draggedUUID = BlockConnectionCheck.resolveDraggedBlockUUID(draggedElement, grabManager);
    if (!draggedUUID) return null;
    const dragged = blockRegistry.get(draggedUUID);
    const anchor = blockRegistry.get(staticUUID);
    if (!dragged || !anchor) return null;
    return { dragged, anchor };
  }

  static #commitBelow(anchor, dragged, draggedElement, ghostPreview, blockRegistry) {
    if (anchor.nextUUID || dragged.parentUUID) return null;

    const pos = StackSnapLayout.translateInContainer(anchor, draggedElement, 'below');
    if (!pos) return null;

    anchor.nextUUID = dragged.blockUUID;
    dragged.parentUUID = anchor.blockUUID;
    dragged.topLevel = false;
    anchor.topLevel = anchor.parentUUID == null;

    ghostPreview.clear();
    return pos;
  }

  static #commitAbove(anchor, dragged, draggedElement, ghostPreview, blockRegistry) {
    if (anchor.parentUUID || dragged.parentUUID) return null;

    let tail = dragged;
    while (tail.nextUUID) {
      const n = blockRegistry.get(tail.nextUUID);
      if (!n) break;
      tail = n;
    }

    const pos = StackSnapLayout.translateInContainer(anchor, draggedElement, 'above');
    if (!pos) return null;

    tail.nextUUID = anchor.blockUUID;
    anchor.parentUUID = tail.blockUUID;
    anchor.topLevel = false;
    dragged.topLevel = true;

    ghostPreview.clear();
    return pos;
  }

  static #commitMiddleInsert(parent, dragged, child, draggedElement, ghostPreview, blockRegistry) {
    if (parent.nextUUID !== child.blockUUID || child.parentUUID !== parent.blockUUID) return null;
    if (dragged.parentUUID || dragged.nextUUID) return null;

    const pos = StackSnapLayout.translateMiddleInsert(parent, draggedElement);
    if (!pos) return null;

    if (dragged.type === 'start-block') {
      return this.#commitStartBlockMiddleChainSplit(
        parent,
        dragged,
        child,
        pos,
        ghostPreview,
        blockRegistry
      );
    }
    if (dragged.type === 'stop-block') {
      return this.#commitStopBlockMiddleChainSplit(
        parent,
        dragged,
        child,
        pos,
        ghostPreview,
        blockRegistry
      );
    }

    parent.nextUUID = dragged.blockUUID;
    dragged.parentUUID = parent.blockUUID;
    dragged.nextUUID = child.blockUUID;
    child.parentUUID = dragged.blockUUID;
    dragged.topLevel = false;
    parent.topLevel = parent.parentUUID == null;
    child.topLevel = false;

    ghostPreview.clear();
    dragged.setPosition(pos.x, pos.y);
    repositionFollowingStackBlocks(dragged, blockRegistry);
    return pos;
  }

  /**
   * Upper chain (head … parent) detaches; start becomes hat of the lower chain (child…).
   * Upper segment shifts right/up.
   */
  static #commitStartBlockMiddleChainSplit(parent, dragged, child, pos, ghostPreview, blockRegistry) {
    ghostPreview.clear();

    const head = findStackHeadBlock(blockRegistry, parent);
    const upper = collectChainFromHeadToInclusive(blockRegistry, head, parent);
    const { x: ox, y: oy } = START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET;

    parent.nextUUID = null;
    dragged.parentUUID = null;
    dragged.topLevel = true;
    dragged.nextUUID = child.blockUUID;
    child.parentUUID = dragged.blockUUID;
    child.topLevel = false;
    parent.topLevel = parent.parentUUID == null;

    dragged.setPosition(pos.x, pos.y);

    for (const b of upper) {
      b.setPosition(Math.round(b.x + ox), Math.round(b.y + oy));
    }

    repositionFollowingStackBlocks(dragged, blockRegistry);
    dispatchWorkspaceStructureChanged();
    return pos;
  }

  /**
   * Lower chain (child … tail) detaches; stop stays under parent; cap has no successor.
   * Lower segment shifts right/down.
   */
  static #commitStopBlockMiddleChainSplit(parent, dragged, child, pos, ghostPreview, blockRegistry) {
    ghostPreview.clear();

    const lower = [];
    let cur = child;
    const seen = new Set();
    while (cur && !seen.has(cur.blockUUID)) {
      seen.add(cur.blockUUID);
      lower.push(cur);
      cur = cur.nextUUID ? blockRegistry.get(cur.nextUUID) ?? null : null;
    }
    const { x: ox, y: oy } = STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET;

    parent.nextUUID = dragged.blockUUID;
    dragged.parentUUID = parent.blockUUID;
    dragged.nextUUID = null;
    dragged.topLevel = false;
    parent.topLevel = parent.parentUUID == null;

    child.parentUUID = null;
    child.topLevel = true;

    dragged.setPosition(pos.x, pos.y);

    for (const b of lower) {
      b.setPosition(Math.round(b.x + ox), Math.round(b.y + oy));
    }

    repositionFollowingStackBlocks(child, blockRegistry);
    dispatchWorkspaceStructureChanged();
    return pos;
  }
}

export function tryCommitStackConnect(args) {
  return StackConnectCommit.tryCommit(args);
}
