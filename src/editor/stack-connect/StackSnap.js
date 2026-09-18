import * as Global from '../../constants/Global.js'
import * as SvgUtils from '../../utils/SvgUtils.js'
import * as ZoneModule from '../../blocks/ZoneModule.js'
import * as ZoneMath from '../../calculations/ZoneMath.js'
import * as SnapMath from '../../calculations/SnapMath.js'
import * as StackChainDrag from '../../blocks/StackChainDrag.js'
import * as CBlockInnerGeometry from '../c-block/CBlockInnerGeometry.js'

export function find_DraggedBlockUUID(draggedElement, grabManager){
  if (
    grabManager &&
    typeof grabManager.getWorkspaceBlockGrabUUID === 'function'
  ){
    const uuid = grabManager.getWorkspaceBlockGrabUUID()
    if (uuid) return uuid
  }
  return SvgUtils.read_UUID(draggedElement) || ''
}

export function find_MiddleZone_OnParent(parentBlock, childBlock){
  if (!parentBlock || !childBlock) return null
  const zones = parentBlock.Zones
  if (!zones || typeof zones.find !== 'function') return null
  const match = zones.find(
    zone =>
      zone.type === 'middle' && zone.linkedChildUUID === childBlock.blockUUID
  )
  return match === undefined ? null : match
}

export function calc_MiddleHitRect(
  parentBlock,
  childBlock,
  middleZone
){
  if (
    !parentBlock?.element ||
    !childBlock?.element ||
    !middleZone
  ){
    return null
  }
  const zoneRect = ZoneMath.calc_ZoneClientRect(
    parentBlock.element,
    middleZone
  )
  if (!zoneRect) return null

  const parentRect = SvgUtils.get_Rect(parentBlock.element)
  const childRect = SvgUtils.get_Rect(childBlock.element)
  const band = ZoneMath.calc_HitBand(
    ZoneMath.calc_OverlapMidY(parentRect, childRect),
    middleZone.height
  )
  return {
    left: zoneRect.left,
    right: zoneRect.right,
    top: band.top,
    bottom: band.bottom,
  }
}

function resolve_Zone_Below(anchorBlock, blockRegistry){
  const bottomZone = ZoneModule.Zone.zoneByType(anchorBlock.Zones, 'bottom')
  if (bottomZone) return { el: anchorBlock.element, zone: bottomZone }

  if (blockRegistry && anchorBlock.nextUUID){
    const childBlock = blockRegistry.get(anchorBlock.nextUUID)
    const middleZone = childBlock
      ? find_MiddleZone_OnParent(anchorBlock, childBlock)
      : null
    if (middleZone && anchorBlock.element){
      return {
        el: anchorBlock.element,
        zone: middleZone,
        middlePair: { parent: anchorBlock, child: childBlock },
      }
    }
  }
  return null
}

function resolve_Zone_Above(anchorBlock, blockRegistry){
  const topZone = ZoneModule.Zone.zoneByType(anchorBlock.Zones, 'top')
  if (topZone) return { el: anchorBlock.element, zone: topZone }

  if (blockRegistry && anchorBlock.parentUUID){
    const parentBlock = blockRegistry.get(anchorBlock.parentUUID)
    const middleZone = parentBlock
      ? find_MiddleZone_OnParent(parentBlock, anchorBlock)
      : null
    if (middleZone && parentBlock?.element){
      return {
        el: parentBlock.element,
        zone: middleZone,
        middlePair: { parent: parentBlock, child: anchorBlock },
      }
    }
  }
  return null
}

function hit_Zone(draggedBlock, resolvedZone){
  const draggedRect = SvgUtils.get_Rect(
    draggedBlock.element
  )
  let zoneRect
  if (
    resolvedZone.zone?.type === 'middle' &&
    resolvedZone.middlePair
  ){
    const { parent, child } = resolvedZone.middlePair
    zoneRect = calc_MiddleHitRect(
      parent,
      child,
      resolvedZone.zone
    )
  } else {
    zoneRect = ZoneMath.calc_ZoneClientRect(
      resolvedZone.el,
      resolvedZone.zone
    )
  }
  if (!zoneRect) return false
  return ZoneMath.is_RectsOverlap(draggedRect, zoneRect)
}

export function can_Snap_Below(draggedBlock, anchorBlock, blockRegistry = null){
  if (!ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'top')) return false
  if (anchorBlock?.nextUUID) return false
  const zone = resolve_Zone_Below(anchorBlock, blockRegistry)
  if (!zone) return false
  return hit_Zone(draggedBlock, zone)
}

export function can_Snap_Above(draggedBlock, anchorBlock, blockRegistry = null){
  if (!ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'bottom')) return false
  const zone = resolve_Zone_Above(anchorBlock, blockRegistry)
  if (!zone) return false
  return hit_Zone(draggedBlock, zone)
}

