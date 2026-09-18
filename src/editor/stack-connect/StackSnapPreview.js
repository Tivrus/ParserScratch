import * as GhostModule from '../../blocks/Ghost.js'
import * as ChainMiddleZone from '../../blocks/ChainMiddleZone.js'
import * as StackChainDrag from '../../blocks/StackChainDrag.js'
import * as StackSnap from './StackSnap.js'
import * as ZoneMath from '../../calculations/ZoneMath.js'
import * as CBlockInnerStack from '../c-block/CBlockInnerStack.js'
import * as CBlockPathStretch from '../c-block/CBlockPathStretch.js'
import * as SvgUtils from '../../utils/SvgUtils.js'

export class StackSnapPreview {
  #dragOverlayEl
  #blockContainerEl
  #getWorkspaceGridOffset
  #refreshZones
  #Ghost
  #lastTargetKey
  #activeSnap
  #blockRegistry
  #spreadExcludeIds
  #stretchAppliedUuid
  #stretchBaseDByUuid

  constructor(config = {}){
    this.#dragOverlayEl = config.dragOverlayEl
    this.#blockContainerEl = config.blockContainerEl
    if (config.getWorkspaceGridOffset){
      this.#getWorkspaceGridOffset = config.getWorkspaceGridOffset
    } else {
      this.#getWorkspaceGridOffset = () => ({ x: 0, y: 0 })
    }
    let refreshZonesCallback = null
    if (typeof config.refreshZones === 'function'){
      refreshZonesCallback = config.refreshZones
    }
    this.#refreshZones = refreshZonesCallback
    this.#Ghost = new GhostModule.Ghost()
    this.#lastTargetKey = null
    this.#activeSnap = null
    this.#blockRegistry = null
    this.#spreadExcludeIds = null
    this.#stretchAppliedUuid = null
    this.#stretchBaseDByUuid = new Map()
  }

  getActiveSnap(){
    if (!this.#Ghost.element){
      return null
    }
    return this.#activeSnap
  }

  getTopInnerStretchCBlockUuid(){
    return this.#stretchAppliedUuid
  }

