import { logError, MOVE_THRESHOLD } from '../constans/Global.js';
import { readWorkspaceBlockUUID } from '../utils/SvgUtils.js';

// Pointer grab: workspace vs palette, grab-start / grab-end payloads.
export class GrabManager {
  constructor(containersConfig = {}) {
    this.state = {
      isGrabbed: false,
      area: null,
      target: null,
      element: null,
      grabKey: null,
      start: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 },
      end: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 },
    };

    this.moveThreshold = MOVE_THRESHOLD;
    this.containers = this.#resolveContainers(containersConfig);
    if (!this.containers.workspace) {
      logError('Workspace container is required', { context: 'GrabManager' });
      return;
    }

    this.#initListeners();
  }

  #resolveContainers(config) {
    const resolve = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return document.getElementById(val) || document.querySelector(val);
      if (val instanceof HTMLElement) return val;
      return null;
    };

    return {
      workspace: resolve(config.workspace),
      blockTemplates: resolve(config.blockTemplates),
    };
  }

  #initListeners() {
    Object.entries(this.containers).forEach(([areaName, container]) => {
      if (!container) return;
      container.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || this.state.isGrabbed) return;
        this.#handleGrabStart(e, areaName, container);
      });
    });

    document.addEventListener('mouseup', (e) => {
      if (this.state.isGrabbed) this.#handleGrabEnd(e);
    });

    window.addEventListener('blur', () => {
      if (this.state.isGrabbed) this.#handleGrabCancel();
    });
  }

  // --- Grab lifecycle ---
  #resolveGrabTarget(event, areaName, container) {
    if (areaName === 'workspace') {
      const block = event.target.closest('.workspace-block');
      return block
        ? { target: 'block', element: block, grabKey: readWorkspaceBlockUUID(block) }
        : { target: 'empty', element: container, grabKey: null };
    }

    if (areaName === 'blockTemplates') {
      const template = event.target.closest('.block-template');
      return template
        ? { target: 'template', element: template, grabKey: template.dataset.blockId }
        : { target: 'empty', element: container, grabKey: null };
    }

    return { target: 'empty', element: container, grabKey: null };
  }

  #handleGrabStart(event, areaName, container) {
    const { target, element, grabKey } = this.#resolveGrabTarget(event, areaName, container);

    const rect = container.getBoundingClientRect();
    this.state = {
      isGrabbed: true,
      area: areaName,
      target,
      element,
      grabKey,
      start: {
        x: Math.round(event.clientX - rect.left),
        y: Math.round(event.clientY - rect.top),
        clientX: event.clientX,
        clientY: event.clientY,
        timestamp: Date.now()
      },
      end: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 }
    };

    this.#emit(container, 'grab-start', {
      ...this.state.start,
      area: this.state.area,
      target: this.state.target,
      grabKey: this.state.grabKey,
      element: this.state.element
    });

    event.stopPropagation();
  }

  #handleGrabEnd(event) {
    const startArea = this.state.area;
    const startContainer = this.#getContainerByArea(startArea);
    if (!startContainer) return;

    // Released outside all containers → keep start area as reference
    const endArea = this.#getAreaByPoint(event.clientX, event.clientY) ?? startArea;
    const areaChanged = endArea !== startArea;
    const endContainer = areaChanged ? this.#getContainerByArea(endArea) : startContainer;

    const startRect = startContainer.getBoundingClientRect();
    const endRect = endContainer.getBoundingClientRect();

    const endX = Math.round(event.clientX - endRect.left);
    const endY = Math.round(event.clientY - endRect.top);

    this.state.end = {
      x: endX,
      y: endY,
      clientX: endX,
      clientY: endY,
      timestamp: Date.now(),
    };

    const deltaX = event.clientX - startRect.left - this.state.start.x;
    const deltaY = event.clientY - startRect.top - this.state.start.y;
    const duration = this.state.end.timestamp - this.state.start.timestamp;
    const moved = Math.abs(deltaX) > this.moveThreshold || Math.abs(deltaY) > this.moveThreshold;

    this.#emit(startContainer, 'grab-end', {
      ...this.state,
      clientX: event.clientX,
      clientY: event.clientY,
      endArea,
      areaChanged,
      deltaX,
      deltaY,
      duration,
      moved
    });

    this.state.isGrabbed = false;
  }

  #handleGrabCancel() {
    const container = this.#getContainerByArea(this.state.area);
    if (container) {
      this.#emit(container, 'grab-cancel', { ...this.state });
    }
    this.state.isGrabbed = false;
  }

  // --- Helpers ---
  #getAreaByPoint(clientX, clientY) {
    for (const [areaName, container] of Object.entries(this.containers)) {
      if (!container) continue;
      const rect = container.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom) {
        return areaName;
      }
    }
    return null;
  }

  #getContainerByArea(areaName) {
    return this.containers[areaName] ?? this.containers.workspace;
  }

  #emit(targetElement, eventName, detail) {
    targetElement.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    }));
  }

  // --- Public API ---
  isBlockGrabbed() {
    return this.state.isGrabbed && this.state.target === 'block';
  }

  isTemplateGrabbed() {
    return this.state.isGrabbed && this.state.target === 'template';
  }

  // UUID of the grabbed workspace block (overlay hit-tests).
  getWorkspaceBlockGrabKey() {
    return this.isBlockGrabbed() ? this.state.grabKey : null;
  }

  // grab-start / grab-end detail: workspace block.
  isWorkspaceBlockGrabDetail(detail) {
    return Boolean(detail?.target === 'block' && detail?.area === 'workspace');
  }
}
