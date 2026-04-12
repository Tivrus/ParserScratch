import { GhostBlock } from '../GhostBlock.js';
import { listConnectionCandidates } from './BlockConnectionCheck.js';
import { stackSnapTranslateInContainer } from './stackSnapLayout.js';

// Silhouette preview at stack snap target (see tryCommitStackConnect).
export class ConnectionGhostPreview {
  // --- Setup ---
  constructor({ dragOverlay, blockContainer }) {
    this.dragOverlay = dragOverlay;
    this.blockContainer = blockContainer;
    this.ghost = new GhostBlock();
    this.lastTargetKey = null;
    this.activeSnap = null;
  }

  // --- API ---
  getActiveSnap() {
    return this.ghost.element ? this.activeSnap : null;
  }

  sync(draggedElement, blockRegistry, grabManager) {
    if (!this.dragOverlay || !this.blockContainer) return;

    const candidates = listConnectionCandidates(draggedElement, blockRegistry, grabManager);
    const snap = this.#pickSnap(candidates);
    if (!snap) {
      this.clear();
      return;
    }

    const anchor = blockRegistry.get(snap.staticUUID);
    if (!anchor?.element) {
      this.clear();
      return;
    }

    const pos = stackSnapTranslateInContainer(anchor, draggedElement, snap.mode);
    if (!pos) {
      this.clear();
      return;
    }

    const { x: ox, y: oy } = this.#containerToOverlay(pos.x, pos.y);
    const targetKey = `${snap.staticUUID}|${snap.mode}|${Math.round(ox)}|${Math.round(oy)}`;

    if (this.lastTargetKey === targetKey && this.ghost.element) {
      this.ghost.setPosition(ox, oy);
      this.activeSnap = { staticUUID: snap.staticUUID, mode: snap.mode };
      return;
    }

    this.lastTargetKey = targetKey;
    this.ghost.createFromElement(draggedElement, ox, oy);
    if (!this.ghost.element) {
      this.clear();
      return;
    }

    this.activeSnap = { staticUUID: snap.staticUUID, mode: snap.mode };
    this.ghost.element.style.pointerEvents = 'none';
    this.ghost.attach(this.dragOverlay);
    this.dragOverlay.insertBefore(this.ghost.element, draggedElement);
  }

  clear() {
    this.lastTargetKey = null;
    this.activeSnap = null;
    this.ghost.dispose();
  }

  #containerToOverlay(x, y) {
    const c = this.blockContainer.getBoundingClientRect();
    const o = this.dragOverlay.getBoundingClientRect();
    return {
      x: x + c.left - o.left,
      y: y + c.top - o.top,
    };
  }

  #pickSnap(candidates) {
    const under = candidates.find(c => c.below);
    if (under) return { staticUUID: under.staticUUID, mode: 'below' };
    const over = candidates.find(c => c.above);
    if (over) return { staticUUID: over.staticUUID, mode: 'above' };
    return null;
  }
}
