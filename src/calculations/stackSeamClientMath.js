/**
 * Усреднения по client-rect для шва стека (middle): центр по вертикали полосы коннектора.
 */

/**
 * @param {{ top: number; bottom: number }} clientRect
 * @returns {number}
 */
export function clientRectVerticalCenterY(clientRect) {
  return (clientRect.top + clientRect.bottom) / 2;
}

/**
 * Клиентская Y центра **шва** между нижней зоной родителя и верхней зоной ребёнка.
 */
export function stackSeamCenterClientY(parentZoneClientRect, childZoneClientRect) {
  const parentCenterY = clientRectVerticalCenterY(parentZoneClientRect);
  const childCenterY = clientRectVerticalCenterY(childZoneClientRect);
  return (parentCenterY + childCenterY) / 2;
}
