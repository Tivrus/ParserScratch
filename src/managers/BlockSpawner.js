import { snapWorldCoordsToGrid } from '../background/grid.js';
import { BlockIdentity } from '../utils/MathUtils.js';
import { logError } from '../constans/Global.js';
import { Block } from '../constans/Block.js';
import * as ChainMiddleZone from '../interactions/blocks/ChainMiddleZone.js';

export class BlockSpawner {
  constructor(blockLogic, grabManager, config = {}) {
    this.blockLogic = blockLogic;
    this.grabManager = grabManager;

    const {
      blockTemplatesId,
      workspaceId,
      dragOverlayId,
      blockContainerId,
      blockMountParent,
      getWorkspaceGridOffset,
      onPaletteDragMove,
      onPaletteDragEnd,
      tryPaletteStackConnect,
    } = config;

    this.containerEls = {
      blockTemplates: this.#resolveElement(blockTemplatesId),
      workspace: this.#resolveElement(workspaceId),
      dragOverlay: this.#resolveElement(dragOverlayId),
      blockContainer: this.#resolveElement(blockContainerId),
    };

    this.blockRegistry = new Map();
    this.dragOffset = { x: 0, y: 0 };
    this.blockMountParent =
      blockMountParent instanceof SVGElement || blockMountParent instanceof HTMLElement
        ? blockMountParent
        : this.#resolveElement(blockMountParent) ?? this.containerEls.blockContainer;
    this.getWorkspaceGridOffset = getWorkspaceGridOffset ?? (() => ({ x: 0, y: 0 }));
    // Library drag: set on template grab-start, cleared on grab-end / blur.
    this.paletteDragBlock;
    // Optional hooks — same stack snap as BlockWorkspaceDrag (see app.js).
    this.onPaletteDragMove = onPaletteDragMove ?? null;
    this.onPaletteDragEnd = onPaletteDragEnd ?? null;
    this.tryPaletteStackConnect = tryPaletteStackConnect ?? null;

    if (
      !this.containerEls.blockTemplates ||
      !this.containerEls.workspace ||
      !this.containerEls.blockContainer ||
      !this.containerEls.dragOverlay
    ) {
      logError('Required containers not found', {
        context: 'BlockSpawner',
        containerEls: this.containerEls,
      });
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
    this.containerEls.blockTemplates.addEventListener('grab-start', (e) => {
      if (this.grabManager.isBlockGrabbed()) return;
      if (this.grabManager.isTemplateGrabbed() && e.detail.grabKey) {
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
    const template = this.containerEls.blockTemplates.querySelector(
      `svg.block-template[data-block-id="${grabDetail.grabKey}"]`
    );
    if (!template) {
      logError(`Template SVG not found for blockId: ${grabDetail.grabKey}`, { context: 'BlockSpawner' });
      return;
    }

    const data = this.blockLogic.prepareBlockData(grabDetail.grabKey);
    if (!data) return;

    const block = new Block(data, { blockUUID: BlockIdentity.generateUUID(), x: 0, y: 0 });
    this.#mountRegisteredBlock(block, data);

    this.containerEls.dragOverlay.appendChild(block.element);
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
      const stackPlace = this.tryPaletteStackConnect?.(block, this.grabManager);
      let finalX;
      let finalY;
      if (stackPlace) {
        finalX = Math.round(stackPlace.x);
        finalY = Math.round(stackPlace.y);
      } else {
        const wr = this.containerEls.workspace.getBoundingClientRect();
        const { x: vx, y: vy } = this.getWorkspaceGridOffset();
        finalX = Math.round(grabDetail.clientX - wr.left - this.dragOffset.x - vx);
        finalY = Math.round(grabDetail.clientY - wr.top - this.dragOffset.y - vy);
        const snapped = snapWorldCoordsToGrid(finalX, finalY);
        finalX = snapped.x;
        finalY = snapped.y;
      }
      this.blockMountParent.appendChild(block.element);
      block.setPosition(finalX, finalY);

      this.#rebuildConnectorZones();
      requestAnimationFrame(() => {
        if (this.blockRegistry.get(block.blockUUID) !== block) return;
        this.#rebuildConnectorZones();
      });

      this.containerEls.workspace.dispatchEvent(new CustomEvent('block-spawned', {
        detail: { block, blockId: block.blockKey, x: finalX, y: finalY },
        bubbles: true,
      }));
    } else {
      this.#discardPaletteBlock();
    }

    this.onPaletteDragEnd?.();
    this.paletteDragBlock = null;
    this.#clearTemplateDraggingClass();
  }

  // Drop outside workspace: remove transient block from registry + DOM.
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
    const overlayRect = this.containerEls.dragOverlay.getBoundingClientRect();
    const x = clientX - overlayRect.left - this.dragOffset.x;
    const y = clientY - overlayRect.top - this.dragOffset.y;
    el.setAttribute('transform', `translate(${x}, ${y})`);
    this.onPaletteDragMove?.(this.paletteDragBlock, this.grabManager);
  }

  // --- API ---
  restoreWorkspaceBlock(opcode, blockUUID, x, y) {
    const data = this.blockLogic.prepareBlockData(opcode);
    if (!data) return null;
    const block = new Block(data, { blockUUID, x, y });
    this.#mountRegisteredBlock(block, data);
    return block;
  }

  #mountRegisteredBlock(block, data) {
    block.mount(this.blockMountParent);
    this.blockRegistry.set(block.blockUUID, block);
    this.#rebuildConnectorZones();
  }

  // Base ConnectorZone geometry + stack joints (middle replaces parent.bottom + child.top).
  #rebuildConnectorZones() {
    ChainMiddleZone.applyStackChainMiddles(this.blockRegistry, b =>
      this.blockLogic.prepareBlockData(b.blockKey)
    );
  }

  // Rebuild zones for every registered block (e.g. after hydrate / resize).
  refreshWorkspaceConnectorZones() {
    this.#rebuildConnectorZones();
  }

  #clearTemplateDraggingClass() {
    this.containerEls.blockTemplates
      .querySelectorAll('.block-template--dragging')
      .forEach(el => el.classList.remove('block-template--dragging'));
  }

  #cleanupPaletteDrag() {
    if (this.paletteDragBlock) {
      this.#discardPaletteBlock();
      this.paletteDragBlock = null;
    }
    this.onPaletteDragEnd?.();
    this.#clearTemplateDraggingClass();
  }
}
