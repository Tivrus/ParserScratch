import { generateUUID } from '../utils/MathUtils.js';
import { logError } from '../constans/Global.js';
import * as SvgUtils from '../utils/SvgUtils.js';
import { Block } from '../core/Block.js';

export class BlockSpawner {

  // --- Setup ---
  constructor(blockLogic, grabManager, config = {}) {
    this.blockLogic  = blockLogic;
    this.grabManager = grabManager;

    this.containers = {
      blockTemplates: this.#resolveElement(config.blockTemplatesId || '#block-templates'),
      workspace:      this.#resolveElement(config.workspaceId      || '#workspace'),
      blockContainer: this.#resolveElement(config.blockContainerId || '#block-container'),
      dragOverlay:    this.#resolveElement(config.dragOverlayId    || '#drag-overlay'),
    };

    this.dragPreview = null;
    this.dragBlockId = null;
    this.dragOffset  = { x: 0, y: 0 };

    if (!this.containers.blockTemplates || !this.containers.workspace || !this.containers.blockContainer || !this.containers.dragOverlay) {
      logError('Required containers not found', { context: 'BlockSpawner', containers: this.containers });
      return;
    }

    this.#initListeners();
  }

  #resolveElement(selectorOrElement) {
    if (!selectorOrElement) return null;
    if (typeof selectorOrElement === 'string') {
      return document.getElementById(selectorOrElement) || document.querySelector(selectorOrElement);
    }
    return selectorOrElement instanceof HTMLElement ? selectorOrElement : null;
  }

  #initListeners() {
    this.containers.blockTemplates.addEventListener('grab-start', (e) => {
      if (this.grabManager.isBlockGrabbed()) return;
      if (e.detail.target === 'template' && e.detail.grabKey) {
        this.#onTemplateGrab(e.detail);
      }
    });

    document.addEventListener('grab-end', (e) => {
      if (this.dragPreview && this.dragBlockId) this.#onDragEnd(e.detail);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.dragPreview && this.dragBlockId) this.#onDragMove(e);
    });

    window.addEventListener('blur', () => this.#cleanupDragPreview());
  }

  // --- Drag lifecycle ---
  #onTemplateGrab(grabDetail) {
    const template = this.containers.blockTemplates.querySelector(
      `svg.block-template[data-block-id="${grabDetail.grabKey}"]`
    );
    if (!template) {
      logError(`Template SVG not found for blockId: ${grabDetail.grabKey}`, { context: 'BlockSpawner' });
      return;
    }

    const previewGroup = this.#buildPreviewGroup(template);
    this.containers.dragOverlay.appendChild(previewGroup);

    this.dragPreview = previewGroup;
    this.dragBlockId = grabDetail.grabKey;

    const templateRect = template.getBoundingClientRect();
    this.dragOffset.x = grabDetail.clientX - templateRect.left;
    this.dragOffset.y = grabDetail.clientY - templateRect.top;

    this.#positionPreview(grabDetail.clientX, grabDetail.clientY);
    template.classList.add('block-template--dragging');
  }

  #onDragMove(event) {
    this.#positionPreview(event.clientX, event.clientY);
  }

  #onDragEnd(grabDetail) {
    if (grabDetail.endArea === 'workspace' && this.dragBlockId) {
      const finalX = grabDetail.clientX - this.containers.workspace.getBoundingClientRect().left - this.dragOffset.x;
      const finalY = grabDetail.clientY - this.containers.workspace.getBoundingClientRect().top - this.dragOffset.y;
      this.#spawnBlock(this.dragBlockId, finalX, finalY);
    }

    this.#cleanupDragPreview();
  }

  // --- Helpers ---
  #buildPreviewGroup(template) {
    const group = SvgUtils.createElement('g', { pointerEvents: 'none' });
    group.classList.add('block-drag-preview');

    Array.from(template.children).forEach(child => {
      const clone = child.cloneNode(true);
      if (clone.tagName.toLowerCase() === 'path') {
        clone.removeAttribute('filter');
        clone.removeAttribute('animation');
      }
      group.appendChild(clone);
    });

    return group;
  }

  #positionPreview(clientX, clientY) {
    if (!this.dragPreview) return;
    const overlayRect = this.containers.dragOverlay.getBoundingClientRect();
    const x = clientX - overlayRect.left - this.dragOffset.x;
    const y = clientY - overlayRect.top - this.dragOffset.y;
    this.dragPreview.setAttribute('transform', `translate(${x}, ${y})`);
  }

  #spawnBlock(blockId, x, y) {
    const data = this.blockLogic.prepareBlockData(blockId);
    if (!data) return;

    const block = new Block(data, { blockUUID: generateUUID(), x, y });
    block.mount(this.containers.blockContainer);
    this.containers.workspace.dispatchEvent(new CustomEvent('block-spawned', {
      detail: { block, blockId, x, y },
      bubbles: true
    }));
  }

  #cleanupDragPreview() {
    this.dragPreview?.remove();
    this.dragPreview = null;
    this.dragBlockId = null;

    this.containers.blockTemplates
      .querySelectorAll('.block-template--dragging')
      .forEach(el => el.classList.remove('block-template--dragging'));
  }
}
