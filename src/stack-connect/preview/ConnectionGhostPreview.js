import * as GhostModule from '../../blocks/Ghost.js';
import * as ChainMiddleZone from '../../blocks/ChainMiddleZone.js';
import * as StackChainDrag from '../../blocks/StackChainDrag.js';
import * as BlockConnectionCheckModule from '../hit-test/BlockConnectionCheck.js';
import * as StackSnapPositions from '../layout/stackSnapPositions.js';
import * as StackMiddleJoint from '../hit-test/stackMiddleJoint.js';
import * as ZoneClientGeometry from '../hit-test/ZoneClientGeometry.js';
import * as CBlockInnerSnap from '../../c-block/innerSnapPriorities.js';
import * as CBlockPathStretch from '../../c-block/cBlockPathStretchPreview.js';

/** Превью силуэта в точке snap (см. tryCommitStackConnect). */
export class ConnectionGhostPreview {
  #dragOverlayEl;
  #blockContainerEl;
  #getWorkspaceGridOffset;
  #refreshZones;
  #Ghost;
  #lastTargetKey;
  #activeSnap;
  #blockRegistry;
  /** @type {Set<string>|null} UUID всей перетаскиваемой цепочки на overlay; исключаются при сбросе spread. */
  #spreadExcludeIds;
  /** @type {string|null} */
  #stretchAppliedUuid;
  /** @type {Map<string, string>} */
  #stretchBaseDByUuid;

  /**
   * @param {{
   *   dragOverlayEl?: Element | null;
   *   blockContainerEl?: Element | null;
   *   getWorkspaceGridOffset?: () => { x: number; y: number };
   *   refreshZones?: (() => void) | null;
   * }} [config]
   */
  constructor(config = {}){
    this.#dragOverlayEl = config.dragOverlayEl;
    this.#blockContainerEl = config.blockContainerEl;
    if (config.getWorkspaceGridOffset){
      this.#getWorkspaceGridOffset = config.getWorkspaceGridOffset;
    } else {
      this.#getWorkspaceGridOffset = () => ({ x: 0, y: 0 });
    }
    let refreshZonesCallback = null;
    if (typeof config.refreshZones === 'function'){
      refreshZonesCallback = config.refreshZones;
    }
    this.#refreshZones = refreshZonesCallback;
    this.#Ghost = new GhostModule.Ghost();
    this.#lastTargetKey = null;
    this.#activeSnap = null;
    this.#blockRegistry = null;
    this.#spreadExcludeIds = null;
    this.#stretchAppliedUuid = null;
    this.#stretchBaseDByUuid = new Map();
  }

  getActiveSnap(){
    if (!this.#Ghost.element){
      return null;
    }
    return this.#activeSnap;
  }

  /** UUID c-block с живым растяжением path для превью top-inner (`null`, если нет). */
  getTopInnerStretchCBlockUuid(){
    return this.#stretchAppliedUuid;
  }

  sync(draggedElement, blockRegistry, grabManager){
    if (!this.#dragOverlayEl || !this.#blockContainerEl){
      return;
    }

    this.#blockRegistry = blockRegistry;
    const draggedStackHeadUUID = BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(
        draggedElement,
        grabManager
      );
    let excludeUuidSet = null;
    if (draggedStackHeadUUID){
      excludeUuidSet = StackChainDrag.collectChainUuidSetForWorkspaceDrag(
        blockRegistry,
        draggedStackHeadUUID
      );
    }
    this.#spreadExcludeIds = excludeUuidSet;

    ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeIds);
    this.#tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager);

    const candidates =
      BlockConnectionCheckModule.BlockConnectionCheck.listConnectionCandidates(
        draggedElement,
        blockRegistry,
        grabManager
      );

    let draggedBlock = null;
    if (draggedStackHeadUUID){
      draggedBlock = blockRegistry.get(draggedStackHeadUUID);
    }
    const draggedChainEndsWithStop = Boolean(draggedBlock) && StackChainDrag.workspaceChainEndsWithStopBlock(
        blockRegistry,
        draggedBlock
      );
    const pickedSnap = CBlockInnerSnap.resolveGhostSnapWithTopInnerPriority(
      candidates,
      draggedBlock,
      draggedElement,
      blockRegistry
    );

