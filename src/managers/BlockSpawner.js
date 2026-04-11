import { generateUUID } from '../utils/MathUtils.js';
import { logError } from '../constans/Global.js';
import { Block } from '../constans/Block.js';
import { ConnectorZone } from '../interactions/blocks/ConnectorZone.js';

export class BlockSpawner {

  constructor(blockLogic, grabManager, config = {}) {
    this.blockLogic = blockLogic;
    this.grabManager = grabManager;

    this.containers = {
      blockTemplates: this.#resolveElement(config.blockTemplatesId),
      workspace: this.#resolveElement(config.workspaceId),
      dragOverlay: this.#resolveElement(config.dragOverlayId),
      blockContainer: this.#resolveElement(config.blockContainerId),
    };

    this.blockRegistry = new Map();

    this.dragOffset = { x: 0, y: 0 };
    /** Block being dragged from the library (registered on grab-start until grab-end / blur). */
    this.paletteDragBlock;

    if (!this.containers.blockTemplates || !this.containers.workspace || !this.containers.blockContainer || !this.containers.dragOverlay) {
      logError('Required containers not found', { context: 'BlockSpawner', containers: this.containers });
      return;
    }
    this.#initListeners();
  }

  #resolveElement(selectorOrElement) {
    if (!selectorOrElement) return;
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
      if (this.paletteDragBlock) this.#onPaletteDragEnd(e.detail);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.paletteDragBlock) this.#positionDraggedBlock(e.clientX, e.clientY);
    });

    window.addEventListener('blur', () => this.#cleanupPaletteDrag());
  }

  #onTemplateGrab(grabDetail) {
    const template = this.containers.blockTemplates.querySelector(
      `svg.block-template[data-block-id="${grabDetail.grabKey}"]`
    );
    if (!template) {
      logError(`Template SVG not found for blockId: ${grabDetail.grabKey}`, { context: 'BlockSpawner' });
      return;
    }

    const data = this.blockLogic.prepareBlockData(grabDetail.grabKey);
    if (!data) return;

    const block = new Block(data, { blockUUID: generateUUID(), x: 0, y: 0 });
    this.#mountRegisteredBlock(block, data);

    this.containers.dragOverlay.appendChild(block.element);
    this.paletteDragBlock = block;

    const templateRect = template.getBoundingClientRect();
    this.dragOffset.x = grabDetail.clientX - templateRect.left;
    this.dragOffset.y = grabDetail.clientY - templateRect.top;

    this.#positionDraggedBlock(grabDetail.clientX, grabDetail.clientY);
    template.classList.add('block-template--dragging');
  }

  #onPaletteDragEnd(grabDetail) {
    const block = this.paletteDragBlock;
    if (!block) {
      this.#cleanupPaletteDrag();
      return;
    }

    if (grabDetail.endArea === 'workspace') {
      const wr = this.containers.workspace.getBoundingClientRect();
      const finalX = Math.round(grabDetail.clientX - wr.left - this.dragOffset.x);
      const finalY = Math.round(grabDetail.clientY - wr.top - this.dragOffset.y);
      this.containers.blockContainer.appendChild(block.element);
      block.setPosition(finalX, finalY);
      this.containers.workspace.dispatchEvent(new CustomEvent('block-spawned', {
        detail: { block, blockId: block.blockKey, x: finalX, y: finalY },
        bubbles: true,
      }));
    } else {
      this.#discardPaletteBlock();
    }

    this.paletteDragBlock = null;
    this.#clearTemplateDraggingClass();
  }

  /** Remove palette block from registry and DOM (cancel drag outside workspace). */
  #discardPaletteBlock() {
    const block = this.paletteDragBlock;
    if (!block) return;
    this.blockRegistry.delete(block.blockUUID);
    block.connectorZones = null;
    block.element.remove();
  }

  #positionDraggedBlock(clientX, clientY) {
    const el = this.paletteDragBlock?.element;
    if (!el) return;
    const overlayRect = this.containers.dragOverlay.getBoundingClientRect();
    const x = clientX - overlayRect.left - this.dragOffset.x;
    const y = clientY - overlayRect.top - this.dragOffset.y;
    el.setAttribute('transform', `translate(${x}, ${y})`);
  }

  restoreWorkspaceBlock(opcode, blockUUID, x, y) {
    const data = this.blockLogic.prepareBlockData(opcode);
    if (!data) return null;
    const block = new Block(data, { blockUUID, x, y });
    this.#mountRegisteredBlock(block, data);
    return block;
  }

  #mountRegisteredBlock(block, data) {
    block.mount(this.containers.blockContainer);
    block.connectorZones = ConnectorZone.buildForBlock(data, block.element);
    this.blockRegistry.set(block.blockUUID, block);
  }

  #clearTemplateDraggingClass() {
    this.containers.blockTemplates
      .querySelectorAll('.block-template--dragging')
      .forEach((el) => el.classList.remove('block-template--dragging'));
  }

  #cleanupPaletteDrag() {
    if (this.paletteDragBlock) {
      this.#discardPaletteBlock();
      this.paletteDragBlock = null;
    }
    this.#clearTemplateDraggingClass();
  }
}
