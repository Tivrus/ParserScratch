import { logError } from '../../constans/Global.js';
import { parseTranslateTransform } from '../../utils/SvgUtils.js';

export class BlockWorkspaceDrag {

  // --- Setup ---
  constructor(blockContainer, workspaceEl, dragOverlay, grabManager) {
    this.blockContainer = blockContainer;
    this.workspaceEl = workspaceEl;
    this.dragOverlay = dragOverlay;
    this.grabManager = grabManager;

    if (!this.dragOverlay) {
      logError('dragOverlay is required for workspace drag', { context: 'BlockWorkspaceDrag' });
      return;
    }

    this.dragging = null; // { element, origX, origY, overlayStartX, overlayStartY, startClientX, startClientY }
    /** When true, next grab-end is ignored (e.g. block deleted over trash / templates). */
    this.skipGrabEndOnce = false;

    this.#initListeners();
  }

  #initListeners() {
    // grab-start bubbles up from workspace container
    this.workspaceEl.addEventListener('grab-start', (e) => {
      if (e.detail.target === 'block' && e.detail.grabKey) {
        this.#onGrabStart(e.detail);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.dragging) this.#onMove(e);
    });

    document.addEventListener('grab-end', (e) => {
      if (this.dragging) this.#onGrabEnd(e.detail);
    });

    document.addEventListener('grab-cancel', () => {
      if (this.dragging) this.#cancel();
    });
  }

  // --- Drag lifecycle ---
  #onGrabStart(detail) {
    const element = this.blockContainer.querySelector(
      `[data-block-u-u-i-d="${detail.grabKey}"]`
    );
    if (!element) return;
    const { x: origX, y: origY } = parseTranslateTransform(element);

    const c = this.blockContainer.getBoundingClientRect();
    const o = this.dragOverlay.getBoundingClientRect();
    const overlayStartX = origX + c.left - o.left;
    const overlayStartY = origY + c.top - o.top;

    this.dragging = {
      element,
      origX,
      origY,
      overlayStartX,
      overlayStartY,
      startClientX: detail.clientX,
      startClientY: detail.clientY,
    };

    element.classList.add('workspace-block--dragging');
    this.dragOverlay.appendChild(element);
    element.setAttribute('transform', `translate(${overlayStartX}, ${overlayStartY})`);
  }

  #onMove(event) {
    const { element, overlayStartX, overlayStartY, startClientX, startClientY } = this.dragging;
    const x = overlayStartX + (event.clientX - startClientX);
    const y = overlayStartY + (event.clientY - startClientY);
    element.setAttribute('transform', `translate(${x}, ${y})`);
  }

  #onGrabEnd(detail) {
    if (this.skipGrabEndOnce) {
      this.skipGrabEndOnce = false;
      this.dragging.element.classList.remove('workspace-block--dragging');
      this.dragging = null;
      return;
    }

    if (!detail.moved) {
      this.#applyPosition(this.dragging.origX, this.dragging.origY);
      return;
    }

    const { origX, origY } = this.dragging;
    this.#applyPosition(
      Math.round(origX + detail.deltaX),
      Math.round(origY + detail.deltaY)
    );
  }

  #cancel() {
    this.skipGrabEndOnce = false;
    this.#applyPosition(this.dragging.origX, this.dragging.origY);
  }

  /** Call from BlockDeletionManager before bubble-phase grab-end so drag state is cleared without moving the block. */
  armSkipGrabEndOnce() {
    this.skipGrabEndOnce = true;
  }

  // --- Helpers ---
  #applyPosition(x, y) {
    const el = this.dragging.element;
    this.blockContainer.appendChild(el);
    el.setAttribute('transform', `translate(${x}, ${y})`);
    el.classList.remove('workspace-block--dragging');
    this.dragging = null;
  }

}