export function can_Snap_PrefixOnHead(draggedBlock, headBlock, blockRegistry){
  if (!draggedBlock?.element || !headBlock?.element || !blockRegistry){
    return false
  }
  if (
    headBlock.type === 'c-block' &&
    StackChainDrag.is_OnInnerStack(
      draggedBlock,
      headBlock,
      blockRegistry
    )
  ){
    return false
  }
  if (!draggedBlock.nextUUID) return false
  if (headBlock.parentUUID) return false
  if (!ZoneModule.Zone.zoneByType(headBlock.Zones, 'top')) return false

  const tail = StackChainDrag.find_StackTail(blockRegistry, draggedBlock)
  if (!tail || tail.type === 'stop-block') return false

  const draggedRect = SvgUtils.get_Rect(
    draggedBlock.element
  )
  const topZone = ZoneModule.Zone.zoneByType(headBlock.Zones, 'top')
  const topRect = ZoneMath.calc_ZoneClientRect(headBlock.element, topZone)
  if (!topRect) return false
  return ZoneMath.is_RectsOverlap(draggedRect, topRect)
}

export function is_MiddleInsert_Eligible(
  draggedBlock,
  parentBlock,
  childBlock,
  blockRegistry = null
){
  if (
    !draggedBlock?.element ||
    !parentBlock?.element ||
    !childBlock?.element
  ){
    return false
  }
  if (draggedBlock.parentUUID || draggedBlock.nextUUID) return false

  if (
    draggedBlock.type === 'c-block' &&
    blockRegistry &&
    (StackChainDrag.is_OnInnerStack(
      parentBlock,
      draggedBlock,
      blockRegistry
    ) ||
      StackChainDrag.is_OnInnerStack(
        childBlock,
        draggedBlock,
        blockRegistry
      ))
  ){
    return false
  }

  if (blockRegistry){
    for (const end of [parentBlock, childBlock]){
      if (
        end?.type === 'c-block' &&
        StackChainDrag.is_OnInnerStack(
          draggedBlock,
          end,
          blockRegistry
        )
      ){
        return false
      }
    }
  }

  const hasTop = Boolean(ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'top'))
  const hasBottom = Boolean(
    ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'bottom')
  )
  if (draggedBlock.type === 'start-block'){
    if (!hasBottom) return false
  } else if (draggedBlock.type === 'stop-block'){
    if (!hasTop) return false
  } else if (!hasTop || !hasBottom){
    return false
  }

  if (
    parentBlock.nextUUID !== childBlock.blockUUID ||
    childBlock.parentUUID !== parentBlock.blockUUID
  ){
    return false
  }
  return Boolean(find_MiddleZone_OnParent(parentBlock, childBlock))
}

export function can_Snap_MiddleInsert(
  draggedBlock,
  parentBlock,
  childBlock,
  blockRegistry
){
  if (
    !is_MiddleInsert_Eligible(
      draggedBlock,
      parentBlock,
      childBlock,
      blockRegistry
    )
  ){
    return false
  }
  const middleZone = find_MiddleZone_OnParent(parentBlock, childBlock)
  if (!middleZone) return false

  const draggedRect = SvgUtils.get_Rect(
    draggedBlock.element
  )
  const bandRect = calc_MiddleHitRect(
    parentBlock,
    childBlock,
    middleZone
  )
  if (!bandRect) return false
  return ZoneMath.is_RectsOverlap(draggedRect, bandRect)
}

export function list_SnapCandidates(draggedElement, blockRegistry, grabManager){
  const draggedUUID = find_DraggedBlockUUID(draggedElement, grabManager)
  if (!draggedUUID) return []

  const draggedBlock = blockRegistry.get(draggedUUID)
  const isCap =
    draggedBlock &&
    (draggedBlock.type === 'start-block' || draggedBlock.type === 'stop-block')
  const zoneCount = draggedBlock?.Zones?.length
  if (!draggedBlock || (!zoneCount && !isCap)) return []

  const candidates = []

  for (const [otherUUID, otherBlock] of blockRegistry){
    if (otherUUID === draggedUUID) continue
    if (!otherBlock?.element) continue
    if (!otherBlock.Zones?.length) continue

    if (
      draggedBlock.type === 'c-block' &&
      StackChainDrag.is_OnInnerStack(
        otherBlock,
        draggedBlock,
        blockRegistry
      )
    ){
      continue
    }
    if (
      otherBlock.type === 'c-block' &&
      StackChainDrag.is_OnInnerStack(
        draggedBlock,
        otherBlock,
        blockRegistry
      )
    ){
      continue
    }

    const prefixOnHead = can_Snap_PrefixOnHead(
      draggedBlock,
      otherBlock,
      blockRegistry
    )
    const below =
      !prefixOnHead && can_Snap_Below(draggedBlock, otherBlock, blockRegistry)
    const above =
      !prefixOnHead && can_Snap_Above(draggedBlock, otherBlock, blockRegistry)
    if (prefixOnHead || below || above){
      candidates.push({
        snapUUID: otherUUID,
        below,
        above,
        prefixOnHead,
      })
    }
  }

  for (const childBlock of blockRegistry.values()){
    if (childBlock.blockUUID === draggedUUID || !childBlock.parentUUID) continue
    const parentBlock = blockRegistry.get(childBlock.parentUUID)
    if (!parentBlock?.element || !childBlock.element) continue

    if (
      can_Snap_MiddleInsert(
        draggedBlock,
        parentBlock,
        childBlock,
        blockRegistry
      )
    ){
      candidates.push({
        snapUUID: childBlock.blockUUID,
        parentUUID: parentBlock.blockUUID,
        middle: true,
        below: false,
        above: false,
      })
    }
  }

  return drop_DuplicateMiddleSnaps(candidates)
}

