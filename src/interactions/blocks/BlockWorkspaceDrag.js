export class BlockWorkspaceDrag {

  // --- Setup ---

  constructor(blockContainer, workspaceEl, grabManager) {
    this.blockContainer = blockContainer; // <svg id="block-container">
    this.workspaceEl    = workspaceEl;    // <div id="workspace">
    this.grabManager    = grabManager;

    this.dragging = null; // { element, origX, origY }

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
      `[data-block-uuid="${detail.grabKey}"]`
    );
    if (!element) return;

    const { x: origX, y: origY } = this.#parseTranslate(element);

    this.dragging = {
      element,
      origX,
      origY,
      startClientX: detail.clientX,
      startClientY: detail.clientY,
    };

    element.classList.add('workspace-block--dragging');
    // Bring to front within the SVG layer
    this.blockContainer.appendChild(element);
  }

  #onMove(event) {
    const { element, origX, origY, startClientX, startClientY } = this.dragging;
    const x = origX + (event.clientX - startClientX);
    const y = origY + (event.clientY - startClientY);
    element.setAttribute('transform', `translate(${x}, ${y})`);
  }

  #onGrabEnd(detail) {
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
    this.#applyPosition(this.dragging.origX, this.dragging.origY);
  }

  // --- Helpers ---

  #applyPosition(x, y) {
    this.dragging.element.setAttribute('transform', `translate(${x}, ${y})`);
    this.dragging.element.classList.remove('workspace-block--dragging');
    this.dragging = null;
  }

  #parseTranslate(element) {
    const match = (element.getAttribute('transform') || '').match(
      /translate\(\s*([+-]?\d*\.?\d+)[,\s]+([+-]?\d*\.?\d+)\s*\)/
    );
    return match
      ? { x: parseFloat(match[1]), y: parseFloat(match[2]) }
      : { x: 0, y: 0 };
  }
}
