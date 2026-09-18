import * as Global from '../constants/Global.js'
import * as ScratchCallTrace from '../utils/scratchCallTrace.js'
import * as SvgUtils from '../utils/SvgUtils.js'
import * as StackChainDrag from './StackChainDrag.js'
import * as ZoneModule from './ZoneModule.js'
import * as CBlockInnerGeometry from '../editor/c-block/CBlockInnerGeometry.js'
import * as SnapMath from '../calculations/SnapMath.js'
import * as ZoneMath from '../calculations/ZoneMath.js'

function calc_ZoneSeamY(
  parentEl,
  childEl,
  parentBottomZone,
  childTopZone
){
  const parentZoneRect = ZoneMath.calc_ZoneClientRect(parentEl, parentBottomZone)
  const childZoneRect = ZoneMath.calc_ZoneClientRect(childEl, childTopZone)
  if (!parentZoneRect || !childZoneRect) return null

  const seamClientY = ZoneMath.calc_AvgMidY(parentZoneRect, childZoneRect)
  const parentRect = SvgUtils.get_Rect(parentEl)
  const seamClientX = (parentRect.left + parentRect.right) / 2
  const pt = SvgUtils.to_Local(
    parentEl,
    seamClientX,
    seamClientY
  )
  if (!pt) return null
  return pt.y
}

export function apply_ChainMiddles(blockRegistry, getDataForBlock){
  for (const block of blockRegistry.values()){
    const data = getDataForBlock(block)
    if (!data || !block.element) continue
    block.Zones = ZoneModule.Zone.buildForBlock(data, block.element)
  }

  for (const cBlock of blockRegistry.values()){
    if (cBlock.type !== 'c-block' || !cBlock.innerStackHeadUUID) continue
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID)
    if (!innerHead || !Array.isArray(innerHead.Zones)) continue
    const innerTail = StackChainDrag.find_StackTail(
      blockRegistry,
      innerHead
    )
    if (!innerTail || !Array.isArray(innerTail.Zones)) continue

    innerHead.Zones = innerHead.Zones.filter(z => z.type !== 'top')
    if (innerTail.blockUUID === innerHead.blockUUID){
      innerHead.Zones = innerHead.Zones.filter(z => z.type !== 'bottom')
    } else {
      innerTail.Zones = innerTail.Zones.filter(z => z.type !== 'bottom')
    }
  }

  for (const child of blockRegistry.values()){
    if (!child.parentUUID) continue
    const parent = blockRegistry.get(child.parentUUID)
    if (!parent || !parent.element || !child.element) continue
    if (parent.nextUUID !== child.blockUUID) continue

    const parentData = getDataForBlock(parent)
    const childData = getDataForBlock(child)
    if (!parentData || !childData) continue

    const middle = build_MiddleZone(parent, child, parentData, childData)
    if (!middle) continue

    parent.Zones = parent.Zones.filter(z => z.type !== 'bottom')
    child.Zones = child.Zones.filter(z => z.type !== 'top')
    parent.Zones.push(middle)
  }

  for (const cBlock of blockRegistry.values()){
    if (cBlock.type !== 'c-block' || !cBlock.innerStackHeadUUID) continue
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID)
    if (!innerHead || !innerHead.element || !cBlock.element) continue
    const data = getDataForBlock(cBlock)
    if (!data) continue
    const g = ZoneModule.Zone.getLocalGeometry(data, cBlock.element)
    const rect = CBlockInnerGeometry.build_TopInnerZone(
      g,
      cBlock.element,
      innerHead.element
    )
    const zones = cBlock.Zones
    if (!Array.isArray(zones)) continue
    const idx = zones.findIndex(z => z.type === 'top-inner')
    if (idx >= 0){
      cBlock.Zones[idx] = new ZoneModule.Zone(rect)
    }

    cBlock.Zones = cBlock.Zones.filter(z => z.type !== 'bottom-inner')
    const innerTail = StackChainDrag.find_StackTail(
      blockRegistry,
      innerHead
    )
    if (innerTail && innerTail.element && innerTail.type !== 'stop-block'){
      const bottomRect = CBlockInnerGeometry.build_BottomInnerZone(
        cBlock.element,
        innerTail.element,
        innerTail.type,
        g
      )
      if (bottomRect){
        cBlock.Zones.push(new ZoneModule.Zone(bottomRect))
      }
    }
  }
  ScratchCallTrace.record_Trace('applyStackChainMiddles', {
    registryBlockCount: blockRegistry.size,
  })
}

