import * as Grid from '../workspace/grid.js';
import * as MathUtils from '../infrastructure/math/MathUtils.js';
import * as Global from '../constants/Global.js';
import * as BlockModule from '../blocks/Block.js';
import * as ChainMiddleZone from '../blocks/ChainMiddleZone.js';
import * as BlockStackConnect from '../stack-connect/commit/BlockStackConnect.js';
import * as CBlockPathStretch from '../c-block/cBlockPathStretchPreview.js';

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
    let resolvedMountParent;
    if (
      blockMountParent instanceof SVGElement ||
      blockMountParent instanceof HTMLElement
    ) {
      resolvedMountParent = blockMountParent;
    } else {
      const fromSelector = this.#resolveElement(blockMountParent);
      if (fromSelector) {
        resolvedMountParent = fromSelector;
      } else {
        resolvedMountParent = this.containerEls.blockContainer;
      }
    }
    this.blockMountParent = resolvedMountParent;
    if (getWorkspaceGridOffset) {
      this.getWorkspaceGridOffset = getWorkspaceGridOffset;
    } else {
      this.getWorkspaceGridOffset = () => ({ x: 0, y: 0 });
    }
    // Перетаскивание с палитры: выставляется на grab-start шаблона, сбрасывается на grab-end / blur.
    this.paletteDragBlock;
    if (onPaletteDragMove != null) {
      this.onPaletteDragMove = onPaletteDragMove;
    } else {
      this.onPaletteDragMove = null;
    }
    if (onPaletteDragEnd != null) {
      this.onPaletteDragEnd = onPaletteDragEnd;
    } else {
      this.onPaletteDragEnd = null;
    }
    if (tryPaletteStackConnect != null) {
      this.tryPaletteStackConnect = tryPaletteStackConnect;
    } else {
      this.tryPaletteStackConnect = null;
    }

    if (
      !this.containerEls.blockTemplates ||
      !this.containerEls.workspace ||
      !this.containerEls.blockContainer ||
      !this.containerEls.dragOverlay
    ) {
      Global.logError('Required containers not found', {
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
      return (
        document.getElementById(selectorOrElement) ||
        document.querySelector(selectorOrElement)
      );
    }
    if (typeof selectorOrElement === 'string') {
      return (
        document.getElementById(selectorOrElement) ||
        document.querySelector(selectorOrElement)
      );
    }
    if (selectorOrElement instanceof HTMLElement) {
      return selectorOrElement;
    }
    return null;
  }

  #initListeners() {
    this.containerEls.blockTemplates.addEventListener('grab-start', e => {
      if (this.grabManager.isBlockGrabbed()) return;
      if (this.grabManager.isTemplateGrabbed() && e.detail.grabKey) {
        this.#onTemplateGrab(e.detail);
      }
    });

    document.addEventListener('grab-end', e => {
      if (this.paletteDragBlock) this.#onPaletteDragEnd(e.detail);
    });

    document.addEventListener('mousemove', e => {
      if (this.paletteDragBlock)
        this.#positionDraggedBlock(e.clientX, e.clientY);
    });

    window.addEventListener('blur', () => this.#cleanupPaletteDrag());
  }

  #onTemplateGrab(grabDetail) {
    const template = this.containerEls.blockTemplates.querySelector(
      `svg.block-template[data-block-id="${grabDetail.grabKey}"]`
    );
    if (!template) {
      Global.logError(
        `Template SVG not found for blockId: ${grabDetail.grabKey}`,
        { context: 'BlockSpawner' }
      );
      return;
    }

    const data = this.blockLogic.prepareBlockData(grabDetail.grabKey);
    if (!data) return;

    const block = new BlockModule.Block(data, {
      blockUUID: MathUtils.BlockIdentity.generateUUID(),
      x: 0,
      y: 0,
    });
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
      let stackPlace = null;
      if (typeof this.tryPaletteStackConnect === 'function') {
        stackPlace = this.tryPaletteStackConnect(block, this.grabManager);
      }
      let finalX;
      let finalY;
      if (stackPlace) {
        finalX = Math.round(stackPlace.x);
        finalY = Math.round(stackPlace.y);
      } else {
        const wr = this.containerEls.workspace.getBoundingClientRect();
        const { x: vx, y: vy } = this.getWorkspaceGridOffset();
        finalX = Math.round(
          grabDetail.clientX - wr.left - this.dragOffset.x - vx
        );
        finalY = Math.round(
          grabDetail.clientY - wr.top - this.dragOffset.y - vy
        );
        const snapped = Grid.snapWorldCoordsToGrid(finalX, finalY);
        finalX = snapped.x;
        finalY = snapped.y;
      }
      this.blockMountParent.appendChild(block.element);
      block.setPosition(finalX, finalY);
      if (stackPlace) {
        BlockStackConnect.repositionFollowingStackBlocks(
          block,
          this.blockRegistry
        );
        this.#rebuildConnectorZones();
        BlockStackConnect.layoutAllCBlockInnerStacks(this.blockRegistry);
      }

      this.#rebuildConnectorZones();
      requestAnimationFrame(() => {
        if (this.blockRegistry.get(block.blockUUID) !== block) return;
        this.#rebuildConnectorZones();
      });

      this.containerEls.workspace.dispatchEvent(
        new CustomEvent('block-spawned', {
          detail: { block, blockId: block.blockKey, x: finalX, y: finalY },
          bubbles: true,
        })
      );
    } else {
      this.#discardPaletteBlock();
    }

    if (this.onPaletteDragEnd) {
      this.onPaletteDragEnd();
    }
    this.paletteDragBlock = null;
    this.#clearTemplateDraggingClass();
  }

  /** Бросок вне полотна: убрать временный блок из реестра и DOM. */
  #discardPaletteBlock() {
    const block = this.paletteDragBlock;
    if (!block) return;
    this.blockRegistry.delete(block.blockUUID);
    block.connectorZones = null;
    block.element.remove();
  }

  #positionDraggedBlock(clientX, clientY) {
    const paletteBlock = this.paletteDragBlock;
    const el = paletteBlock && paletteBlock.element;
    if (!el) return;
    const overlayRect = this.containerEls.dragOverlay.getBoundingClientRect();
    const x = clientX - overlayRect.left - this.dragOffset.x;
    const y = clientY - overlayRect.top - this.dragOffset.y;
    el.setAttribute('transform', `translate(${x}, ${y})`);
    if (this.onPaletteDragMove) {
      this.onPaletteDragMove(paletteBlock, this.grabManager);
    }
  }

  restoreWorkspaceBlock(opcode, blockUUID, x, y) {
    const data = this.blockLogic.prepareBlockData(opcode);
    if (!data) return null;
    const block = new BlockModule.Block(data, { blockUUID, x, y });
    this.#mountRegisteredBlock(block, data);
    return block;
  }

  #mountRegisteredBlock(block, data) {
    block.mount(this.blockMountParent);
    this.blockRegistry.set(block.blockUUID, block);
    this.#rebuildConnectorZones();
  }

  /** Растяжение path c-block для внутренних стеков, зоны коннекторов и middle. */
  #rebuildConnectorZones(skipCBlockWorkspaceStretchUuid = null) {
    for (const block of this.blockRegistry.values()) {
      if (
        block.type === 'c-block' &&
        block.blockUUID !== skipCBlockWorkspaceStretchUuid
      ) {
        CBlockPathStretch.applyWorkspaceCBlockInnerStretch(
          this.blockRegistry,
          block,
          blockKey => this.blockLogic.prepareBlockData(blockKey)
        );
      }
    }
    ChainMiddleZone.applyStackChainMiddles(this.blockRegistry, b =>
      this.blockLogic.prepareBlockData(b.blockKey)
    );
  }

  /** Пересобрать зоны для всех блоков (после загрузки / ресайза). */
  refreshWorkspaceConnectorZones(skipCBlockWorkspaceStretchUuid = null) {
    this.#rebuildConnectorZones(skipCBlockWorkspaceStretchUuid);
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
    if (this.onPaletteDragEnd) {
      this.onPaletteDragEnd();
    }
    this.#clearTemplateDraggingClass();
  }
}
