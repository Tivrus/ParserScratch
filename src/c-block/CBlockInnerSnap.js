import * as ZoneModule from '../blocks/ZoneModule.js';
import * as ZoneClientRectMath from '../calculations/ZoneClientRectMath.js';
import * as StackChainGraph from '../stack-connect/stackChainGraph.js';
import * as StackSnapCandidates from '../stack-connect/stackSnapCandidates.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

function is_CblockInnerStackConflict(
  draggedBlock,
  cBlock,
  blockRegistry
){
  return (
    StackChainGraph.is_Block_OnCBlockInnerStack(
      draggedBlock,
      cBlock,
      blockRegistry
    ) ||
    (draggedBlock.type === 'c-block' &&
      StackChainGraph.is_Block_OnCBlockInnerStack(
        cBlock,
        draggedBlock,
        blockRegistry
      ))
  );
}

export function find_CblockTopInnerZone_Hit(
  draggedBlock,
  draggedElement,
  blockRegistry
){
  if (
    !draggedBlock ||
    !draggedBlock.element ||
    !draggedElement ||
    !blockRegistry
  ){
    return null;
  }
  const draggedClientRect = SvgUtils.getBoundingClientRectRounded(draggedElement);
  if (!draggedClientRect) return null;

  for (const block of blockRegistry.values()){
    if (block.type !== 'c-block' || !block.element) continue;
    if (block.blockUUID === draggedBlock.blockUUID) continue;
    if (is_CblockInnerStackConflict(draggedBlock, block, blockRegistry)) continue;

    const zone = ZoneModule.Zone.zoneByType(block.Zones, 'top-inner');
    if (!zone) continue;

    const zoneClientRect =
      ZoneClientRectMath.calc_Zone_LocalRect_ToClientAABB(block.element, zone);
    if (
      zoneClientRect &&
      ZoneClientRectMath.calc_ClientRects_Intersect(
        draggedClientRect,
        zoneClientRect
      )
    ){
      return { cBlock: block, zone };
    }
  }
  return null;
}

export function find_CblockBottomInnerZone_Hit(
  draggedBlock,
  draggedElement,
  blockRegistry
){
  if (!draggedBlock || !draggedElement || !blockRegistry) return null;
  const draggedClientRect = SvgUtils.getBoundingClientRectRounded(draggedElement);
  if (!draggedClientRect) return null;

  for (const block of blockRegistry.values()){
    if (block.type !== 'c-block' || !block.element) continue;
    if (block.blockUUID === draggedBlock.blockUUID) continue;
    if (is_CblockInnerStackConflict(draggedBlock, block, blockRegistry)) continue;

    const zone = ZoneModule.Zone.zoneByType(block.Zones, 'bottom-inner');
    if (!zone) continue;

    const zoneClientRect =
      ZoneClientRectMath.calc_Zone_LocalRect_ToClientAABB(block.element, zone);
    if (
      zoneClientRect &&
      ZoneClientRectMath.calc_ClientRects_Intersect(
        draggedClientRect,
        zoneClientRect
      )
    ){
      return { cBlock: block, zone };
    }
  }
  return null;
}

export function is_CblockTopInnerSnap_Eligible(draggedBlock){
  if (!draggedBlock || !draggedBlock.element) return false;
  if (draggedBlock.type === 'start-block') return false;
  return Boolean(ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'top'));
}

export function resolve_CblockInnerSnap_WithTopInnerPriority(
  candidates,
  draggedBlock,
  draggedElement,
  blockRegistry
){
  const standard = StackSnapCandidates.pick_StackSnap_FromCandidates(candidates);
  if (!draggedBlock || !draggedElement || !blockRegistry) return standard;
  if (standard && standard.mode === 'middle') return standard;

  if (is_CblockTopInnerSnap_Eligible(draggedBlock)){
    const bottomHit = find_CblockBottomInnerZone_Hit(
      draggedBlock,
      draggedElement,
      blockRegistry
    );
    if (bottomHit){
      return { snapUUID: bottomHit.cBlock.blockUUID, mode: 'bottomInner' };
    }
  }

  if (!is_CblockTopInnerSnap_Eligible(draggedBlock)) return standard;

  const topHit = find_CblockTopInnerZone_Hit(
    draggedBlock,
    draggedElement,
    blockRegistry
  );
  if (!topHit) return standard;

  return { snapUUID: topHit.cBlock.blockUUID, mode: 'topInner' };
}
