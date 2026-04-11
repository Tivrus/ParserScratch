import { CONNECTOR_SOCKET_HEIGHT } from '../../constans/Global.js';
import { parseTranslateTransform } from '../../utils/SvgUtils.js';
import { GhostBlock } from '../GhostBlock.js';
import { listConnectionCandidates } from './BlockConnectionCheck.js';

// Ghost silhouette at the stack snap point when BlockConnectionCheck reports a candidate.

export class ConnectionGhostPreview {

  // --- Setup ---
  constructor({ dragOverlay, blockContainer }) {
    this.dragOverlay = dragOverlay;
    this.blockContainer = blockContainer;
    this.ghost = new GhostBlock();
    this.lastTargetKey = null;
  }

  // --- Snap position (block-container space, same as workspace translate) ---
  // Below: ghost group origin Y = ty + bbox bottom − CONNECTOR_SOCKET_HEIGHT (per spec).
  // Above: ghost bottom at ty + bbox top + CONNECTOR_SOCKET_HEIGHT.
  #snapPositionInContainer(staticBlock, draggedElement, mode) {
    const el = staticBlock.element;
    if (!el) return null;

    const { x: tx, y: ty } = parseTranslateTransform(el);
    let sbb;
    try {
      sbb = el.getBBox();
    } catch {
      return null;
    }

    let ghostH;
    try {
      ghostH = draggedElement.getBBox().height;
    } catch {
      return null;
    }

    if (mode === 'below') {
      const y = ty + sbb.y + sbb.height - CONNECTOR_SOCKET_HEIGHT;
      return { x: tx, y };
    }

    const y = ty + sbb.y + CONNECTOR_SOCKET_HEIGHT - ghostH - 2; // +1 to avoid overlap
    return { x: tx, y };
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

  // --- API ---
  sync(draggedElement, blockRegistry) {
    if (!this.dragOverlay || !this.blockContainer) return;

    const candidates = listConnectionCandidates(draggedElement, blockRegistry);
    const snap = this.#pickSnap(candidates);
    if (!snap) {
      this.clear();
      return;
    }

    const staticBlock = blockRegistry.get(snap.staticUUID);
    if (!staticBlock?.element) {
      this.clear();
      return;
    }

    const pos = this.#snapPositionInContainer(staticBlock, draggedElement, snap.mode);
    if (!pos) {
      this.clear();
      return;
    }

    const { x: ox, y: oy } = this.#containerToOverlay(pos.x, pos.y);
    const targetKey = `${snap.staticUUID}|${snap.mode}|${Math.round(ox)}|${Math.round(oy)}`;

    if (this.lastTargetKey === targetKey && this.ghost.element) {
      this.ghost.setPosition(ox, oy);
      return;
    }

    this.lastTargetKey = targetKey;
    this.ghost.createFromElement(draggedElement, ox, oy);
    if (!this.ghost.element) {
      this.clear();
      return;
    }

    this.ghost.element.style.pointerEvents = 'none';
    this.ghost.attach(this.dragOverlay);
    this.dragOverlay.insertBefore(this.ghost.element, draggedElement);
  }

  clear() {
    this.lastTargetKey = null;
    this.ghost.dispose();
  }
}
