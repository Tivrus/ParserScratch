import * as Global from '../constants/Global.js';
import * as ScratchCallTrace from '../infrastructure/debug/scratchCallTrace.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as StackChainGraph from '../stack-connect/stackChainGraph.js';
import * as StackChainDrag from './StackChainDrag.js';
import * as ZoneModule from './ZoneModule.js';
import * as CBlockZoneBuild from '../c-block/CBlockZoneBuild.js';
import * as ChainSpreadMath from '../calculations/StackChainSpreadMath.js';
import * as StackSeamClientMath from '../calculations/StackSeamClientMath.js';
import * as StackSnapStartBlockOffsets from '../calculations/StackSnapStartBlockMath.js';
import * as ZoneClientRectMath from '../calculations/ZoneClientRectMath.js';

function jointSeamCenterLocalOnParent(
  parentEl,
  childEl,
  parentBottomZone,
  childTopZone
){
  const rParent = ZoneClientRectMath.calc_Zone_LocalRect_ToClientAABB(parentEl, parentBottomZone);
  const rChild = ZoneClientRectMath.calc_Zone_LocalRect_ToClientAABB(childEl, childTopZone);
  if (!rParent || !rChild){
    return null;
  }
  const seamClientY =
    StackSeamClientMath.calc_VerticalSeamCenter_ClientY(
      rParent,
      rChild
    );
  const parentRect = SvgUtils.getBoundingClientRectRounded(parentEl);
  const seamClientX = (parentRect.left + parentRect.right) / 2;
  const pt = SvgUtils.clientPointToElementLocal(
    parentEl,
    seamClientX,
    seamClientY
  );
  if (!pt) return null;
  return pt.y;
}

export function apply_StackChain_Middles(blockRegistry, getDataForBlock){
  for (const block of blockRegistry.values()){
    const data = getDataForBlock(block);
    if (!data || !block.element) continue;
    block.Zones = ZoneModule.Zone.buildForBlock(
      data,
      block.element
    );
  }

  for (const cBlock of blockRegistry.values()){
    if (cBlock.type !== 'c-block' || !cBlock.innerStackHeadUUID) continue;
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
    if (!innerHead || !Array.isArray(innerHead.Zones)) continue;
    const innerTail = StackChainGraph.find_StackTail_Block(blockRegistry, innerHead);
    if (!innerTail || !Array.isArray(innerTail.Zones)) continue;

    innerHead.Zones = innerHead.Zones.filter(
      z => z.type !== 'top'
    );
    if (innerTail.blockUUID === innerHead.blockUUID){
      innerHead.Zones = innerHead.Zones.filter(
        z => z.type !== 'bottom'
      );
    } else {
      innerTail.Zones = innerTail.Zones.filter(
        z => z.type !== 'bottom'
      );
    }
  }

  for (const child of blockRegistry.values()){
    if (!child.parentUUID) continue;
    const parent = blockRegistry.get(child.parentUUID);
    if (!parent || !parent.element || !child.element) continue;
    if (parent.nextUUID !== child.blockUUID) continue;

    const parentData = getDataForBlock(parent);
    const childData = getDataForBlock(child);
    if (!parentData || !childData) continue;

    const middle = buildMiddleZone(parent, child, parentData, childData);
    if (!middle) continue;

    parent.Zones = parent.Zones.filter(
      z => z.type !== 'bottom'
    );
    child.Zones = child.Zones.filter(z => z.type !== 'top');
    parent.Zones.push(middle);
  }

  for (const cBlock of blockRegistry.values()){
    if (cBlock.type !== 'c-block' || !cBlock.innerStackHeadUUID) continue;
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
    if (!innerHead || !innerHead.element || !cBlock.element) continue;
    const data = getDataForBlock(cBlock);
    if (!data) continue;
    const g = ZoneModule.Zone.getLocalGeometry(data, cBlock.element);
    const rect = CBlockZoneBuild.build_CblockZone_TopInner_ForBlock(
      g,
      cBlock.element,
      innerHead.element
    );
    const zones = cBlock.Zones;
    if (!Array.isArray(zones)) continue;
    const idx = zones.findIndex(z => z.type === 'top-inner');
    if (idx >= 0){
      cBlock.Zones[idx] = new ZoneModule.Zone(rect);
    }

    cBlock.Zones = cBlock.Zones.filter(z => z.type !== 'bottom-inner');
    const innerTail = StackChainGraph.find_StackTail_Block(blockRegistry, innerHead);
    if (innerTail && innerTail.element && innerTail.type !== 'stop-block'){
      const bottomRect = CBlockZoneBuild.build_CblockZone_BottomInner_ForBlock(
        cBlock.element,
        innerTail.element,
        innerTail.type,
        g
      );
      if (bottomRect){
        cBlock.Zones.push(new ZoneModule.Zone(bottomRect));
      }
    }
  }
  ScratchCallTrace.scratchCallRecord('applyStackChainMiddles', {
    registryBlockCount: blockRegistry.size,
  });
}

