import * as GhostBlockModule from '../GhostBlock.js';
import * as ChainMiddleZone from '../blocks/ChainMiddleZone.js';
import * as StackChainDrag from '../blocks/StackChainDrag.js';
import * as BlockConnectionCheckModule from './BlockConnectionCheck.js';
import * as StackSnapPositions from './stackSnapPositions.js';
import * as StackMiddleJoint from './stackMiddleJoint.js';
import * as ConnectorClientGeometry from './connectorClientGeometry.js';

// Silhouette preview at stack snap target (see tryCommitStackConnect).
export class ConnectionGhostPreview {
  #dragOverlayEl;
  #blockContainerEl;
  #getWorkspaceGridOffset;
  #ghostBlock;
  #lastTargetKey;
  #activeSnap;
  #blockRegistry;
  /** @type {Set<string>|null} Blocks on the drag overlay (whole stack) — skip chain-spread reset for all of them. */
  #spreadExcludeIds;

  constructor({ dragOverlayEl, blockContainerEl, getWorkspaceGridOffset }) {
    this.#dragOverlayEl = dragOverlayEl;
    this.#blockContainerEl = blockContainerEl;
    this.#getWorkspaceGridOffset = getWorkspaceGridOffset ?? (() => ({ x: 0, y: 0 }));
    this.#ghostBlock = new GhostBlockModule.GhostBlock();
    this.#lastTargetKey = null;
    this.#activeSnap = null;
    this.#blockRegistry = null;
    this.#spreadExcludeIds = null;
  }

  getActiveSnap() {
    if (!this.#ghostBlock.element) {
      return null;
    }
    return this.#activeSnap;
  }

  sync(draggedElement, blockRegistry, grabManager) {
    if (!this.#dragOverlayEl || !this.#blockContainerEl) {
      return;
    }

    this.#blockRegistry = blockRegistry;
    const draggedStackHeadUUID = BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(
      draggedElement,
      grabManager
    );
    this.#spreadExcludeIds = draggedStackHeadUUID
      ? StackChainDrag.collectChainUuidSetFromHead(blockRegistry, draggedStackHeadUUID)
      : null;

    ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeIds);
    this.#tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager);

    const candidates = BlockConnectionCheckModule.BlockConnectionCheck.listConnectionCandidates(
      draggedElement,
      blockRegistry,
      grabManager
    );

    const pickedSnap = StackSnapPositions.pickStackSnapFromCandidates(candidates);

    if (!pickedSnap) {
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    const ghostWorldPosition = StackSnapPositions.workspacePositionForGhostSnap(
      pickedSnap,
      blockRegistry,
      draggedElement
    );
    if (!ghostWorldPosition) {
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    if (pickedSnap.mode === 'middle') {
      const parentBlock = blockRegistry.get(pickedSnap.parentUUID);
      const childBlock = blockRegistry.get(pickedSnap.staticUUID);
      if (!parentBlock?.element || !childBlock?.element) {
        this.#cancelSnapPreview(blockRegistry);
        return;
      }
      const chainSpreadDeltaY = ChainMiddleZone.ghostSpreadDeltaY(draggedElement);
      ChainMiddleZone.setChainSpreadBelow(
        blockRegistry,
        pickedSnap.staticUUID,
        chainSpreadDeltaY,
        this.#spreadExcludeIds
      );
    } else {
      ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeIds);
    }

    const { x: overlayX, y: overlayY } = this.#containerToOverlay(
      ghostWorldPosition.x,
      ghostWorldPosition.y
    );
    const targetKey = `${pickedSnap.staticUUID}|${pickedSnap.mode}|${pickedSnap.parentUUID ?? ''}|${Math.round(overlayX)}|${Math.round(overlayY)}`;

    if (this.#lastTargetKey === targetKey && this.#ghostBlock.element) {
      this.#ghostBlock.setPosition(overlayX, overlayY);
      this.#activeSnap = this.#activeSnapPayload(pickedSnap);
      return;
    }

    this.#lastTargetKey = targetKey;
    this.#ghostBlock.createFromElement(draggedElement, overlayX, overlayY);
    if (!this.#ghostBlock.element) {
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    this.#activeSnap = this.#activeSnapPayload(pickedSnap);
    this.#ghostBlock.element.style.pointerEvents = 'none';
    this.#ghostBlock.attach(this.#dragOverlayEl);
    this.#dragOverlayEl.insertBefore(this.#ghostBlock.element, draggedElement);
  }

  clear() {
    if (this.#blockRegistry) {
      ChainMiddleZone.clearChainSpread(this.#blockRegistry, this.#spreadExcludeIds);
    }
    this.#blockRegistry = null;
    this.#spreadExcludeIds = null;
    this.#lastTargetKey = null;
    this.#activeSnap = null;
    this.#ghostBlock.dispose();
  }

  #cancelSnapPreview(blockRegistry) {
    ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeIds);
    this.clear();
  }

  #activeSnapPayload(snap) {
    if (snap.mode === 'middle') {
      return {
        staticUUID: snap.staticUUID,
        mode: 'middle',
        parentUUID: snap.parentUUID,
      };
    }
    if (snap.mode === 'prefixOnHead') {
      return { staticUUID: snap.staticUUID, mode: 'prefixOnHead' };
    }
    return { staticUUID: snap.staticUUID, mode: snap.mode };
  }

  // Before hit-test: if dragged bbox meets the narrow middle seam zone, visually spread the tail.
  #tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager) {
    const draggedBlockUUID = BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(
      draggedElement,
      grabManager
    );
    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    const chainSpreadDeltaY = ChainMiddleZone.ghostSpreadDeltaY(draggedElement);
    if (!draggedBlock?.element || !chainSpreadDeltaY) {
      return;
    }

    const draggedClientRect = draggedBlock.element.getBoundingClientRect();

    for (const childBlock of blockRegistry.values()) {
      if (childBlock.blockUUID === draggedBlockUUID || !childBlock.parentUUID) {
        continue;
      }
      const parentBlock = blockRegistry.get(childBlock.parentUUID);
      if (!parentBlock?.element || !childBlock.element) {
        continue;
      }
      if (
        !BlockConnectionCheckModule.BlockConnectionCheck.middleInsertEligibility(
          draggedBlock,
          parentBlock,
          childBlock
        )
      ) {
        continue;
      }

      const middleZone = StackMiddleJoint.middleJointOnParent(parentBlock, childBlock);
      if (!middleZone) {
        continue;
      }

      const middleBandClientRect = StackMiddleJoint.middleJointBandClientRect(
        parentBlock,
        childBlock,
        middleZone
      );
      if (
        !middleBandClientRect ||
        !ConnectorClientGeometry.rectsIntersectClient(draggedClientRect, middleBandClientRect)
      ) {
        continue;
      }

      ChainMiddleZone.setChainSpreadBelow(
        blockRegistry,
        childBlock.blockUUID,
        chainSpreadDeltaY,
        this.#spreadExcludeIds
      );
      return;
    }
  }

  #containerToOverlay(worldX, worldY) {
    const blockContainerRect = this.#blockContainerEl.getBoundingClientRect();
    const dragOverlayRect = this.#dragOverlayEl.getBoundingClientRect();
    const { x: gridPanOffsetX, y: gridPanOffsetY } = this.#getWorkspaceGridOffset();
    return {
      x: worldX + gridPanOffsetX + blockContainerRect.left - dragOverlayRect.left,
      y: worldY + gridPanOffsetY + blockContainerRect.top - dragOverlayRect.top,
    };
  }
}