function drop_DuplicateMiddleSnaps(candidates){
  const middleChildByParent = new Map()
  for (const c of candidates){
    if (c.middle && c.parentUUID != null){
      middleChildByParent.set(c.parentUUID, c.snapUUID)
    }
  }
  if (middleChildByParent.size === 0) return candidates

  const middleChildren = new Set(middleChildByParent.values())
  const result = []
  for (const c of candidates){
    if (c.middle){
      result.push(c)
      continue
    }
    let below = c.below
    let above = c.above
    if (below && middleChildByParent.has(c.snapUUID)) below = false
    if (above && middleChildren.has(c.snapUUID)) above = false
    if (below || above || c.prefixOnHead){
      result.push({ ...c, below, above })
    }
  }
  return result
}

export function pick_Snap(candidates){
  const middle = candidates.find(c => c.middle)
  if (middle){
    return {
      snapUUID: middle.snapUUID,
      parentUUID: middle.parentUUID,
      mode: 'middle',
    }
  }
  const prefix = candidates.find(c => c.prefixOnHead)
  if (prefix) return { snapUUID: prefix.snapUUID, mode: 'prefixOnHead' }
  const below = candidates.find(c => c.below)
  if (below) return { snapUUID: below.snapUUID, mode: 'below' }
  const above = candidates.find(c => c.above)
  if (above) return { snapUUID: above.snapUUID, mode: 'above' }
  return null
}

export function calc_SnapPos(
  anchorBlock,
  draggedElement,
  mode,
  { isMiddle = false } = {}
){
  const anchorEl = anchorBlock.element
  if (!anchorEl) return null

  const { x: anchorX, y: anchorY } = SvgUtils.read_Transform(anchorEl)
  const bbox = SvgUtils.get_BBox(anchorEl)
  if (!bbox) return null

  const draggedHeight = SvgUtils.get_Height(draggedElement)
  if (!draggedHeight) return null

  const extraY = SnapMath.calc_SnapExtraY_Below(draggedElement, isMiddle)

  if (mode === 'below'){
    return SnapMath.calc_GhostBelow(
      anchorX,
      anchorY,
      bbox.y,
      bbox.height,
      extraY
    )
  }
  if (mode === 'above'){
    return SnapMath.calc_GhostAbove(
      anchorX,
      anchorY,
      bbox.y,
      draggedHeight,
      extraY,
      SnapMath.calc_SnapExtraY_Above(draggedElement)
    )
  }
  return null
}

export function calc_MiddleInsertPos(parentBlock, draggedElement){
  return calc_SnapPos(parentBlock, draggedElement, 'below', {
    isMiddle: true,
  })
}

export function calc_GhostPos(snap, blockRegistry, draggedElement){
  if (snap.mode === 'topInner' || snap.mode === 'bottomInner'){
    const cBlock = blockRegistry.get(snap.snapUUID)
    if (!cBlock?.element) return null
    if (cBlock.innerStackHeadUUID){
      const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID)
      if (snap.mode === 'topInner'){
        if (innerHead?.element){
          return CBlockInnerGeometry.calc_CblockInnerGhostPos(cBlock)
        }
      } else {
        const innerTail = innerHead
          ? StackChainDrag.find_StackTail(blockRegistry, innerHead)
          : null
        if (innerTail?.element){
          return calc_SnapPos(innerTail, draggedElement, 'below')
        }
      }
    }
    if (snap.mode === 'bottomInner') return null
    return CBlockInnerGeometry.calc_CblockInnerGhostPos(cBlock)
  }

  if (snap.mode === 'middle'){
    const parentBlock = blockRegistry.get(snap.parentUUID)
    const childBlock = blockRegistry.get(snap.snapUUID)
    if (!parentBlock?.element || !childBlock?.element) return null
    return calc_MiddleInsertPos(parentBlock, draggedElement)
  }

  if (snap.mode === 'prefixOnHead'){
    const head = blockRegistry.get(snap.snapUUID)
    if (!head?.element) return null
    const { x, y } = SvgUtils.read_Transform(head.element)
    const headHeight = SvgUtils.get_Height(
      draggedElement,
      Global.DEFAULT_BLOCK_HEIGHT
    )
    return SnapMath.calc_GhostPrefix(x, y, headHeight)
  }

  const anchor = blockRegistry.get(snap.snapUUID)
  if (!anchor?.element) return null
  return calc_SnapPos(anchor, draggedElement, snap.mode)
}

export function layout_StackFromHead(fromBlock, blockRegistry){
  let current = fromBlock
  while (current.nextUUID){
    const next = blockRegistry.get(current.nextUUID)
    if (!next?.element) break
    const pos = calc_SnapPos(current, next.element, 'below')
    if (!pos) break
    next.setPosition(pos.x, pos.y)
    current = next
  }
}
