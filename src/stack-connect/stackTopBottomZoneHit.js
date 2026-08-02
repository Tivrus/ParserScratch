import * as ZoneModule from '../blocks/ZoneModule.js';
import * as ZoneClientRectMath from '../calculations/ZoneClientRectMath.js';
import * as StackMiddleZoneHit from './stackMiddleZoneHit.js';

import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

export function resolve_Zone_BelowAnchor(anchorBlock, blockRegistry){
  const bottomZone = ZoneModule.Zone.zoneByType(anchorBlock.Zones, 'bottom');
  if (bottomZone) return { el: anchorBlock.element, zone: bottomZone };
  if (blockRegistry && anchorBlock.nextUUID){
    const childBlock = blockRegistry.get(anchorBlock.nextUUID);
    const middleZone = childBlock
      ? StackMiddleZoneHit.find_MiddleZone_OnParent(anchorBlock, childBlock)
      : null;
    if (middleZone && anchorBlock && anchorBlock.element){
      return {
        el: anchorBlock.element,
        zone: middleZone,
        middlePair: { parent: anchorBlock, child: childBlock },
      };
    }
  }
  return null;
}

export function resolve_Zone_AboveAnchor(anchorBlock, blockRegistry){
  const topZone = ZoneModule.Zone.zoneByType(anchorBlock.Zones, 'top');
  if (topZone) return { el: anchorBlock.element, zone: topZone };
  if (blockRegistry && anchorBlock.parentUUID){
    const parentBlock = blockRegistry.get(anchorBlock.parentUUID);
    const middleZone = parentBlock
      ? StackMiddleZoneHit.find_MiddleZone_OnParent(parentBlock, anchorBlock)
      : null;
    if (middleZone && parentBlock && parentBlock.element){
      return {
        el: parentBlock.element,
        zone: middleZone,
        middlePair: { parent: parentBlock, child: anchorBlock },
      };
    }
  }
  return null;
}

export function hit_DraggedBlock_IntersectsZone(draggedBlock, resolvedZone){
  const draggedClientRect = SvgUtils.getBoundingClientRectRounded(draggedBlock.element);
  let zoneClientRect;
  if (
    resolvedZone.zone &&
    resolvedZone.zone.type === 'middle' &&
    resolvedZone.middlePair
  ){
    const { parent, child } = resolvedZone.middlePair;
    zoneClientRect = StackMiddleZoneHit.calc_MiddleZone_HitBand_ClientRect(
      parent,
      child,
      resolvedZone.zone
    );
  } else {
    zoneClientRect = ZoneClientRectMath.calc_Zone_LocalRect_ToClientAABB(
      resolvedZone.el,
      resolvedZone.zone
    );
  }
  if (!zoneClientRect) return false;
  return ZoneClientRectMath.calc_ClientRects_Intersect(
    draggedClientRect,
    zoneClientRect
  );
}