    if (!pickedSnap){
      this.#exitTopInnerStretchIfAny();
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    if (
      (pickedSnap.mode === 'topInner' || pickedSnap.mode === 'bottomInner') &&
      draggedBlock
    ){
      this.#syncTopInnerPathStretch(
        blockRegistry.get(pickedSnap.snapUUID),
        draggedElement,
        draggedChainEndsWithStop
      );
    } else {
      this.#exitTopInnerStretchIfAny();
    }

    const ghostWorldPosition = StackSnapPositions.workspacePositionForGhostSnap(pickedSnap, blockRegistry, draggedElement);
    if (!ghostWorldPosition){
      this.#exitTopInnerStretchIfAny();
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    if (pickedSnap.mode === 'middle'){
      const parentBlock = blockRegistry.get(pickedSnap.parentUUID);
      const childBlock = blockRegistry.get(pickedSnap.snapUUID);
      if (!parentBlock || !parentBlock.element || !childBlock || !childBlock.element){
        this.#cancelSnapPreview(blockRegistry);
        return;
      }
      const chainSpreadDeltaY =
        ChainMiddleZone.ghostSpreadDeltaY(draggedElement);
      ChainMiddleZone.setChainSpreadBelow(
        blockRegistry,
        pickedSnap.snapUUID,
        chainSpreadDeltaY,
        this.#spreadExcludeIds
      );
    } else if (
      pickedSnap.mode === 'topInner' ||
      pickedSnap.mode === 'bottomInner'
    ){
      const cBlock = blockRegistry.get(pickedSnap.snapUUID);
      if (!cBlock){
        ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeIds);
      } else if (
        pickedSnap.mode === 'topInner' &&
        cBlock.innerStackHeadUUID
      ){
        const innerSpreadY =
          CBlockPathStretch.cBlockTopInnerPrependInnerStackSpreadY(
            draggedElement,
            draggedChainEndsWithStop
          );
        if (innerSpreadY > 0){
          ChainMiddleZone.setCBlockInnerStackPreviewSpread(
            blockRegistry,
            cBlock,
            innerSpreadY,
            this.#spreadExcludeIds
          );
        } else {
          ChainMiddleZone.clearChainSpread(
            blockRegistry,
            this.#spreadExcludeIds
          );
        }
      } else if (pickedSnap.mode === 'bottomInner'){
        const chainSpreadDeltaY =
          CBlockPathStretch.cBlockTopInnerStretchDeltaY(draggedElement);
        if (cBlock.nextUUID && chainSpreadDeltaY){
          ChainMiddleZone.setChainSpreadBelow(
            blockRegistry,
            cBlock.nextUUID,
            chainSpreadDeltaY,
            this.#spreadExcludeIds
          );
        } else {
          ChainMiddleZone.clearChainSpread(
            blockRegistry,
            this.#spreadExcludeIds
          );
        }
      } else if (
        pickedSnap.mode === 'topInner' &&
        !cBlock.innerStackHeadUUID
      ){
        const chainSpreadDeltaY =
          CBlockPathStretch.cBlockTopInnerStretchDeltaY(draggedElement);
        if (cBlock.nextUUID && chainSpreadDeltaY){
          ChainMiddleZone.setChainSpreadBelow(
            blockRegistry,
            cBlock.nextUUID,
            chainSpreadDeltaY,
            this.#spreadExcludeIds
          );
        } else {
          ChainMiddleZone.clearChainSpread(
            blockRegistry,
            this.#spreadExcludeIds
          );
        }
      }
    } else {
      ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeIds);
    }

    const { x: overlayX, y: overlayY } = this.#containerToOverlay(
      ghostWorldPosition.x,
      ghostWorldPosition.y
    );
    const cForKey = blockRegistry.get(pickedSnap.snapUUID);
    let innerPrependShiftKey = 0;
    if (
      pickedSnap.mode === 'topInner' &&
      cForKey &&
      cForKey.innerStackHeadUUID &&
      draggedBlock
    ){
      innerPrependShiftKey = Math.round(
        CBlockPathStretch.cBlockTopInnerPrependInnerStackSpreadY(
          draggedElement,
          draggedChainEndsWithStop
        )
      );
    }
    let parentUuidForKey = '';
    if (pickedSnap.parentUUID != null){
      parentUuidForKey = pickedSnap.parentUUID;
    }
    const targetKey = `${pickedSnap.snapUUID}|${pickedSnap.mode}|${parentUuidForKey}|${Math.round(overlayX)}|${Math.round(overlayY)}|${innerPrependShiftKey}`;

    if (this.#lastTargetKey === targetKey && this.#Ghost.element){
      this.#Ghost.setPosition(overlayX, overlayY);
      this.#activeSnap = this.#activeSnapPayload(pickedSnap);
      return;
    }

    this.#lastTargetKey = targetKey;
    this.#Ghost.createFromElement(draggedElement, overlayX, overlayY);
    if (!this.#Ghost.element){
      this.#cancelSnapPreview(blockRegistry);
      return;
    }

    this.#activeSnap = this.#activeSnapPayload(pickedSnap);
    this.#Ghost.element.style.pointerEvents = 'none';
    this.#Ghost.attach(this.#dragOverlayEl);
    this.#dragOverlayEl.insertBefore(this.#Ghost.element, draggedElement);
  }

  clear(){
    this.#exitTopInnerStretchIfAny();
    if (this.#blockRegistry){
      ChainMiddleZone.clearChainSpread(
        this.#blockRegistry,
        this.#spreadExcludeIds
      );
    }
    this.#blockRegistry = null;
    this.#spreadExcludeIds = null;
    this.#lastTargetKey = null;
    this.#activeSnap = null;
    this.#Ghost.dispose();
  }

  #cancelSnapPreview(blockRegistry){
    ChainMiddleZone.clearChainSpread(blockRegistry, this.#spreadExcludeIds);
    this.clear();
  }

  /** @param {boolean} draggedChainEndsWithStop хвост перетаскиваемой цепи `stop-block` */
  #syncTopInnerPathStretch(cBlock, draggedElement, draggedChainEndsWithStop){
    if (!cBlock || !cBlock.element) return;
    const pathEl = CBlockPathStretch.getWorkspaceBlockPathElement(cBlock);
    if (!pathEl) return;

    const uuid = cBlock.blockUUID;
    if (this.#stretchAppliedUuid && this.#stretchAppliedUuid !== uuid){
      this.#restoreTopInnerStretchForUuid(this.#stretchAppliedUuid);
    }
    if (!this.#stretchBaseDByUuid.has(uuid)){
      let pathDataSnapshot = pathEl.getAttribute('d');
      if (pathDataSnapshot == null){
        pathDataSnapshot = '';
      }
      this.#stretchBaseDByUuid.set(uuid, pathDataSnapshot);
    }
    const baseD = this.#stretchBaseDByUuid.get(uuid);

    const ghostHeight = CBlockPathStretch.cBlockTopInnerStretchDeltaY(
      draggedElement
    );

    if (!ghostHeight){
      pathEl.setAttribute('d', baseD);
      if (this.#stretchAppliedUuid === uuid){
        this.#stretchAppliedUuid = null;
      }
      if (this.#refreshZones){
        this.#refreshZones();
      }
      return;
    }

    const nextD = CBlockPathStretch.buildStretchedCBlockPathDFromGhostHeight(
      baseD,
      ghostHeight,
      !cBlock.innerStackHeadUUID,
      draggedChainEndsWithStop
    );

    pathEl.setAttribute('d', nextD);
    this.#stretchAppliedUuid = uuid;
    if (this.#refreshZones){
      this.#refreshZones();
    }
  }

  #exitTopInnerStretchIfAny(){
    if (!this.#stretchAppliedUuid){
      return;
    }
    this.#restoreTopInnerStretchForUuid(this.#stretchAppliedUuid);
  }

  /** Восстановить атрибут `d` из снимка для данного UUID (должен совпадать с растянутым c-block). */
  #restoreTopInnerStretchForUuid(uuid){
    if (!uuid) return;

    const baseD = this.#stretchBaseDByUuid.get(uuid);
    let registeredBlock = null;
    if (this.#blockRegistry && typeof this.#blockRegistry.get === 'function'){
      registeredBlock = this.#blockRegistry.get(uuid);
    }
    if (!registeredBlock || registeredBlock.blockUUID !== uuid){
      this.#stretchBaseDByUuid.delete(uuid);
      if (this.#stretchAppliedUuid === uuid){
        this.#stretchAppliedUuid = null;
      }
      if (this.#refreshZones){
        this.#refreshZones();
      }
      return;
    }
    const pathEl = CBlockPathStretch.getWorkspaceBlockPathElement(registeredBlock);
    if (pathEl != null && baseD != null){
      pathEl.setAttribute('d', baseD);
    }
    this.#stretchBaseDByUuid.delete(uuid);
    if (this.#stretchAppliedUuid === uuid){
      this.#stretchAppliedUuid = null;
    }
    if (this.#refreshZones){
      this.#refreshZones();
    }
  }

  #activeSnapPayload(snap){
    if (snap.mode === 'middle'){
      return {
        snapUUID: snap.snapUUID,
        mode: 'middle',
        parentUUID: snap.parentUUID,
      };
    }
    if (snap.mode === 'prefixOnHead'){
      return { snapUUID: snap.snapUUID, mode: 'prefixOnHead' };
    }
    if (snap.mode === 'topInner' || snap.mode === 'bottomInner'){
      return { snapUUID: snap.snapUUID, mode: snap.mode };
    }
    return { snapUUID: snap.snapUUID, mode: snap.mode };
  }

  // До hit-test: если bbox перетаскиваемого пересекает полосу middle-шва, раздвигаем цепочку ниже шва.
  #tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager){
    const draggedBlockUUID =
      BlockConnectionCheckModule.BlockConnectionCheck.resolveDraggedBlockUUID(
        draggedElement,
        grabManager
      );
    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    const chainSpreadDeltaY = ChainMiddleZone.ghostSpreadDeltaY(draggedElement);
    if (!draggedBlock || !draggedBlock.element || !chainSpreadDeltaY){
      return;
    }

    const draggedClientRect = draggedBlock.element.getBoundingClientRect();

    for (const childBlock of blockRegistry.values()){
      if (childBlock.blockUUID === draggedBlockUUID || !childBlock.parentUUID){
        continue;
      }
      const parentBlock = blockRegistry.get(childBlock.parentUUID);
      if (!parentBlock || !parentBlock.element || !childBlock.element){
        continue;
      }
      if (
        !BlockConnectionCheckModule.BlockConnectionCheck.middleInsertEligibility(
          draggedBlock,
          parentBlock,
          childBlock,
          blockRegistry
        )
      ){
        continue;
      }

      const middleZone = StackMiddleJoint.middleJointOnParent(
        parentBlock,
        childBlock
      );
      if (!middleZone){
        continue;
      }

      const middleBandClientRect = StackMiddleJoint.middleJointBandClientRect(
        parentBlock,
        childBlock,
        middleZone
      );
      if (
        !middleBandClientRect ||
        !ZoneClientGeometry.rectsIntersectClient(
          draggedClientRect,
          middleBandClientRect
        )
      ){
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

  #containerToOverlay(worldX, worldY){
    const blockContainerRect = this.#blockContainerEl.getBoundingClientRect();
    const dragOverlayRect = this.#dragOverlayEl.getBoundingClientRect();
    const { x: gridPanOffsetX, y: gridPanOffsetY } =
      this.#getWorkspaceGridOffset();
    return {
      x:
        worldX +
        gridPanOffsetX +
        blockContainerRect.left -
        dragOverlayRect.left,
      y: worldY + gridPanOffsetY + blockContainerRect.top - dragOverlayRect.top,
    };
  }
}
