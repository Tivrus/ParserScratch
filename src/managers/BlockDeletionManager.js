import { logError, SHRINK_MS, DOM_IDS } from '../constans/Global.js';
import { parseTranslateTransform } from '../utils/SvgUtils.js';

// Axis-aligned overlap; edges touching counts. DOMRect or { left, right, top, bottom }.
function rectsIntersect(r1, r2) {
  if (!r1 || !r2) return false;

  const w1 = r1.width ?? r1.right - r1.left;
  const h1 = r1.height ?? r1.bottom - r1.top;
  const w2 = r2.width ?? r2.right - r2.left;
  const h2 = r2.height ?? r2.bottom - r2.top;
  const eitherIsDegenerate = w1 <= 0 || h1 <= 0 || w2 <= 0 || h2 <= 0;
  if (eitherIsDegenerate) return false;

  const fullyLeftOf = r1.right < r2.left;
  const fullyRightOf = r1.left > r2.right;
  const fullyAbove = r1.bottom < r2.top;
  const fullyBelow = r1.top > r2.bottom;

  const disjointOnX = fullyLeftOf || fullyRightOf;
  const disjointOnY = fullyAbove || fullyBelow;
  return !disjointOnX && !disjointOnY;
}

// --- Shrink animation ---
function shrinkBlockToCenter(element, durationMs = SHRINK_MS) {
  const bbox = element.getBBox();
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const { x, y } = parseTranslateTransform(element);
  const t0 = performance.now();

  return new Promise((resolve) => {
    function frame(now) {
      const t = Math.min(1, (now - t0) / durationMs);
      const ease = 1 - (1 - t) ** 3;
      const scale = 1 - ease;
      element.setAttribute(
        'transform',
        `translate(${x},${y}) translate(${cx},${cy}) scale(${scale}) translate(${-cx},${-cy})`
      );
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

export class BlockDeletionManager {
  constructor({
    blockRegistry,
    workspaceEl,
    trashCanId = DOM_IDS.trashCan,
    sidebarId = DOM_IDS.sidebar,
    workspaceDrag,
    grabManager,
  }) {
    this.blockRegistry = blockRegistry;
    this.workspaceEl = workspaceEl instanceof HTMLElement ? workspaceEl : null;
    this.trashEl = document.getElementById(trashCanId);
    this.sidebarEl = document.getElementById(sidebarId);
    this.workspaceDrag = workspaceDrag;
    this.grabManager = grabManager;

    if (!this.blockRegistry || !this.workspaceEl || !this.workspaceDrag) {
      logError('BlockDeletionManager: blockRegistry, workspaceEl, workspaceDrag are required', {
        context: 'BlockDeletionManager',
      });
      return;
    }

    document.addEventListener('grab-end', (e) => this.#onGrabEnd(e), true);
  }

  #onGrabEnd(event) {
    const d = event.detail;
    if (!this.grabManager?.isWorkspaceBlockGrabDetail?.(d)) return;

    const block = this.blockRegistry.get(d.grabKey);
    if (!block?.element) return;

    const blockRect = block.element.getBoundingClientRect();
    const overPalette = rectsIntersect(blockRect, this.sidebarEl?.getBoundingClientRect());
    const overTrash = rectsIntersect(blockRect, this.trashEl?.getBoundingClientRect());

    if (!overPalette && !overTrash) return;

    this.workspaceDrag.armSkipGrabEndOnce();
    this.#removeBlock(block);
  }

  async #removeBlock(block) {
    const el = block.element;
    try {
      block.connectorZones = null;
      await shrinkBlockToCenter(el, SHRINK_MS);
    } finally {
      this.blockRegistry.delete(block.blockUUID);
      el.remove();
      this.workspaceEl.dispatchEvent(
        new CustomEvent('block-removed', {
          detail: { blockUUID: block.blockUUID, blockKey: block.blockKey },
          bubbles: true,
        })
      );
    }
  }
}