function getChainTailFromBlock(blockRegistry, startBlockUUID){
  const tailBlocks = [];
  let currentBlockUUID = startBlockUUID;
  const visitedUUIDs = new Set();
  while (currentBlockUUID && !visitedUUIDs.has(currentBlockUUID)){
    visitedUUIDs.add(currentBlockUUID);
    const block = blockRegistry.get(currentBlockUUID);
    if (!block || !block.element) break;
    tailBlocks.push(block);
    currentBlockUUID = block.nextUUID;
  }
  return tailBlocks;
}

function isSpreadExcluded(blockUUID, exclude){
  if (exclude == null) return false;
  if (typeof exclude === 'string') return blockUUID === exclude;
  if (exclude instanceof Set) return exclude.has(blockUUID);
  if (Array.isArray(exclude)) return exclude.includes(blockUUID);
  return false;
}

export function clear_ChainSpread(blockRegistry, excludeBlockUUID = null){
  for (const workspaceBlock of blockRegistry.values()){
    if (!workspaceBlock.element) continue;
    if (isSpreadExcluded(workspaceBlock.blockUUID, excludeBlockUUID)) continue;

    workspaceBlock.element.setAttribute(
      'transform',
      `translate(${workspaceBlock.x}, ${workspaceBlock.y})`
    );
  }
}

export function set_ChainSpread_Below(
  blockRegistry,
  pivotChildUUID,
  deltaY,
  excludeBlockUUID = null
){
  if (!deltaY){
    clear_ChainSpread(blockRegistry, excludeBlockUUID);
    return;
  }
  clear_ChainSpread(blockRegistry, excludeBlockUUID);
  for (const tailBlock of getChainTailFromBlock(
    blockRegistry,
    pivotChildUUID
  )){
    if (isSpreadExcluded(tailBlock.blockUUID, excludeBlockUUID)){
      continue;
    }
    const spreadOffsetY =
      ChainSpreadMath.calc_StackChain_MiddlePreviewTail_WorldY(
        tailBlock.y,
        deltaY
      );
    tailBlock.element.setAttribute(
      'transform',
      `translate(${tailBlock.x}, ${spreadOffsetY})`
    );
  }
}

export function set_CBlockInnerStack_PreviewSpread(
  blockRegistry,
  cBlock,
  deltaY,
  excludeBlockUUID = null
){
  if (!cBlock || !cBlock.innerStackHeadUUID || !deltaY || !blockRegistry) return;
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
  if (!innerHead) return;
  for (const b of StackChainDrag.collect_StackChain_BlocksFromHead(
    blockRegistry,
    innerHead
  )){
    if (!b || !b.element) continue;
    if (isSpreadExcluded(b.blockUUID, excludeBlockUUID)) continue;
    b.element.setAttribute(
      'transform',
      `translate(${b.x}, ${b.y + deltaY})`
    );
  }
}

export function clear_CBlockInnerStack_PreviewSpread(blockRegistry, cBlock){
  if (!cBlock || !cBlock.innerStackHeadUUID || !blockRegistry) return;
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
  if (!innerHead) return;
  for (const b of StackChainDrag.collect_StackChain_BlocksFromHead(
    blockRegistry,
    innerHead
  )){
    if (!b || !b.element) continue;
    b.element.setAttribute('transform', `translate(${b.x}, ${b.y})`);
  }
}

export function calc_GhostSpread_DeltaY(draggedElement){
  const bboxHeight = SvgUtils.getElementBBoxHeight(draggedElement);
  if (!bboxHeight) return 0;
  return (
    bboxHeight + StackSnapStartBlockOffsets.calc_StackSnap_StopBlockGhost_ExtraY(draggedElement)
  );
}

function buildMiddleZone(parent, child, parentData, childData){
  const childTop = ZoneModule.Zone.zoneByType(
    child.Zones,
    'top'
  );
  const parentBottom = ZoneModule.Zone.zoneByType(
    parent.Zones,
    'bottom'
  );
  if (!childTop || !parentBottom){return null;}

  const seamY = jointSeamCenterLocalOnParent(
    parent.element,
    child.element,
    parentBottom,
    childTop
  );
  if (seamY == null){
    return null;
  }

  const inCBlock = parentData.type === 'c-block' || childData.type === 'c-block';

  return new ZoneModule.Zone({
    type: 'middle',
    x: parentBottom.x,
    y: ChainSpreadMath.calc_MiddleZone_HitBandTopLocalY(
      seamY
    ),
    width: parentBottom.width,
    height: Global.ZONE_HEIGHT,
    inCBlock,
    linkedChildUUID: child.blockUUID,
  });
}
