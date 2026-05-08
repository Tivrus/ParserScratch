import * as Grid from '../workspace/grid.js';
import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as StackChainDrag from '../blocks/StackChainDrag.js';
import * as BlockStackConnect from '../stack-connect/commit/BlockStackConnect.js';

export class BlockWorkspaceDrag {
  constructor(
    blockContainerEl,
    workspaceEl,
    dragOverlayEl,
    grabManager,
    options = {}
  ) {
    this.blockContainerEl = blockContainerEl;
    this.workspaceEl = workspaceEl;
    this.dragOverlayEl = dragOverlayEl;
    this.grabManager = grabManager;
    if (options.blockRegistry != null) {
      this.blockRegistry = options.blockRegistry;
    } else {
      this.blockRegistry = null;
    }
    if (options.blockMountParentEl != null) {
      this.blockMountParentEl = options.blockMountParentEl;
    } else {
      this.blockMountParentEl = blockContainerEl;
    }
    if (options.getWorkspaceGridOffset != null) {
      this.getWorkspaceGridOffset = options.getWorkspaceGridOffset;
    } else {
      this.getWorkspaceGridOffset = () => ({ x: 0, y: 0 });
    }
    if (options.onBlockDragMove != null) {
      this.onBlockDragMove = options.onBlockDragMove;
    } else {
      this.onBlockDragMove = null;
    }
    if (options.onBlockDragEnd != null) {
      this.onBlockDragEnd = options.onBlockDragEnd;
    } else {
      this.onBlockDragEnd = null;
    }
    if (options.tryCommitStackConnect != null) {
      this.tryCommitStackConnect = options.tryCommitStackConnect;
    } else {
      this.tryCommitStackConnect = null;
    }

    if (!this.dragOverlayEl) {
      Global.logError('dragOverlayEl is required for workspace drag', {
        context: 'BlockWorkspaceDrag',
      });
      return;
    }

    this.dragging = null;
    this.skipGrabEndOnce = false;

    this.#initListeners();
  }

  #initListeners() {
    this.workspaceEl.addEventListener('grab-start', event => {
      const detail = event.detail;
      if (
        this.grabManager.isWorkspaceBlockGrabDetail(detail) &&
        detail.grabKey
      ) {
        this.#onGrabStart(detail);
      }
    });

    document.addEventListener('mousemove', event => {
      if (this.dragging) {
        this.#onMove(event);
      }
    });

    document.addEventListener('grab-end', event => {
      if (this.dragging) {
        this.#onGrabEnd(event.detail);
      } else if (this.skipGrabEndOnce) {
        this.skipGrabEndOnce = false;
      }
    });

