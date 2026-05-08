import * as Global from '../constants/Global.js';

/**
 * Локальная «база» верхней части блока для зон коннектора: верх bbox в локальных координатах
 * минус толщина hit-полосы — зона top рисуется выше видимого тела.
 */
export function connectorLocalTopBaseY(localTopLeftY) {
  return localTopLeftY - Global.CONNECTOR_THRESHOLD;
}

/**
 * Локальная Y верхнего края зоны **top** относительно `topBaseY`.
 */
export function connectorLocalTopZoneY(topBaseY) {
  return topBaseY + Global.CONNECTOR_OFFSETS.TOP_Y;
}

/**
 * Локальная Y верхнего края зоны **bottom**: нижняя база минус визуальная глубина сокета + оффсет.
 */
export function connectorLocalBottomZoneY(bottomBaseY) {
  return (
    bottomBaseY -
    Global.CONNECTOR_SOCKET_HEIGHT +
    Global.CONNECTOR_OFFSETS.BOTTOM_Y
  );
}
