/**
 * Полоса middle в **клиентских** координатах: горизонталь берётся из зоны на родителе,
 * вертикаль — симметрично вокруг шва между низом родителя и верхом ребёнка.
 */

/**
 * @param {{ top: number; bottom: number }} parentBlockClientRect
 * @param {{ top: number; bottom: number }} childBlockClientRect
 */
export function middleSeamCenterClientY(
  parentBlockClientRect,
  childBlockClientRect
) {
  return (parentBlockClientRect.bottom + childBlockClientRect.top) / 2;
}

/**
 * Вертикальные границы полосы высотой `middleZoneHeightPx`, центрированной на `seamCenterClientY`.
 */
export function symmetricVerticalBandClientBounds(
  seamCenterClientY,
  middleZoneHeightPx
) {
  const halfBandPx = middleZoneHeightPx / 2;
  return {
    top: seamCenterClientY - halfBandPx,
    bottom: seamCenterClientY + halfBandPx,
  };
}
