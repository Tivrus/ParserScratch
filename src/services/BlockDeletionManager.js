import * as Global from '../constants/Global.js';
import * as ScratchCallTrace from '../infrastructure/debug/scratchCallTrace.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as StackChainDrag from '../blocks/StackChainDrag.js';

/** Пересечение осевых прямоугольников; касание границ считается. DOMRect или { left, right, top, bottom }. */
function rectsIntersect(rectA, rectB) {
  if (!rectA || !rectB) {
    return false;
  }

  let widthA;
  if (rectA.width != null) {
    widthA = rectA.width;
  } else {
    widthA = rectA.right - rectA.left;
  }
  let heightA;
  if (rectA.height != null) {
    heightA = rectA.height;
  } else {
    heightA = rectA.bottom - rectA.top;
  }
  let widthB;
  if (rectB.width != null) {
    widthB = rectB.width;
  } else {
    widthB = rectB.right - rectB.left;
  }
  let heightB;
  if (rectB.height != null) {
    heightB = rectB.height;
  } else {
    heightB = rectB.bottom - rectB.top;
  }
  const eitherDegenerate =
    widthA <= 0 || heightA <= 0 || widthB <= 0 || heightB <= 0;
  if (eitherDegenerate) {
    return false;
  }

  const fullyLeft = rectA.right < rectB.left;
  const fullyRight = rectA.left > rectB.right;
  const fullyAbove = rectA.bottom < rectB.top;
  const fullyBelow = rectA.top > rectB.bottom;

  const disjointX = fullyLeft || fullyRight;
  const disjointY = fullyAbove || fullyBelow;
  return !disjointX && !disjointY;
}

function unionClientRectFromElements(elements) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const element of elements) {
    if (!element) {
      continue;
    }
    const bounds = element.getBoundingClientRect();
    left = Math.min(left, bounds.left);
    top = Math.min(top, bounds.top);
    right = Math.max(right, bounds.right);
    bottom = Math.max(bottom, bounds.bottom);
  }
  if (!Number.isFinite(left)) {
    return null;
  }
  return { left, top, right, bottom };
}

