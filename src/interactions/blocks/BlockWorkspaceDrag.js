import { logError } from '../../constans/Global.js';
import { parseTranslateTransform } from '../../utils/SvgUtils.js';
import { collectChainBlocksFromHead, isWorkspaceStackHead } from './StackChainDrag.js';
import { repositionFollowingStackBlocks } from '../connections/BlockStackConnect.js';

export class BlockWorkspaceDrag {
  constructor(blockContainerEl, workspaceEl, dragOverlayEl, grabManager, options = {}) {
    this.blockContainerEl = blockContainerEl;
    this.workspaceEl = workspaceEl;
    this.dragOverlayEl = dragOverlayEl;
    this.grabManager = grabManager;
    this.blockRegistry = options.blockRegistry ?? null;
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
      if (this.dragging) {
        this.#onGrabEnd(e.detail);
      } else if (this.skipGrabEndOnce) {
        this.skipGrabEndOnce = false;
      }
    });

    document.addEventListener('grab-cancel', () => {
      if (this.dragging) this.#cancel();
    });
  }

  #onGrabStart(detail) {
    const block = this.blockRegistry?.get(detail.grabKey);
    if (!block || !isWorkspaceStackHead(block)) {
      return;
    }

    const chain = collectChainBlocksFromHead(this.blockRegistry, block);
    if (chain.length === 0) return;

    const headEl = chain[0].element;
    if (!headEl) return;

    const c = this.blockContainerEl.getBoundingClientRect();
    const o = this.dragOverlayEl.getBoundingClientRect();

    const members = chain.map((b) => {
      const el = b.element;
      const { x: origX, y: origY } = parseTranslateTransform(el);
      return {
        block: b,
        element: el,
        origX,
        origY,
        overlayStartX: origX + c.left - o.left,
        overlayStartY: origY + c.top - o.top,
      };
    });

    for (const m of members) {
      m.element.classList.add('workspace-block--dragging');
      this.dragOverlayEl.appendChild(m.element);
      m.element.setAttribute('transform', `translate(${m.overlayStartX}, ${m.overlayStartY})`);
    }

    this.dragging = {
      members,
      element: headEl,
      startClientX: detail.clientX,
      startClientY: detail.clientY,
    };
  }

  #onMove(event) {
    const { members, startClientX, startClientY } = this.dragging;
    const dx = event.clientX - startClientX;
    const dy = event.clientY - startClientY;
    for (const m of members) {
      const x = m.overlayStartX + dx;
      const y = m.overlayStartY + dy;
      m.element.setAttribute('transform', `translate(${x}, ${y})`);
    }
    this.onBlockDragMove?.(members[0].element, this.grabManager);
  }

  #onGrabEnd(detail) {
    if (this.skipGrabEndOnce) {
      for (const m of this.dragging.members) {
        m.element.classList.remove('workspace-block--dragging');
      }
      this.dragging = null;
      this.onBlockDragEnd?.();
      return;
    }

    if (!detail.moved) {
      this.#restoreOriginalPositions();
      return;
    }

    const stackPlace = this.tryCommitStackConnect?.(this.dragging, this.grabManager);
    if (stackPlace) {
      this.#finalizeStackSnap(stackPlace);
      return;
    }

    const { deltaX, deltaY } = detail;
    for (const m of this.dragging.members) {
      const x = Math.round(m.origX + deltaX);
      const y = Math.round(m.origY + deltaY);
      m.block.setPosition(x, y);
      this.blockContainerEl.appendChild(m.element);
      m.element.classList.remove('workspace-block--dragging');
      this.workspaceEl.dispatchEvent(
        new CustomEvent('block-moved', {
          detail: { blockUUID: m.block.blockUUID, x, y },
          bubbles: true,
        })
      );
    }
    this.dragging = null;
    this.onBlockDragEnd?.();
  }

  #finalizeStackSnap(stackPlace) {
    const head = this.dragging.members[0].block;
    head.setPosition(Math.round(stackPlace.x), Math.round(stackPlace.y));
    repositionFollowingStackBlocks(head, this.blockRegistry);

    for (const m of this.dragging.members) {
      this.blockContainerEl.appendChild(m.element);
      m.element.classList.remove('workspace-block--dragging');
      this.workspaceEl.dispatchEvent(
        new CustomEvent('block-moved', {
          detail: { blockUUID: m.block.blockUUID, x: m.block.x, y: m.block.y },
          bubbles: true,
        })
      );
    }
    this.dragging = null;
    this.onBlockDragEnd?.();
  }

  #cancel() {
    this.skipGrabEndOnce = false;
    this.#restoreOriginalPositions();
  }

  armSkipGrabEndOnce() {
    this.skipGrabEndOnce = true;
  }

  #restoreOriginalPositions() {
    if (!this.dragging) return;
    for (const m of this.dragging.members) {
      this.blockContainerEl.appendChild(m.element);
      m.element.setAttribute('transform', `translate(${m.origX}, ${m.origY})`);
      m.element.classList.remove('workspace-block--dragging');
    }
    this.dragging = null;
    this.onBlockDragEnd?.();
  }
}