  sync(draggedElement, blockRegistry, grabManager){
       this.#blockRegistry = blockRegistry
    const draggedStackHeadUUID = StackSnap.find_DraggedBlockUUID(
      draggedElement,
      grabManager
    )
    let excludeUuidSet = null
    if (draggedStackHeadUUID){
      excludeUuidSet = StackChainDrag.collect_ChainTreeUuids(
        blockRegistry,
        draggedStackHeadUUID
      )
    }
    this.#spreadExcludeIds = excludeUuidSet

    ChainMiddleZone.clear_ChainSpread(blockRegistry, this.#spreadExcludeIds)
    this.#tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager)

    const candidates = StackSnap.list_SnapCandidates(
      draggedElement,
      blockRegistry,
      grabManager
    )

    let draggedBlock = null
    if (draggedStackHeadUUID){
      draggedBlock = blockRegistry.get(draggedStackHeadUUID)
    }
    const draggedChainEndsWithStop =
      Boolean(draggedBlock) &&
      StackChainDrag.is_ChainEndsWithStop(
        blockRegistry,
        draggedBlock
      )
    const pickedSnap = CBlockInnerStack.resolve_InnerSnap(
      candidates,
      draggedBlock,
      draggedElement,
      blockRegistry
    )

    if (!pickedSnap){
      this.#exitTopInnerStretchIfAny()
      this.#cancelSnapPreview(blockRegistry)
      return
    }

    if (
      (pickedSnap.mode === 'topInner' || pickedSnap.mode === 'bottomInner') &&
      draggedBlock
    ){
      this.#syncTopInnerPathStretch(
        blockRegistry.get(pickedSnap.snapUUID),
        draggedElement,
        draggedChainEndsWithStop
      )
    } else {
      this.#exitTopInnerStretchIfAny()
    }

    const ghostWorldPosition = StackSnap.calc_GhostPos(
      pickedSnap,
      blockRegistry,
      draggedElement
    )
    if (!ghostWorldPosition){
      this.#exitTopInnerStretchIfAny()
      this.#cancelSnapPreview(blockRegistry)
      return
    }

    if (pickedSnap.mode === 'middle'){
      const parentBlock = blockRegistry.get(pickedSnap.parentUUID)
      const childBlock = blockRegistry.get(pickedSnap.snapUUID)
      if (
        !parentBlock ||
        !parentBlock.element ||
        !childBlock ||
        !childBlock.element
      ){
        this.#cancelSnapPreview(blockRegistry)
        return
      }
      const chainSpreadDeltaY =
        ChainMiddleZone.calc_GhostSpreadY(draggedElement)
      ChainMiddleZone.set_ChainSpread_Below(
        blockRegistry,
        pickedSnap.snapUUID,
        chainSpreadDeltaY,
        this.#spreadExcludeIds
      )
    } else if (
      pickedSnap.mode === 'topInner' ||
      pickedSnap.mode === 'bottomInner'
    ){
      const cBlock = blockRegistry.get(pickedSnap.snapUUID)
      if (!cBlock){
        ChainMiddleZone.clear_ChainSpread(blockRegistry, this.#spreadExcludeIds)
      } else if (
        pickedSnap.mode === 'topInner' &&
        cBlock.innerStackHeadUUID
      ){
        const innerSpreadY =
          CBlockPathStretch.calc_CblockTopInner_PrependSpread(
            draggedElement,
            draggedChainEndsWithStop
          )
        if (innerSpreadY > 0){
          ChainMiddleZone.set_CblockStack_Spread(
            blockRegistry,
            cBlock,
            innerSpreadY,
            this.#spreadExcludeIds
          )
        } else {
          ChainMiddleZone.clear_ChainSpread(
            blockRegistry,
            this.#spreadExcludeIds
          )
        }
      } else if (pickedSnap.mode === 'bottomInner'){
        const chainSpreadDeltaY =
          CBlockPathStretch.calc_CblockTopInner_PathStretchDelta(draggedElement)
        if (cBlock.nextUUID && chainSpreadDeltaY){
          ChainMiddleZone.set_ChainSpread_Below(
            blockRegistry,
            cBlock.nextUUID,
            chainSpreadDeltaY,
            this.#spreadExcludeIds
          )
        } else {
          ChainMiddleZone.clear_ChainSpread(
            blockRegistry,
            this.#spreadExcludeIds
          )
        }
      } else if (
        pickedSnap.mode === 'topInner' &&
        !cBlock.innerStackHeadUUID
      ){
        const chainSpreadDeltaY =
          CBlockPathStretch.calc_CblockTopInner_PathStretchDelta(draggedElement)
        if (cBlock.nextUUID && chainSpreadDeltaY){
          ChainMiddleZone.set_ChainSpread_Below(
            blockRegistry,
            cBlock.nextUUID,
            chainSpreadDeltaY,
            this.#spreadExcludeIds
          )
        } else {
          ChainMiddleZone.clear_ChainSpread(
            blockRegistry,
            this.#spreadExcludeIds
          )
        }
      }
    } else {
      ChainMiddleZone.clear_ChainSpread(blockRegistry, this.#spreadExcludeIds)
    }

    const { x: overlayX, y: overlayY } = this.#containerToOverlay(
      ghostWorldPosition.x,
      ghostWorldPosition.y
    )
    const cForKey = blockRegistry.get(pickedSnap.snapUUID)
    let innerPrependShiftKey = 0
    if (
      pickedSnap.mode === 'topInner' &&
      cForKey &&
      cForKey.innerStackHeadUUID &&
      draggedBlock
    ){
      innerPrependShiftKey = Math.round(
        CBlockPathStretch.calc_CblockTopInner_PrependSpread(
          draggedElement,
          draggedChainEndsWithStop
        )
      )
    }
    let parentUuidForKey = ''
    if (pickedSnap.parentUUID != null){
      parentUuidForKey = pickedSnap.parentUUID
    }
    const targetKey = `${pickedSnap.snapUUID}|${pickedSnap.mode}|${parentUuidForKey}|${Math.round(overlayX)}|${Math.round(overlayY)}|${innerPrependShiftKey}`

    if (this.#lastTargetKey === targetKey && this.#Ghost.element){
      this.#Ghost.setPosition(overlayX, overlayY)
      this.#activeSnap = this.#activeSnapPayload(pickedSnap)
      return
    }

    this.#lastTargetKey = targetKey
    this.#Ghost.createFromElement(draggedElement, overlayX, overlayY)
    if (!this.#Ghost.element){
      this.#cancelSnapPreview(blockRegistry)
      return
    }

    this.#activeSnap = this.#activeSnapPayload(pickedSnap)
    this.#Ghost.element.style.pointerEvents = 'none'
    this.#Ghost.attach(this.#dragOverlayEl)
    this.#dragOverlayEl.insertBefore(this.#Ghost.element, draggedElement)
  }

  clear(){
    this.#exitTopInnerStretchIfAny()
    if (this.#blockRegistry){
      ChainMiddleZone.clear_ChainSpread(
        this.#blockRegistry,
        this.#spreadExcludeIds
      )
    }
    this.#blockRegistry = null
    this.#spreadExcludeIds = null
    this.#lastTargetKey = null
    this.#activeSnap = null
    this.#Ghost.dispose()
  }

  #cancelSnapPreview(blockRegistry){
    ChainMiddleZone.clear_ChainSpread(blockRegistry, this.#spreadExcludeIds)
    this.clear()
  }

  #syncTopInnerPathStretch(cBlock, draggedElement, draggedChainEndsWithStop){
    if (!cBlock || !cBlock.element) return
    const pathEl = CBlockPathStretch.find_Cblock_PathEl(cBlock)
    if (!pathEl) return

    const uuid = cBlock.blockUUID
    if (this.#stretchAppliedUuid && this.#stretchAppliedUuid !== uuid){
      this.#restoreTopInnerStretchForUuid(this.#stretchAppliedUuid)
    }
    if (!this.#stretchBaseDByUuid.has(uuid)){
      let pathDataSnapshot = pathEl.getAttribute('d')
      if (pathDataSnapshot == null){
        pathDataSnapshot = ''
      }
      this.#stretchBaseDByUuid.set(uuid, pathDataSnapshot)
    }
    const baseD = this.#stretchBaseDByUuid.get(uuid)

    const ghostHeight = CBlockPathStretch.calc_CblockTopInner_PathStretchDelta(
      draggedElement
    )

    if (!ghostHeight){
      pathEl.setAttribute('d', baseD)
      if (this.#stretchAppliedUuid === uuid){
        this.#stretchAppliedUuid = null
      }
      if (this.#refreshZones){
        this.#refreshZones()
      }
      return
    }

    const nextD = CBlockPathStretch.build_CblockInnerStack_PathD_FromGhostHeight(
      baseD,
      ghostHeight,
      !cBlock.innerStackHeadUUID,
      draggedChainEndsWithStop
    )

    pathEl.setAttribute('d', nextD)
    this.#stretchAppliedUuid = uuid
    if (this.#refreshZones){
      this.#refreshZones()
    }
  }