function shrinkBlockToCenter(element, durationMs = Global.SHRINK_MS) {
  const bbox = element.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;
  const { x, y } = SvgUtils.parseTranslateTransform(element);
  const startTime = performance.now();

  return new Promise(resolve => {
    function frame(now) {
      const t = Math.min(1, (now - startTime) / durationMs);
      const ease = 1 - (1 - t) ** 3;
      const scale = 1 - ease;
      element.setAttribute(
        'transform',
        `translate(${x},${y}) translate(${centerX},${centerY}) scale(${scale}) translate(${-centerX},${-centerY})`
      );
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function unlinkChainEndsFromWorkspace(chainBlocks, blockRegistry) {
  if (!chainBlocks.length) {
    return;
  }
  const headBlock = chainBlocks[0];
  const tailBlock = chainBlocks[chainBlocks.length - 1];

  if (headBlock.parentUUID) {
    const parentBlock = blockRegistry.get(headBlock.parentUUID);
    if (parentBlock && parentBlock.nextUUID === headBlock.blockUUID) {
      parentBlock.nextUUID = null;
    }
    if (
      parentBlock &&
      parentBlock.type === 'c-block' &&
      parentBlock.innerStackHeadUUID === headBlock.blockUUID
    ) {
      parentBlock.innerStackHeadUUID = null;
    }
  }

  if (tailBlock.nextUUID) {
    const nextBlock = blockRegistry.get(tailBlock.nextUUID);
    if (nextBlock && nextBlock.parentUUID === tailBlock.blockUUID) {
      nextBlock.parentUUID = null;
    }
  }
}

export class BlockDeletionManager {
  constructor({
    blockRegistry,
    workspaceEl,
    trashCanId = Global.DOM_IDS.trashCan,
    sidebarId = Global.DOM_IDS.sidebar,
    blockWorkspaceDrag,
    grabManager,
  }) {
    let workspaceElement = null;
    if (workspaceEl instanceof HTMLElement) {
      workspaceElement = workspaceEl;
    }
    this.blockRegistry = blockRegistry;
    this.workspaceEl = workspaceElement;
    this.trashEl = document.getElementById(trashCanId);
    this.sidebarEl = document.getElementById(sidebarId);
    this.blockWorkspaceDrag = blockWorkspaceDrag;
    this.grabManager = grabManager;

    if (!this.blockRegistry || !this.workspaceEl || !this.blockWorkspaceDrag) {
      Global.logError(
        'BlockDeletionManager: blockRegistry, workspaceEl, blockWorkspaceDrag are required',
        {
          context: 'BlockDeletionManager',
        }
      );
      return;
    }

    document.addEventListener(
      'grab-end',
      event => this.#onGrabEnd(event),
      true
    );
  }

  #onGrabEnd(event) {
    const grabDetail = event.detail;
    if (
      !this.grabManager ||
      typeof this.grabManager.isWorkspaceBlockGrabDetail !== 'function' ||
      !this.grabManager.isWorkspaceBlockGrabDetail(grabDetail)
    ) {
      return;
    }

    const stackHeadBlock = this.blockRegistry.get(grabDetail.grabKey);
    if (!stackHeadBlock || !stackHeadBlock.element) {
      return;
    }

    const outerChain = StackChainDrag.collectChainBlocksFromHead(
      this.blockRegistry,
      stackHeadBlock
    );
    const chainBlocks = StackChainDrag.collectBlocksToRemoveIncludingInnerTrees(
      this.blockRegistry,
      stackHeadBlock
    );
    if (chainBlocks.length === 0) {
      return;
    }

    const chainElements = chainBlocks.map(block => block.element);
    const unionRect = unionClientRectFromElements(chainElements);
    if (!unionRect) {
      return;
    }

    let paletteRect = null;
    if (this.sidebarEl && typeof this.sidebarEl.getBoundingClientRect === 'function') {
      paletteRect = this.sidebarEl.getBoundingClientRect();
    }
    let trashRect = null;
    if (this.trashEl && typeof this.trashEl.getBoundingClientRect === 'function') {
      trashRect = this.trashEl.getBoundingClientRect();
    }
    const overPalette = rectsIntersect(unionRect, paletteRect);
    const overTrash = rectsIntersect(unionRect, trashRect);

    if (!overPalette && !overTrash) {
      return;
    }

    this.blockWorkspaceDrag.armSkipGrabEndOnce();
    void this.#removeChain(outerChain, chainBlocks);
  }

  async #removeChain(outerChain, chainBlocks) {
    ScratchCallTrace.scratchCallRecord('deleteWorkspaceChain', {
      headKeys: outerChain.map(b => b.blockKey),
      removedCount: chainBlocks.length,
    });
    unlinkChainEndsFromWorkspace(outerChain, this.blockRegistry);

    const deleteIds = new Set(chainBlocks.map(b => b.blockUUID));
    for (const block of chainBlocks) {
      if (block.type === 'c-block') {
        block.innerStackHeadUUID = null;
      }
    }
    for (const block of chainBlocks) {
      if (block.parentUUID && deleteIds.has(block.parentUUID)) {
        block.parentUUID = null;
      }
    }

    await Promise.all(
      chainBlocks.map(async block => {
        const element = block.element;
        try {
          block.connectorZones = null;
          await shrinkBlockToCenter(element, Global.SHRINK_MS);
        } finally {
          this.blockRegistry.delete(block.blockUUID);
          element.remove();
          this.workspaceEl.dispatchEvent(
            new CustomEvent('block-removed', {
              detail: { blockUUID: block.blockUUID, blockKey: block.blockKey },
              bubbles: true,
            })
          );
        }
      })
    );
  }
}
