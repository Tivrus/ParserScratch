import { BlockConnectionCheck } from './BlockConnectionCheck.js';
import { StackSnapLayout } from './stackSnapLayout.js';

// --- Stack commit (parent/next / topLevel) ---
class StackConnectCommit {
  static tryCommit({ ghostPreview, draggedElement, blockRegistry, grabManager }) {
    const snap = ghostPreview.getActiveSnap();
    if (!snap) return null;

    const draggedId = BlockConnectionCheck.resolveDraggedBlockId(draggedElement, grabManager);
    const dragged = blockRegistry.get(draggedId);
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
      return this.#commitBelow(anchor, d, draggedElement, ghostPreview) ?? null;
    }
    if (snap.mode === 'above') {
      return this.#commitAbove(anchor, d, draggedElement, ghostPreview) ?? null;
    }
    return null;
  }

  static #resolveBlocks(draggedElement, staticUUID, blockRegistry, grabManager) {
    const draggedId = BlockConnectionCheck.resolveDraggedBlockId(draggedElement, grabManager);
    if (!draggedId) return null;
    const dragged = blockRegistry.get(draggedId);
    const anchor = blockRegistry.get(staticUUID);
    if (!dragged || !anchor) return null;
    return { dragged, anchor };
  }

  static #commitBelow(anchor, dragged, draggedElement, ghostPreview) {
    if (anchor.nextUUID || dragged.parentUUID || dragged.nextUUID) return null;

    const pos = StackSnapLayout.translateInContainer(anchor, draggedElement, 'below');
    if (!pos) return null;

    anchor.nextUUID = dragged.blockUUID;
    dragged.parentUUID = anchor.blockUUID;
    dragged.topLevel = false;
    anchor.topLevel = anchor.parentUUID == null;

    ghostPreview.clear();
    return pos;
  }

  static #commitAbove(anchor, dragged, draggedElement, ghostPreview) {
    if (anchor.parentUUID || dragged.nextUUID || dragged.parentUUID) return null;

    const pos = StackSnapLayout.translateInContainer(anchor, draggedElement, 'above');
    if (!pos) return null;

    dragged.nextUUID = anchor.blockUUID;
    anchor.parentUUID = dragged.blockUUID;
    anchor.topLevel = false;
    dragged.topLevel = true;

    ghostPreview.clear();
    return pos;
  }

  static #repositionStackFrom(block, blockRegistry) {
    let cur = block;
    while (cur.nextUUID) {
      const next = blockRegistry.get(cur.nextUUID);
      if (!next?.element) break;
      const nextPos = StackSnapLayout.translateInContainer(cur, next.element, 'below');
      if (!nextPos) break;
      next.setPosition(nextPos.x, nextPos.y);
      cur = next;
    }
  }

  static #commitMiddleInsert(parent, dragged, child, draggedElement, ghostPreview, blockRegistry) {
    if (parent.nextUUID !== child.blockUUID || child.parentUUID !== parent.blockUUID) return null;
    if (dragged.parentUUID || dragged.nextUUID) return null;

    const pos = StackSnapLayout.translateMiddleInsert(parent, draggedElement);
    if (!pos) return null;

    parent.nextUUID = dragged.blockUUID;
    dragged.parentUUID = parent.blockUUID;
    dragged.nextUUID = child.blockUUID;
    child.parentUUID = dragged.blockUUID;
    dragged.topLevel = false;
    parent.topLevel = parent.parentUUID == null;
    child.topLevel = false;

    ghostPreview.clear();
    dragged.setPosition(pos.x, pos.y);
    this.#repositionStackFrom(dragged, blockRegistry);
    return pos;
  }
}

export function tryCommitStackConnect(args) {
  return StackConnectCommit.tryCommit(args);
}