  #exitTopInnerStretchIfAny(){
    if (!this.#stretchAppliedUuid){
      return
    }
    this.#restoreTopInnerStretchForUuid(this.#stretchAppliedUuid)
  }

  #restoreTopInnerStretchForUuid(uuid){
    if (!uuid) return

    const baseD = this.#stretchBaseDByUuid.get(uuid)
    let registeredBlock = null
    if (this.#blockRegistry && typeof this.#blockRegistry.get === 'function'){
      registeredBlock = this.#blockRegistry.get(uuid)
    }
    if (!registeredBlock || registeredBlock.blockUUID !== uuid){
      this.#stretchBaseDByUuid.delete(uuid)
      if (this.#stretchAppliedUuid === uuid){
        this.#stretchAppliedUuid = null
      }
      if (this.#refreshZones){
        this.#refreshZones()
      }
      return
    }
    const pathEl = CBlockPathStretch.find_Cblock_PathEl(registeredBlock)
    if (pathEl != null && baseD != null){
      pathEl.setAttribute('d', baseD)
    }
    this.#stretchBaseDByUuid.delete(uuid)
    if (this.#stretchAppliedUuid === uuid){
      this.#stretchAppliedUuid = null
    }
    if (this.#refreshZones){
      this.#refreshZones()
    }
  }

  #activeSnapPayload(snap){
    if (snap.mode === 'middle'){
      return {
        snapUUID: snap.snapUUID,
        mode: 'middle',
        parentUUID: snap.parentUUID,
      }
    }
    if (snap.mode === 'prefixOnHead'){
      return { snapUUID: snap.snapUUID, mode: 'prefixOnHead' }
    }
    if (snap.mode === 'topInner' || snap.mode === 'bottomInner'){
      return { snapUUID: snap.snapUUID, mode: snap.mode }
    }
    return { snapUUID: snap.snapUUID, mode: snap.mode }
  }

  #tryPrepareMiddleSpread(draggedElement, blockRegistry, grabManager){
    const draggedBlockUUID = StackSnap.find_DraggedBlockUUID(
      draggedElement,
      grabManager
    )
    const draggedBlock = blockRegistry.get(draggedBlockUUID)
    const chainSpreadDeltaY = ChainMiddleZone.calc_GhostSpreadY(draggedElement)
    if (!draggedBlock || !draggedBlock.element || !chainSpreadDeltaY){
      return
    }

    const draggedClientRect = SvgUtils.get_Rect(draggedBlock.element)

    for (const childBlock of blockRegistry.values()){
      if (childBlock.blockUUID === draggedBlockUUID || !childBlock.parentUUID){
        continue
      }
      const parentBlock = blockRegistry.get(childBlock.parentUUID)
      if (!parentBlock || !parentBlock.element || !childBlock.element){
        continue
      }
      if (
        !StackSnap.is_MiddleInsert_Eligible(
          draggedBlock,
          parentBlock,
          childBlock,
          blockRegistry
        )
      ){
        continue
      }

      const middleZone = StackSnap.find_MiddleZone_OnParent(
        parentBlock,
        childBlock
      )
      if (!middleZone){
        continue
      }

      const middleBandClientRect = StackSnap.calc_MiddleHitRect(
        parentBlock,
        childBlock,
        middleZone
      )
      if (
        !middleBandClientRect ||
        !ZoneMath.is_RectsOverlap(draggedClientRect, middleBandClientRect)
      ){
        continue
      }

      ChainMiddleZone.set_ChainSpread_Below(
        blockRegistry,
        childBlock.blockUUID,
        chainSpreadDeltaY,
        this.#spreadExcludeIds
      )
      return
    }
  }

  #containerToOverlay(worldX, worldY){
    const blockContainerRect = SvgUtils.get_Rect(this.#blockContainerEl)
    const dragOverlayRect = SvgUtils.get_Rect(this.#dragOverlayEl)
    const { x: gridPanOffsetX, y: gridPanOffsetY } =
      this.#getWorkspaceGridOffset()
    return {
      x:
        worldX +
        gridPanOffsetX +
        blockContainerRect.left -
        dragOverlayRect.left,
      y: worldY + gridPanOffsetY + blockContainerRect.top - dragOverlayRect.top,
    }
  }
}
