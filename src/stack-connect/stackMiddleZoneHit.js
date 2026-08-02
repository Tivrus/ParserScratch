import * as MiddleZoneBand from '../calculations/MiddleZoneClientBandMath.js';
import * as ZoneClientRectMath from '../calculations/ZoneClientRectMath.js';

import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

export function find_MiddleZone_OnParent(parentBlock, childBlock){
  if (!parentBlock || !childBlock) return null;
  const zones = parentBlock.Zones;
  if (!zones || typeof zones.find !== 'function') return null;
  const middleZoneMatch = zones.find(
    zone =>
      zone.type === 'middle' && zone.linkedChildUUID === childBlock.blockUUID
  );
  if (middleZoneMatch === undefined) return null;
  return middleZoneMatch;
}

export function calc_MiddleZone_HitBand_ClientRect(
  parentBlock,
  childBlock,
  middleZone
){
  if (
    !parentBlock ||
    !parentBlock.element ||
    !childBlock ||
    !childBlock.element ||
    !middleZone
  ){
    return null;
  }
  const middleZoneClientRect = ZoneClientRectMath.calc_Zone_LocalRect_ToClientAABB(
    parentBlock.element,
    middleZone
  );
  if (!middleZoneClientRect) return null;
  const parentClientRect = SvgUtils.getBoundingClientRectRounded(parentBlock.element);
  const childClientRect = SvgUtils.getBoundingClientRectRounded(childBlock.element);
  const seamCenterY = MiddleZoneBand.calc_MiddleZone_SeamCenterY(
    parentClientRect,
    childClientRect
  );
  const verticalBounds = MiddleZoneBand.build_MiddleZone_HitBandBounds(
    seamCenterY,
    middleZone.height
  );
  return {
    left: middleZoneClientRect.left,
    right: middleZoneClientRect.right,
    top: verticalBounds.top,
    bottom: verticalBounds.bottom,
  };
}
