import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

// Connector hit bands in the block group's local coordinate system.
export class ConnectorZone {
  static zoneByType(zones, type) {
    return zones?.find(z => z.type === type) ?? null;
  }

  constructor({ type, x, y, width, height, inCBlock, linkedChildUUID } = {}) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    if (type === 'middle') {
      this.inCBlock = Boolean(inCBlock);
      this.linkedChildUUID = linkedChildUUID ?? null;
    }
  }

  getAbsoluteRect(blockX, blockY) {
    return {
      x: blockX + this.x,
      y: blockY + this.y,
      width: this.width,
      height: this.height,
    };
  }

  static buildForBlock(data, blockElement) {
    const g = ConnectorZone.#readLocalGeometry(data, blockElement);
    const { connectorX, width, topBaseY, bottomBaseY } = g;
    switch (data.type) {
      case 'default-block':
      case 'c-block':
        return [
          ConnectorZone.#makeTopZone(connectorX, width, topBaseY),
          ConnectorZone.#makeBottomZone(connectorX, width, bottomBaseY),
        ];
      case 'start-block':
        return [ConnectorZone.#makeBottomZone(connectorX, width, bottomBaseY)];
      case 'stop-block':
        return [ConnectorZone.#makeTopZone(connectorX, width, topBaseY)];
      default:
        return [];
    }
  }

  // --- Geometry from DOM (fallback uses data.width / data.height) ---

  static #bboxFallback(data) {
    const h = data.height ?? Global.DEFAULT_BLOCK_HEIGHT;
    return {
      connectorX: 0,
      width: data.width ?? 0,
      topBaseY: 0,
      bottomBaseY: h,
    };
  }

  static #readLocalGeometry(data, blockElement) {
    const fallback = ConnectorZone.#bboxFallback(data);
    if (!blockElement || typeof blockElement.getBBox !== 'function') {
      return fallback;
    }

    let b;
    try {
      b = blockElement.getBBox();
    } catch {
      return fallback;
    }
    if (b.width <= 0 || b.height <= 0) return fallback;

    const r = SvgUtils.getBoundingClientRectRounded(blockElement);
    const topLeft = SvgUtils.clientPointToElementLocal(blockElement, r.left, r.top);
    const topRight = SvgUtils.clientPointToElementLocal(blockElement, r.right, r.top);
    const bottomLeft = SvgUtils.clientPointToElementLocal(blockElement, r.left, r.bottom);
    if (!topLeft || !topRight || !bottomLeft) return fallback;

    const widthFromClient = Math.abs(topRight.x - topLeft.x);
    return {
      connectorX: topLeft.x,
      width: widthFromClient > 0 ? widthFromClient : b.width,
      topBaseY: topLeft.y - Global.CONNECTOR_THRESHOLD,
      bottomBaseY: bottomLeft.y,
    };
  }

  // --- Stack zones ---

  static #makeTopZone(connectorX, width, topBaseY) {
    return new ConnectorZone({
      type: 'top',
      x: connectorX,
      y: topBaseY + Global.CONNECTOR_OFFSETS.TOP_Y,
      width,
      height: Global.CONNECTOR_THRESHOLD,
    });
  }

  static #makeBottomZone(connectorX, width, bottomBaseY) {
    return new ConnectorZone({
      type: 'bottom',
      x: connectorX,
      y: bottomBaseY - Global.CONNECTOR_SOCKET_HEIGHT + Global.CONNECTOR_OFFSETS.BOTTOM_Y,
      width,
      height: Global.CONNECTOR_THRESHOLD,
    });
  }

}
