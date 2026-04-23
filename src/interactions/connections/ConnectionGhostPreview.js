import { GhostBlock } from '../GhostBlock.js';
import * as ChainMiddleZone from '../blocks/ChainMiddleZone.js';
import { BlockConnectionCheck } from './BlockConnectionCheck.js';
import { StackSnapLayout } from './stackSnapLayout.js';

// Silhouette preview at stack snap target (see tryCommitStackConnect).
export class ConnectionGhostPreview {
  #dragOverlayEl;
  #blockContainerEl;
  #ghostBlock;
  #lastTargetKey;
  #activeSnap;
  #blockRegistry;
  #spreadExcludeUUID;

  constructor({ dragOverlayEl, blockContainerEl }) {
    this.#dragOverlayEl = dragOverlayEl;
    this.#blockContainerEl = blockContainerEl;
    this.#ghostBlock = new GhostBlock();
    this.#lastTargetKey = null;
    this.#activeSnap = null;
    this.#blockRegistry = null;
    this.#spreadExcludeUUID = null;
  }

  getActiveSnap() {
    if (!this.#ghostBlock.element) {
      return null;
    }
    return this.#activeSnap;
  }

  sync(draggedElement, blockRegistry, grabManager) {
    if (!this.#dragOverlayEl || !this.#blockContainerEl) {
      return;
    }

    this.#blockRegistry = blockRegistry;
    this.#spreadExcludeUUID = BlockConnectionCheck.resolveDraggedBlockUUID(draggedElement, grabManager) || null;

    ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeUUID);
    this.#tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager);

    const candidates = BlockConnectionCheck.listConnectionCandidates(
      draggedElement,
      blockRegistry,
      grabManager
    );

    const snap = this.#pickSnap(candidates);

    if (!snap) {
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    const pos = this.#workspacePositionForSnap(snap, blockRegistry, draggedElement);
    if (!pos) {
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    if (snap.mode === 'middle') {
      const parent = blockRegistry.get(snap.parentUUID);
      const child = blockRegistry.get(snap.staticUUID);
      if (!parent?.element || !child?.element) {
        this.#cancelSnapPreview(blockRegistry);
        return;
      }
      const dy = ChainMiddleZone.ghostSpreadDeltaY(draggedElement);
      ChainMiddleZone.setChainSpreadBelow(
        blockRegistry,
        snap.staticUUID,
        dy,
        this.#spreadExcludeUUID
      );
    } else {
      ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeUUID);
    }

    const { x: ox, y: oy } = this.#containerToOverlay(pos.x, pos.y);
    const targetKey = `${snap.staticUUID}|${snap.mode}|${snap.parentUUID ?? ''}|${Math.round(ox)}|${Math.round(oy)}`;

    if (this.#lastTargetKey === targetKey && this.#ghostBlock.element) {
      this.#ghostBlock.setPosition(ox, oy);
      this.#activeSnap = this.#activeSnapPayload(snap);
      return;
    }

    this.#lastTargetKey = targetKey;
    this.#ghostBlock.createFromElement(draggedElement, ox, oy);
    if (!this.#ghostBlock.element) {
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    this.#activeSnap = this.#activeSnapPayload(snap);
    this.#ghostBlock.element.style.pointerEvents = 'none';
    this.#ghostBlock.attach(this.#dragOverlayEl);
    this.#dragOverlayEl.insertBefore(this.#ghostBlock.element, draggedElement);
  }

  clear() {
    if (this.#blockRegistry) {
      ChainMiddleZone.clearChainSpread(this.#blockRegistry, this.#spreadExcludeUUID);
    }
    this.#blockRegistry = null;
    this.#spreadExcludeUUID = null;
    this.#lastTargetKey = null;
    this.#activeSnap = null;
    this.#ghostBlock.dispose();
  }

  #cancelSnapPreview(blockRegistry) {
    ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeUUID);
    this.clear();
  }

  #activeSnapPayload(snap) {
    if (snap.mode === 'middle') {
      return {
        staticUUID: snap.staticUUID,
        mode: 'middle',
        parentUUID: snap.parentUUID,
      };
    }
    return { staticUUID: snap.staticUUID, mode: snap.mode };
  }

  #workspacePositionForSnap(snap, blockRegistry, draggedElement) {
    if (snap.mode === 'middle') {
      const parent = blockRegistry.get(snap.parentUUID);
      const child = blockRegistry.get(snap.staticUUID);
      if (!parent?.element || !child?.element) {
        return null;
      }
      return StackSnapLayout.translateMiddleInsert(parent, draggedElement);
    }
    const anchor = blockRegistry.get(snap.staticUUID);
    if (!anchor?.element) {
      return null;
    }
    return StackSnapLayout.translateInContainer(anchor, draggedElement, snap.mode);
  }

  // Before hit-test: if dragged bbox meets the narrow middle seam zone, visually spread the tail.
  #tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager) {
    const draggedUUID = BlockConnectionCheck.resolveDraggedBlockUUID(draggedElement, grabManager);
    const dragged = blockRegistry.get(draggedUUID);
    const dy = ChainMiddleZone.ghostSpreadDeltaY(draggedElement);
    if (!dragged?.element || !dy) {
      return;
    }

    const outline = dragged.element.getBoundingClientRect();

    for (const child of blockRegistry.values()) {
      if (child.blockUUID === draggedUUID || !child.parentUUID) {
        continue;
      }
      const parent = blockRegistry.get(child.parentUUID);
      if (!parent?.element || !child.element) {
        continue;
      }
      if (!BlockConnectionCheck.middleInsertEligibility(dragged, parent, child)) {
        continue;
      }

      const mid = BlockConnectionCheck.middleJointOnParent(parent, child);
      if (!mid) {
        continue;
      }

      const band = BlockConnectionCheck.middleJointBandClientRect(parent, child, mid);
      if (!band || !BlockConnectionCheck.rectsIntersectClient(outline, band)) {
        continue;
      }

      ChainMiddleZone.setChainSpreadBelow(blockRegistry, child.blockUUID, dy, this.#spreadExcludeUUID);
      return;
    }
  }

  #containerToOverlay(x, y) {
    const c = this.#blockContainerEl.getBoundingClientRect();
    const o = this.#dragOverlayEl.getBoundingClientRect();
    return {
      x: x + c.left - o.left,
      y: y + c.top - o.top,
    };
  }

  #pickSnap(candidates) {
    const joint = candidates.find(c => c.middle);
    if (joint) {
      return {
        staticUUID: joint.staticUUID,
        parentUUID: joint.parentUUID,
        mode: 'middle',
      };
    }
    const under = candidates.find(c => c.below);
    if (under) {
      return { staticUUID: under.staticUUID, mode: 'below' };
    }
    const over = candidates.find(c => c.above);
    if (over) {
      return { staticUUID: over.staticUUID, mode: 'above' };
    }
    return null;
  }
}