    document.addEventListener('grab-cancel', () => {
      if (this.dragging) {
        this.#cancel();
      }
    });
  }

  #onGrabStart(grabDetail) {
    let grabbedBlock = null;
    if (this.blockRegistry && typeof this.blockRegistry.get === 'function') {
      grabbedBlock = this.blockRegistry.get(grabDetail.grabKey);
    }
    if (!grabbedBlock) {
      return;
    }

    let stackHead = grabbedBlock;
    if (!StackChainDrag.isWorkspaceStackHead(grabbedBlock)) {
      const splitResult = StackChainDrag.splitWorkspaceStackAtGrabbed(
        this.blockRegistry,
        grabbedBlock
      );
      if (!splitResult) {
        return;
      }
      stackHead = splitResult.lowerHead;
      this.workspaceEl.dispatchEvent(
        new CustomEvent(Global.WORKSPACE_EVENTS.structureChanged, {
          bubbles: true,
        })
      );
    }

    const stackChain =
      StackChainDrag.collectChainBlocksFromHeadForWorkspaceDrag(
        this.blockRegistry,
        stackHead
      );
    if (stackChain.length === 0) {
      return;
    }

    const headElement = stackChain[0].element;
    if (!headElement) {
      return;
    }

    const containerRect = this.blockContainerEl.getBoundingClientRect();
    const overlayRect = this.dragOverlayEl.getBoundingClientRect();
    const { x: vx, y: vy } = this.getWorkspaceGridOffset();

    const chainMembers = stackChain.map(chainBlock => {
      const element = chainBlock.element;
      const { x: originX, y: originY } =
        SvgUtils.parseTranslateTransform(element);
      return {
        block: chainBlock,
        element,
        originX,
        originY,
        overlayOriginX: originX + containerRect.left - overlayRect.left + vx,
        overlayOriginY: originY + containerRect.top - overlayRect.top + vy,
      };
    });

    for (const member of chainMembers) {
      member.element.classList.add('workspace-block--dragging');
      this.dragOverlayEl.appendChild(member.element);
      member.element.setAttribute(
        'transform',
        `translate(${member.overlayOriginX}, ${member.overlayOriginY})`
      );
    }

    this.dragging = {
      chainMembers,
      headElement,
      startClientX: grabDetail.clientX,
      startClientY: grabDetail.clientY,
    };
  }

  #onMove(event) {
    const { chainMembers, startClientX, startClientY } = this.dragging;
    const deltaX = event.clientX - startClientX;
    const deltaY = event.clientY - startClientY;
    for (const member of chainMembers) {
      const x = member.overlayOriginX + deltaX;
      const y = member.overlayOriginY + deltaY;
      member.element.setAttribute('transform', `translate(${x}, ${y})`);
    }
    if (this.onBlockDragMove) {
      this.onBlockDragMove(chainMembers[0].element, this.grabManager);
    }
  }

  #onGrabEnd(grabDetail) {
    if (this.skipGrabEndOnce) {
      for (const member of this.dragging.chainMembers) {
        member.element.classList.remove('workspace-block--dragging');
      }
      this.dragging = null;
      if (this.onBlockDragEnd) {
        this.onBlockDragEnd();
      }
      return;
    }

    if (!grabDetail.moved) {
      this.#restoreOriginalPositions();
      return;
    }

    let snapPosition = null;
    if (typeof this.tryCommitStackConnect === 'function') {
      snapPosition = this.tryCommitStackConnect(
        this.dragging,
        this.grabManager
      );
    }
    if (snapPosition) {
      this.#finalizeStackSnap(snapPosition);
      return;
    }

    const { deltaX, deltaY } = grabDetail;
    const head = this.dragging.chainMembers[0];
    const headBaseX = Math.round(head.originX + deltaX);
    const headBaseY = Math.round(head.originY + deltaY);
    const headSnapped = Grid.snapWorldCoordsToGrid(headBaseX, headBaseY);
    const snapDx = headSnapped.x - headBaseX;
    const snapDy = headSnapped.y - headBaseY;

    for (const member of this.dragging.chainMembers) {
      const x = Math.round(member.originX + deltaX + snapDx);
      const y = Math.round(member.originY + deltaY + snapDy);
      member.block.setPosition(x, y);
      this.blockMountParentEl.appendChild(member.element);
      member.element.classList.remove('workspace-block--dragging');
      this.workspaceEl.dispatchEvent(
        new CustomEvent('block-moved', {
          detail: { blockUUID: member.block.blockUUID, x, y },
          bubbles: true,
        })
      );
    }
    this.dragging = null;
    if (this.onBlockDragEnd) {
      this.onBlockDragEnd();
    }
  }

  #finalizeStackSnap(snapPosition) {
    const stackHeadBlock = this.dragging.chainMembers[0].block;
    stackHeadBlock.setPosition(
      Math.round(snapPosition.x),
      Math.round(snapPosition.y)
    );
    BlockStackConnect.repositionFollowingStackBlocks(
      stackHeadBlock,
      this.blockRegistry
    );
    this.workspaceEl.dispatchEvent(
      new CustomEvent(Global.WORKSPACE_EVENTS.structureChanged, {
        bubbles: true,
      })
    );
    BlockStackConnect.layoutAllCBlockInnerStacks(this.blockRegistry);

    for (const member of this.dragging.chainMembers) {
      this.blockMountParentEl.appendChild(member.element);
      member.element.classList.remove('workspace-block--dragging');
      this.workspaceEl.dispatchEvent(
        new CustomEvent('block-moved', {
          detail: {
            blockUUID: member.block.blockUUID,
            x: member.block.x,
            y: member.block.y,
          },
          bubbles: true,
        })
      );
    }
    this.dragging = null;
    if (this.onBlockDragEnd) {
      this.onBlockDragEnd();
    }
  }

  #cancel() {
    this.skipGrabEndOnce = false;
    this.#restoreOriginalPositions();
  }

  armSkipGrabEndOnce() {
    this.skipGrabEndOnce = true;
  }

  #restoreOriginalPositions() {
    if (!this.dragging) {
      return;
    }
    for (const member of this.dragging.chainMembers) {
      this.blockMountParentEl.appendChild(member.element);
      member.element.setAttribute(
        'transform',
        `translate(${member.originX}, ${member.originY})`
      );
      member.element.classList.remove('workspace-block--dragging');
    }
    this.dragging = null;
    if (this.onBlockDragEnd) {
      this.onBlockDragEnd();
    }
  }
}
