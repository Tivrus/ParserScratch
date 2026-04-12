import { resolveDraggedBlockId } from './BlockConnectionCheck.js';
import { stackSnapTranslateInContainer } from './stackSnapLayout.js';

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

export function tryCommitStackConnect({ ghostPreview, draggedElement, blockRegistry, grabManager }) {
  const snap = ghostPreview.getActiveSnap();
  if (!snap) return null;

  const pair = resolveBlocks(draggedElement, snap.staticUUID, blockRegistry, grabManager);
  if (!pair) return null;

  const { dragged, anchor } = pair;
  let pos = null;

  if (snap.mode === 'below') {
    pos = commitBelow(anchor, dragged, draggedElement, ghostPreview);
  } else if (snap.mode === 'above') {
    pos = commitAbove(anchor, dragged, draggedElement, ghostPreview);
  }

  return pos ? { x: pos.x, y: pos.y } : null;
}
