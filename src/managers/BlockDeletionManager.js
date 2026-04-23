import { logError, SHRINK_MS, DOM_IDS } from '../constans/Global.js';
import { parseTranslateTransform } from '../utils/SvgUtils.js';
import { collectChainBlocksFromHead } from '../interactions/blocks/StackChainDrag.js';

// Axis-aligned overlap; edges touching counts. DOMRect or { left, right, top, bottom }.
function rectsIntersect(rectA, rectB) {
  if (!rectA || !rectB) {
    return false;
  }

  const widthA = rectA.width ?? rectA.right - rectA.left;
  const heightA = rectA.height ?? rectA.bottom - rectA.top;
  const widthB = rectB.width ?? rectB.right - rectB.left;
  const heightB = rectB.height ?? rectB.bottom - rectB.top;
  const eitherDegenerate = widthA <= 0 || heightA <= 0 || widthB <= 0 || heightB <= 0;
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

function shrinkBlockToCenter(element, durationMs = SHRINK_MS) {
  const bbox = element.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;
  const { x, y } = parseTranslateTransform(element);
  const startTime = performance.now();

  return new Promise((resolve) => {
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
    if (parentBlock?.nextUUID === headBlock.blockUUID) {
      parentBlock.nextUUID = null;
    }
  }

  if (tailBlock.nextUUID) {
    const nextBlock = blockRegistry.get(tailBlock.nextUUID);
    if (nextBlock?.parentUUID === tailBlock.blockUUID) {
      nextBlock.parentUUID = null;
    }
  }
}

export class BlockDeletionManager {
  constructor({
    blockRegistry,
    workspaceEl,
    trashCanId = DOM_IDS.trashCan,
    sidebarId = DOM_IDS.sidebar,
    blockWorkspaceDrag,
    grabManager,
  }) {
    this.blockRegistry = blockRegistry;
    this.workspaceEl = workspaceEl instanceof HTMLElement ? workspaceEl : null;
    this.trashEl = document.getElementById(trashCanId);
    this.sidebarEl = document.getElementById(sidebarId);
    this.blockWorkspaceDrag = blockWorkspaceDrag;
    this.grabManager = grabManager;

    if (!this.blockRegistry || !this.workspaceEl || !this.blockWorkspaceDrag) {
      logError(
        'BlockDeletionManager: blockRegistry, workspaceEl, blockWorkspaceDrag are required',
        {
          context: 'BlockDeletionManager',
        }
      );
      return;
    }

    document.addEventListener('grab-end', (event) => this.#onGrabEnd(event), true);
  }

  #onGrabEnd(event) {
    const grabDetail = event.detail;
    if (!this.grabManager?.isWorkspaceBlockGrabDetail?.(grabDetail)) {
      return;
    }

    const stackHeadBlock = this.blockRegistry.get(grabDetail.grabKey);
    if (!stackHeadBlock?.element) {
      return;
    }

    const chainBlocks = collectChainBlocksFromHead(this.blockRegistry, stackHeadBlock);
    if (chainBlocks.length === 0) {
      return;
    }

    const chainElements = chainBlocks.map((block) => block.element);
    const unionRect = unionClientRectFromElements(chainElements);
    if (!unionRect) {
      return;
    }

    const paletteRect = this.sidebarEl?.getBoundingClientRect();
    const trashRect = this.trashEl?.getBoundingClientRect();
    const overPalette = rectsIntersect(unionRect, paletteRect);
    const overTrash = rectsIntersect(unionRect, trashRect);

    if (!overPalette && !overTrash) {
      return;
    }

    this.blockWorkspaceDrag.armSkipGrabEndOnce();
    void this.#removeChain(chainBlocks);
  }

  async #removeChain(chainBlocks) {
    unlinkChainEndsFromWorkspace(chainBlocks, this.blockRegistry);

    await Promise.all(
      chainBlocks.map(async (block) => {
        const element = block.element;
        try {
          block.connectorZones = null;
          await shrinkBlockToCenter(element, SHRINK_MS);
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
