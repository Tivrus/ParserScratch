export function calc_DomClientRect_VerticalMidpointY(clientRect){
  return (clientRect.top + clientRect.bottom) / 2;
}

export function calc_VerticalSeamCenter_ClientY(
  parentZoneClientRect,
  childZoneClientRect
){
  const parentMidY = calc_DomClientRect_VerticalMidpointY(
    parentZoneClientRect
  );
  const childMidY = calc_DomClientRect_VerticalMidpointY(childZoneClientRect);
  return (parentMidY + childMidY) / 2;
}
