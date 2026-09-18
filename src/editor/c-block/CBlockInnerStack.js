import * as StackChainDrag from '../../blocks/StackChainDrag.js'
import * as ZoneModule from '../../blocks/ZoneModule.js'
import * as ZoneMath from '../../calculations/ZoneMath.js'
import * as StackSnap from '../stack-connect/StackSnap.js'
import * as SvgUtils from '../../utils/SvgUtils.js'
import { calc_CblockInnerGhostPos } from './CBlockInnerGeometry.js'

export function layout_CblockStack(blockRegistry, cBlock){
  if (!cBlock?.innerStackHeadUUID || !cBlock.element) return

  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID)
  const position = calc_CblockInnerGhostPos(cBlock)
  if (!innerHead?.element || !position) return

  innerHead.setPosition(Math.round(position.x), Math.round(position.y))
  StackSnap.layout_StackFromHead(innerHead, blockRegistry)

  for (const block of StackChainDrag.collect_Chain(blockRegistry, innerHead)){
    if (block.type === 'c-block'){
      layout_CblockStack(blockRegistry, block)
    }
  }
}

export function layout_AllCblockStacks(blockRegistry){
  for (const block of blockRegistry.values()){
    if (block.parentUUID != null) continue

    for (const chainBlock of StackChainDrag.collect_Chain(blockRegistry, block)){
      if (chainBlock.type === 'c-block'){
        layout_CblockStack(blockRegistry, chainBlock)
      }
    }
  }
}

function is_CblockInnerStackConflict(draggedBlock, cBlock, blockRegistry){
  return (
    StackChainDrag.is_OnInnerStack(draggedBlock, cBlock, blockRegistry) ||
    (draggedBlock.type === 'c-block' &&
      StackChainDrag.is_OnInnerStack(cBlock, draggedBlock, blockRegistry))
  )
}

function find_InnerHit(zoneType, draggedBlock, draggedElement, blockRegistry){
  if (!draggedBlock?.element || !draggedElement || !blockRegistry) return null

  const draggedClientRect = SvgUtils.get_Rect(draggedElement)
  if (!draggedClientRect) return null

  for (const cBlock of blockRegistry.values()){
    if (cBlock.type !== 'c-block' || !cBlock.element) continue
    if (cBlock.blockUUID === draggedBlock.blockUUID) continue
    if (is_CblockInnerStackConflict(draggedBlock, cBlock, blockRegistry)){
      continue
    }

    const zone = ZoneModule.Zone.zoneByType(cBlock.Zones, zoneType)
    const zoneClientRect = zone && ZoneMath.calc_ZoneClientRect(cBlock.element, zone)
    if (zoneClientRect && ZoneMath.is_RectsOverlap(draggedClientRect, zoneClientRect)){
      return { cBlock, zone }
    }
  }
  return null
}

export function find_TopInnerHit(draggedBlock, draggedElement, blockRegistry){
  return find_InnerHit('top-inner', draggedBlock, draggedElement, blockRegistry)
}

export function find_BottomInnerHit(draggedBlock, draggedElement, blockRegistry){
  return find_InnerHit('bottom-inner', draggedBlock, draggedElement, blockRegistry)
}

export function is_TopInnerEligible(draggedBlock){
  return Boolean(
    draggedBlock?.element &&
      draggedBlock.type !== 'start-block' &&
      ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'top')
  )
}

export function resolve_InnerSnap(
  candidates,
  draggedBlock,
  draggedElement,
  blockRegistry
){
  const standardSnap = StackSnap.pick_Snap(candidates)
  if (standardSnap?.mode === 'middle' || !is_TopInnerEligible(draggedBlock)){
    return standardSnap
  }

  const bottomHit = find_BottomInnerHit(
    draggedBlock,
    draggedElement,
    blockRegistry
  )
  if (bottomHit){
    return { snapUUID: bottomHit.cBlock.blockUUID, mode: 'bottomInner' }
  }

  const topHit = find_TopInnerHit(
    draggedBlock,
    draggedElement,
    blockRegistry
  )
  return topHit
    ? { snapUUID: topHit.cBlock.blockUUID, mode: 'topInner' }
    : standardSnap
}
