import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as ZoneModule from '../blocks/ZoneModule.js';
import * as ZoneClientRectMath from '../calculations/ZoneClientRectMath.js';
import * as StackMiddleZoneHit from './stackMiddleZoneHit.js';
import * as StackTopBottomZoneHit from './stackTopBottomZoneHit.js';
import * as StackChainGraph from './stackChainGraph.js';

export function resolve_DraggedBlockUUID(draggedElement, grabManager){
  let grabWorkspaceBlockUUID = '';
  if (
    grabManager &&
    typeof grabManager.getWorkspaceBlockGrabUUID === 'function'
  ){
    const uuidFromGrab = grabManager.getWorkspaceBlockGrabUUID();
    if (uuidFromGrab){
      grabWorkspaceBlockUUID = uuidFromGrab;
    }
  }
  if (grabWorkspaceBlockUUID){
    return grabWorkspaceBlockUUID;
  }
  return SvgUtils.readWorkspaceBlockUUID(draggedElement) || '';
}

export function can_Snap_BlockBelow(
  draggedBlock,
  anchorBlock,
  blockRegistry = null
){
  if (!ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'top')) return false;
  if (anchorBlock && anchorBlock.nextUUID) return false;
  const resolvedZone = StackTopBottomZoneHit.resolve_Zone_BelowAnchor(
    anchorBlock,
    blockRegistry
  );
  if (!resolvedZone) return false;
  return StackTopBottomZoneHit.hit_DraggedBlock_IntersectsZone(
    draggedBlock,
    resolvedZone
  );
}

export function can_Snap_BlockAbove(
  draggedBlock,
  anchorBlock,
  blockRegistry = null
){
  if (!ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'bottom')) return false;
  const resolvedZone = StackTopBottomZoneHit.resolve_Zone_AboveAnchor(
    anchorBlock,
    blockRegistry
  );
  if (!resolvedZone) return false;
  return StackTopBottomZoneHit.hit_DraggedBlock_IntersectsZone(
    draggedBlock,
    resolvedZone
  );
}

export function can_Snap_PrefixChainOnHead(
  draggedBlock,
  otherHeadBlock,
  blockRegistry
){
  if (
    !draggedBlock ||
    !draggedBlock.element ||
    !otherHeadBlock ||
    !otherHeadBlock.element ||
    !blockRegistry
  ){
    return false;
  }
  if (
    otherHeadBlock.type === 'c-block' &&
    StackChainGraph.is_Block_OnCBlockInnerStack(
      draggedBlock,
      otherHeadBlock,
      blockRegistry
    )
  ){
    return false;
  }
  if (!draggedBlock.nextUUID) return false;
  if (otherHeadBlock.parentUUID) return false;
  const topZone = ZoneModule.Zone.zoneByType(otherHeadBlock.Zones, 'top');
  if (!topZone) return false;

  const heldChainTail = StackChainGraph.find_StackTail_Block(
    blockRegistry,
    draggedBlock
  );
  if (!heldChainTail || heldChainTail.type === 'stop-block') return false;

  const draggedClientRect = SvgUtils.getBoundingClientRectRounded(draggedBlock.element);
  const topZoneClientRect = ZoneClientRectMath.calc_Zone_LocalRect_ToClientAABB(
    otherHeadBlock.element,
    topZone
  );
  if (!topZoneClientRect) return false;
  return ZoneClientRectMath.calc_ClientRects_Intersect(
    draggedClientRect,
    topZoneClientRect
  );
}

export function is_MiddleZoneInsert_Eligible(
  draggedBlock,
  parentBlock,
  childBlock,
  blockRegistry = null
){
  if (
    !draggedBlock ||
    !draggedBlock.element ||
    !parentBlock ||
    !parentBlock.element ||
    !childBlock ||
    !childBlock.element
  ){
    return false;
  }
  if (draggedBlock.parentUUID || draggedBlock.nextUUID) return false;

  if (
    draggedBlock.type === 'c-block' &&
    blockRegistry &&
    (StackChainGraph.is_Block_OnCBlockInnerStack(
      parentBlock,
      draggedBlock,
      blockRegistry
    ) ||
      StackChainGraph.is_Block_OnCBlockInnerStack(
        childBlock,
        draggedBlock,
        blockRegistry
      ))
  ){
    return false;
  }

  if (blockRegistry){
    for (const end of [parentBlock, childBlock]){
      if (
        end &&
        end.type === 'c-block' &&
        StackChainGraph.is_Block_OnCBlockInnerStack(
          draggedBlock,
          end,
          blockRegistry
        )
      ){
        return false;
      }
    }
  }

  const draggedHasTopZone = Boolean(
    ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'top')
  );
  const draggedHasBottomZone = Boolean(
    ZoneModule.Zone.zoneByType(draggedBlock.Zones, 'bottom')
  );
  const draggedBlockType = draggedBlock.type;
  if (draggedBlockType === 'start-block'){
    if (!draggedHasBottomZone) return false;
  } else if (draggedBlockType === 'stop-block'){
    if (!draggedHasTopZone) return false;
  } else {
    if (!draggedHasTopZone || !draggedHasBottomZone) return false;
  }

  if (
    parentBlock.nextUUID !== childBlock.blockUUID ||
    childBlock.parentUUID !== parentBlock.blockUUID
  ){
    return false;
  }
  return Boolean(
    StackMiddleZoneHit.find_MiddleZone_OnParent(parentBlock, childBlock)
  );
}