function is_SpreadExcluded(blockUUID, exclude){
  if (exclude == null) return false
  if (typeof exclude === 'string') return blockUUID === exclude
  if (exclude instanceof Set) return exclude.has(blockUUID)
  if (Array.isArray(exclude)) return exclude.includes(blockUUID)
  return false
}

export function clear_ChainSpread(blockRegistry, excludeBlockUUID = null){
  for (const workspaceBlock of blockRegistry.values()){
    if (!workspaceBlock.element) continue
    if (is_SpreadExcluded(workspaceBlock.blockUUID, excludeBlockUUID)) continue

    workspaceBlock.element.setAttribute(
      'transform',
      `translate(${workspaceBlock.x}, ${workspaceBlock.y})`
    )
  }
}

export function set_ChainSpread_Below(
  blockRegistry,
  pivotChildUUID,
  deltaY,
  excludeBlockUUID = null
){
  if (!deltaY){
    clear_ChainSpread(blockRegistry, excludeBlockUUID)
    return
  }
  clear_ChainSpread(blockRegistry, excludeBlockUUID)
  for (const tailBlock of StackChainDrag.collect_Chain(
    blockRegistry,
    pivotChildUUID
  )){
    if (is_SpreadExcluded(tailBlock.blockUUID, excludeBlockUUID)){
      continue
    }
    const spreadOffsetY = SnapMath.calc_SpreadTailY(tailBlock.y, deltaY)
    tailBlock.element.setAttribute(
      'transform',
      `translate(${tailBlock.x}, ${spreadOffsetY})`
    )
  }
}

export function set_CblockStack_Spread(
  blockRegistry,
  cBlock,
  deltaY,
  excludeBlockUUID = null
){
  if (!cBlock || !cBlock.innerStackHeadUUID || !deltaY || !blockRegistry) return
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID)
  if (!innerHead) return
  for (const b of StackChainDrag.collect_Chain(
    blockRegistry,
    innerHead
  )){
    if (!b || !b.element) continue
    if (is_SpreadExcluded(b.blockUUID, excludeBlockUUID)) continue
    b.element.setAttribute('transform', `translate(${b.x}, ${b.y + deltaY})`)
  }
}

export function calc_GhostSpreadY(draggedElement){
  const bboxHeight = SvgUtils.get_Height(draggedElement)
  if (!bboxHeight) return 0
  return (
    bboxHeight +
    SnapMath.calc_SnapExtraY_Spread(draggedElement)
  )
}

function build_MiddleZone(parent, child, parentData, childData){
  const childTop = ZoneModule.Zone.zoneByType(child.Zones, 'top')
  const parentBottom = ZoneModule.Zone.zoneByType(parent.Zones, 'bottom')
  if (!childTop || !parentBottom) return null

  const seamY = calc_ZoneSeamY(
    parent.element,
    child.element,
    parentBottom,
    childTop
  )
  if (seamY == null) return null

  const inCBlock =
    parentData.type === 'c-block' || childData.type === 'c-block'

  return new ZoneModule.Zone({
    type: 'middle',
    x: parentBottom.x,
    y: seamY,
    width: parentBottom.width,
    height: Global.ZONE_HEIGHT,
    inCBlock,
    linkedChildUUID: child.blockUUID,
  })
}
