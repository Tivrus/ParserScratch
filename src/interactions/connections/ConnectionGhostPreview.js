import { GhostBlock } from '../GhostBlock.js';
import {
  clearChainSpread,
  expandedMiddleZoneLocal,
  ghostSpreadDeltaY,
  setChainSpreadBelow,
} from '../blocks/ChainMiddleZone.js';
import {
  listConnectionCandidates,
  middleInsertEligibility,
  middleZoneForParent,
  rectsIntersectClient,
  resolveDraggedBlockId,
  zoneToClientRect,
} from './BlockConnectionCheck.js';
import {
  stackSnapTranslateInContainer,
  stackSnapTranslateMiddleInsert,
} from './stackSnapLayout.js';

// Silhouette preview at stack snap target (see tryCommitStackConnect).
export class ConnectionGhostPreview {
  constructor({ dragOverlay, blockContainer }) {
    this.dragOverlay = dragOverlay;
    this.blockContainer = blockContainer;
    this.ghost = new GhostBlock();
    this.lastTargetKey = null;
    this.activeSnap = null;
    this._spreadRegistry = null;
    this._spreadExcludeUUID = null;
    this._middleZoneRestore = null;
  }

  getActiveSnap() {
    return this.ghost.element ? this.activeSnap : null;
  }

  sync(draggedElement, blockRegistry, grabManager) {
    if (!this.dragOverlay || !this.blockContainer) return;

    this.#restoreMiddleZonePatch(blockRegistry);
    this._spreadRegistry = blockRegistry;
    this._spreadExcludeUUID = resolveDraggedBlockId(draggedElement, grabManager) || null;

    clearChainSpread(blockRegistry, this._spreadExcludeUUID);
    this.#tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager);

    const snap = this.#pickSnap(
      listConnectionCandidates(draggedElement, blockRegistry, grabManager)
    );

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
      const dy = ghostSpreadDeltaY(draggedElement);
      setChainSpreadBelow(blockRegistry, snap.staticUUID, dy, this._spreadExcludeUUID);
      this.#patchMiddleGeometry(parent, child, dy, 0);
    } else {
      clearChainSpread(blockRegistry, this._spreadExcludeUUID);
    }

    const { x: ox, y: oy } = this.#containerToOverlay(pos.x, pos.y);
    const targetKey = `${snap.staticUUID}|${snap.mode}|${snap.parentUUID ?? ''}|${Math.round(ox)}|${Math.round(oy)}`;

    if (this.lastTargetKey === targetKey && this.ghost.element) {
      this.ghost.setPosition(ox, oy);
      this.activeSnap = this.#activeSnapPayload(snap);
      return;
    }

    this.lastTargetKey = targetKey;
    this.ghost.createFromElement(draggedElement, ox, oy);
    if (!this.ghost.element) {
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    this.activeSnap = this.#activeSnapPayload(snap);
    this.ghost.element.style.pointerEvents = 'none';
    this.ghost.attach(this.dragOverlay);
    this.dragOverlay.insertBefore(this.ghost.element, draggedElement);
  }

  clear() {
    this.#restoreMiddleZonePatch(this._spreadRegistry);
    if (this._spreadRegistry) {
      clearChainSpread(this._spreadRegistry, this._spreadExcludeUUID);
    }
    this._spreadRegistry = null;
    this._spreadExcludeUUID = null;
    this.lastTargetKey = null;
    this.activeSnap = null;
    this.ghost.dispose();
  }

  #cancelSnapPreview(blockRegistry) {
    clearChainSpread(blockRegistry, this._spreadExcludeUUID);
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
      if (!parent?.element || !child?.element) return null;
      return stackSnapTranslateMiddleInsert(parent, draggedElement);
    }
    const anchor = blockRegistry.get(snap.staticUUID);
    if (!anchor?.element) return null;
    return stackSnapTranslateInContainer(anchor, draggedElement, snap.mode);
  }

  #restoreMiddleZonePatch(blockRegistry = null) {
    const reg = blockRegistry ?? this._spreadRegistry;
    if (!this._middleZoneRestore || !reg) {
      this._middleZoneRestore = null;
      return;
    }
    const { childUUID, prevY, prevH } = this._middleZoneRestore;
    const child = reg.get(childUUID);
    const mid = child?.connectorZones?.find(z => z.type === 'middle');
    if (mid) {
      mid.y = prevY;
      mid.height = prevH;
    }
    this._middleZoneRestore = null;
  }

  // Writes expanded middle geometry into `child.connectorZones` (snapshot for restore).
  #patchMiddleGeometry(parent, child, ghostH, childSpreadClientDy) {
    if (!ghostH || !parent?.element || !child?.element) return false;
    const mid = middleZoneForParent(child, parent.blockUUID);
    if (!mid) return false;
    const exp = expandedMiddleZoneLocal(
      parent.element,
      child.element,
      mid,
      ghostH,
      childSpreadClientDy
    );
    if (!exp) return false;
    if (
      !this._middleZoneRestore ||
      this._middleZoneRestore.childUUID !== child.blockUUID
    ) {
      this._middleZoneRestore = {
        childUUID: child.blockUUID,
        prevY: mid.y,
        prevH: mid.height,
      };
    }
    mid.y = exp.y;
    mid.height = exp.height;
    return true;
  }

  // Before hit-test: if cursor is in the thick preview band, spread tail + patch middle.
  #tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager) {
    const draggedId = resolveDraggedBlockId(draggedElement, grabManager);
    const dragged = blockRegistry.get(draggedId);
    const dy = ghostSpreadDeltaY(draggedElement);
    if (!dragged?.element || !dy) return;

    const outline = dragged.element.getBoundingClientRect();

    for (const child of blockRegistry.values()) {
      if (child.blockUUID === draggedId || !child.parentUUID) continue;
      const parent = blockRegistry.get(child.parentUUID);
      if (!parent?.element || !child.element) continue;
      if (!middleInsertEligibility(dragged, parent, child)) continue;

      const mid = middleZoneForParent(child, parent.blockUUID);
      if (!mid) continue;

      const exp = expandedMiddleZoneLocal(
        parent.element,
        child.element,
        mid,
        dy,
        dy
      );
      if (!exp) continue;
      const hit = zoneToClientRect(child.element, exp);
      if (!hit || !rectsIntersectClient(outline, hit)) continue;

      setChainSpreadBelow(blockRegistry, child.blockUUID, dy, this._spreadExcludeUUID);
      this.#patchMiddleGeometry(parent, child, dy, dy);
      break;
    }
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
    const joint = candidates.find(c => c.middle);
    if (joint) {
      return {
        staticUUID: joint.staticUUID,
        parentUUID: joint.parentUUID,
        mode: 'middle',
      };
    }
    const under = candidates.find(c => c.below);
    if (under) return { staticUUID: under.staticUUID, mode: 'below' };
    const over = candidates.find(c => c.above);
    if (over) return { staticUUID: over.staticUUID, mode: 'above' };
    return null;
  }
}
