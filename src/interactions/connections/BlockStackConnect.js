import { resolveDraggedBlockId } from './BlockConnectionCheck.js';
import {
  stackSnapTranslateInContainer,
  stackSnapTranslateMiddleInsert,
} from './stackSnapLayout.js';

// --- Stack commit (parent/next / topLevel) ---
function resolveBlocks(draggedElement, staticUUID, blockRegistry, grabManager) {
  const draggedId = resolveDraggedBlockId(draggedElement, grabManager);
  if (!draggedId) return null;
  const dragged = blockRegistry.get(draggedId);
  const anchor = blockRegistry.get(staticUUID);
  if (!dragged || !anchor) return null;
  return { dragged, anchor };
}

function commitBelow(anchor, dragged, draggedElement, ghostPreview) {
  if (anchor.nextUUID || dragged.parentUUID || dragged.nextUUID) return null;

  const pos = stackSnapTranslateInContainer(anchor, draggedElement, 'below');
  if (!pos) return null;

  anchor.nextUUID = dragged.blockUUID;
  dragged.parentUUID = anchor.blockUUID;
  dragged.topLevel = false;
  anchor.topLevel = anchor.parentUUID == null;

  ghostPreview.clear();
  return pos;
}

function commitAbove(anchor, dragged, draggedElement, ghostPreview) {
  if (anchor.parentUUID || dragged.nextUUID || dragged.parentUUID) return null;

  const pos = stackSnapTranslateInContainer(anchor, draggedElement, 'above');
  if (!pos) return null;

  dragged.nextUUID = anchor.blockUUID;
  anchor.parentUUID = dragged.blockUUID;
  anchor.topLevel = false;
  dragged.topLevel = true;

  ghostPreview.clear();
  return pos;
}

function repositionStackFrom(block, blockRegistry) {
  let cur = block;
  while (cur.nextUUID) {
    const next = blockRegistry.get(cur.nextUUID);
    if (!next?.element) break;
    const nextPos = stackSnapTranslateInContainer(cur, next.element, 'below');
    if (!nextPos) break;
    next.setPosition(nextPos.x, nextPos.y);
    cur = next;
  }
}

function commitMiddleInsert(parent, dragged, child, draggedElement, ghostPreview, blockRegistry) {
  if (parent.nextUUID !== child.blockUUID || child.parentUUID !== parent.blockUUID) return null;
  if (dragged.parentUUID || dragged.nextUUID) return null;

  const pos = stackSnapTranslateMiddleInsert(parent, draggedElement);
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
  repositionStackFrom(dragged, blockRegistry);
  return pos;
}

export function tryCommitStackConnect({ ghostPreview, draggedElement, blockRegistry, grabManager }) {
  const snap = ghostPreview.getActiveSnap();
  if (!snap) return null;

  const draggedId = resolveDraggedBlockId(draggedElement, grabManager);
  const dragged = blockRegistry.get(draggedId);
  if (!dragged) return null;

  if (snap.mode === 'middle') {
    const parent = blockRegistry.get(snap.parentUUID);
    const child = blockRegistry.get(snap.staticUUID);
    if (!parent || !child) return null;
    return (
      commitMiddleInsert(
        parent,
        dragged,
        child,
        draggedElement,
        ghostPreview,
        blockRegistry
      ) ?? null
    );
  }

  const pair = resolveBlocks(draggedElement, snap.staticUUID, blockRegistry, grabManager);
  if (!pair) return null;

  const { dragged: d, anchor } = pair;
  if (snap.mode === 'below') {
    return commitBelow(anchor, d, draggedElement, ghostPreview) ?? null;
  }
  if (snap.mode === 'above') {
    return commitAbove(anchor, d, draggedElement, ghostPreview) ?? null;
  }
  return null;
}