export function can_Snap_MiddleZoneInsert(
  draggedBlock,
  parentBlock,
  childBlock,
  blockRegistry
){
  if (
    !is_MiddleZoneInsert_Eligible(
      draggedBlock,
      parentBlock,
      childBlock,
      blockRegistry
    )
  ){
    return false;
  }
  const middleZone = StackMiddleZoneHit.find_MiddleZone_OnParent(
    parentBlock,
    childBlock
  );
  if (!middleZone){
    return false;
  }
  const draggedClientRect = SvgUtils.getBoundingClientRectRounded(draggedBlock.element);
  const middleBandClientRect =
    StackMiddleZoneHit.calc_MiddleZone_HitBand_ClientRect(
      parentBlock,
      childBlock,
      middleZone
    );
  if (!middleBandClientRect){
    return false;
  }
  return ZoneClientRectMath.calc_ClientRects_Intersect(
    draggedClientRect,
    middleBandClientRect
  );
}

export function list_StackSnapCandidates(
  draggedElement,
  blockRegistry,
  grabManager
){
  const draggedBlockUUID = resolve_DraggedBlockUUID(
    draggedElement,
    grabManager
  );
  if (!draggedBlockUUID) return [];

  const draggedBlock = blockRegistry.get(draggedBlockUUID);
  let isCapStackBlock = false;
  if (draggedBlock){
    if (
      draggedBlock.type === 'start-block' ||
      draggedBlock.type === 'stop-block'
    ){
      isCapStackBlock = true;
    }
  }
  const zoneCount =
    draggedBlock && draggedBlock.Zones && draggedBlock.Zones.length;
  if (!draggedBlock || (!zoneCount && !isCapStackBlock)) return [];

  const candidates = [];

  for (const [otherBlockUUID, otherBlock] of blockRegistry){
    if (otherBlockUUID === draggedBlockUUID) continue;
    if (!otherBlock || !otherBlock.element) continue;
    const otherZones = otherBlock.Zones;
    if (!otherZones || !otherZones.length) continue;

    if (
      draggedBlock.type === 'c-block' &&
      StackChainGraph.is_Block_OnCBlockInnerStack(
        otherBlock,
        draggedBlock,
        blockRegistry
      )
    ){
      continue;
    }

    if (
      otherBlock.type === 'c-block' &&
      StackChainGraph.is_Block_OnCBlockInnerStack(
        draggedBlock,
        otherBlock,
        blockRegistry
      )
    ){
      continue;
    }

    const prefixChainOnOtherHead =
      blockRegistry &&
      can_Snap_PrefixChainOnHead(draggedBlock, otherBlock, blockRegistry);
    const canSnapBelow =
      !prefixChainOnOtherHead &&
      can_Snap_BlockBelow(draggedBlock, otherBlock, blockRegistry);
    const canSnapAbove =
      !prefixChainOnOtherHead &&
      can_Snap_BlockAbove(draggedBlock, otherBlock, blockRegistry);
    if (prefixChainOnOtherHead || canSnapBelow || canSnapAbove){
      candidates.push({
        snapUUID: otherBlockUUID,
        below: canSnapBelow,
        above: canSnapAbove,
        prefixOnHead: prefixChainOnOtherHead,
      });
    }
  }

  for (const childBlock of blockRegistry.values()){
    if (childBlock.blockUUID === draggedBlockUUID || !childBlock.parentUUID)
      continue;
    const parentBlock = blockRegistry.get(childBlock.parentUUID);
    if (!parentBlock || !parentBlock.element || !childBlock.element) continue;

    if (
      can_Snap_MiddleZoneInsert(
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
      });
    }
  }

  return drop_BelowAbove_DuplicatingMiddleZone(candidates);
}

function drop_BelowAbove_DuplicatingMiddleZone(candidates){
  const middleChildUUIDByParentUUID = new Map();
  for (const candidate of candidates){
    if (candidate.middle && candidate.parentUUID != null){
      middleChildUUIDByParentUUID.set(
        candidate.parentUUID,
        candidate.snapUUID
      );
    }
  }
  if (middleChildUUIDByParentUUID.size === 0){
    return candidates;
  }

  const middleChildUUIDSet = new Set(middleChildUUIDByParentUUID.values());

  const filteredCandidates = [];
  for (const candidate of candidates){
    if (candidate.middle){
      filteredCandidates.push(candidate);
      continue;
    }
    let keepBelow = candidate.below;
    let keepAbove = candidate.above;
    if (keepBelow && middleChildUUIDByParentUUID.has(candidate.snapUUID)){
      keepBelow = false;
    }
    if (keepAbove && middleChildUUIDSet.has(candidate.snapUUID)){
      keepAbove = false;
    }
    if (keepBelow || keepAbove || candidate.prefixOnHead){
      filteredCandidates.push({
        ...candidate,
        below: keepBelow,
        above: keepAbove,
      });
    }
  }
  return filteredCandidates;
}
