import { logError } from '../../constans/Global.js';
import { parseTranslateTransform, readWorkspaceBlockUUID } from '../../utils/SvgUtils.js';

export class BlockWorkspaceDrag {
  constructor(blockContainerEl, workspaceEl, dragOverlayEl, grabManager, options = {}) {
    this.blockContainerEl = blockContainerEl;
    this.workspaceEl = workspaceEl;
    this.dragOverlayEl = dragOverlayEl;
    this.grabManager = grabManager;
    this.onBlockDragMove = options.onBlockDragMove ?? null;
    this.onBlockDragEnd = options.onBlockDragEnd ?? null;
    this.tryCommitStackConnect = options.tryCommitStackConnect ?? null;

    if (!this.dragOverlayEl) {
      logError('dragOverlayEl is required for workspace drag', { context: 'BlockWorkspaceDrag' });
      return;
    }

    this.dragging = null;
    this.skipGrabEndOnce = false;

    this.#initListeners();
  }

  #initListeners() {
    this.workspaceEl.addEventListener('grab-start', (e) => {
      if (this.grabManager.isWorkspaceBlockGrabDetail(e.detail) && e.detail.grabKey) {
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

  #onGrabStart(detail) {
    const element = this.#findWorkspaceBlockByUuid(detail.grabKey);
    if (!element) return;
    const { x: origX, y: origY } = parseTranslateTransform(element);

    const c = this.blockContainerEl.getBoundingClientRect();
    const o = this.dragOverlayEl.getBoundingClientRect();
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
    this.dragOverlayEl.appendChild(element);
    element.setAttribute('transform', `translate(${overlayStartX}, ${overlayStartY})`);
  }

  #onMove(event) {
    const { element, overlayStartX, overlayStartY, startClientX, startClientY } = this.dragging;
    const x = overlayStartX + (event.clientX - startClientX);
    const y = overlayStartY + (event.clientY - startClientY);
    element.setAttribute('transform', `translate(${x}, ${y})`);
    this.onBlockDragMove?.(element, this.grabManager);
  }

  #onGrabEnd(detail) {
    if (this.skipGrabEndOnce) {
      this.skipGrabEndOnce = false;
      this.dragging.element.classList.remove('workspace-block--dragging');
      this.dragging = null;
      this.onBlockDragEnd?.();
      return;
    }

    if (!detail.moved) {
      this.#applyPosition(this.dragging.origX, this.dragging.origY);
      return;
    }

    const stackPlace = this.tryCommitStackConnect?.(this.dragging, this.grabManager);
    if (stackPlace) {
      this.#applyPosition(Math.round(stackPlace.x), Math.round(stackPlace.y));
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

  armSkipGrabEndOnce() {
    this.skipGrabEndOnce = true;
  }

  #findWorkspaceBlockByUuid(uuid) {
    if (!uuid) return null;
    for (const g of this.blockContainerEl.querySelectorAll('.workspace-block')) {
      if (readWorkspaceBlockUUID(g) === uuid) return g;
    }
    return null;
  }

  #applyPosition(x, y) {
    const el = this.dragging.element;
    const blockUUID = readWorkspaceBlockUUID(el);
    this.blockContainerEl.appendChild(el);
    el.setAttribute('transform', `translate(${x}, ${y})`);
    el.classList.remove('workspace-block--dragging');
    this.dragging = null;
    this.onBlockDragEnd?.();

    this.workspaceEl.dispatchEvent(
      new CustomEvent('block-moved', {
        detail: { blockUUID, x, y },
        bubbles: true,
      })
    );
  }
}
