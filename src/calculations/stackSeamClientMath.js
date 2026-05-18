export function calcDomClientRectVerticalMidpointY(clientRect){
  return (clientRect.top + clientRect.bottom) / 2;
}

export function calcVerticalSeamCenterClientYBetweenZoneRects(
    parentZoneClientRect,
    childZoneClientRect
  ){
  const parentMidY = calcDomClientRectVerticalMidpointY(parentZoneClientRect);
  const childMidY = calcDomClientRectVerticalMidpointY(childZoneClientRect);
  return (parentMidY + childMidY) / 2;
}
