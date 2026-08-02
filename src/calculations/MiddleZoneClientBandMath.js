export function calc_MiddleZone_SeamCenterY(
  parentZoneClientRect,
  childZoneClientRect
){
  const overlapTop = Math.max(
    parentZoneClientRect.top,
    childZoneClientRect.top
  );
  const overlapBottom = Math.min(
    parentZoneClientRect.bottom,
    childZoneClientRect.bottom
  );
  return (overlapTop + overlapBottom) / 2;
}

export function build_MiddleZone_HitBandBounds(
  seamCenterClientY,
  fullBandHeightPx
){
  const half = fullBandHeightPx / 2;
  return {
    top: seamCenterClientY - half,
    bottom: seamCenterClientY + half,
  };
}
