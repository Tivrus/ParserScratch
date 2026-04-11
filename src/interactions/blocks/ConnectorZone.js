import {
  CONNECTOR_THRESHOLD,
  CONNECTOR_OFFSETS,
  CONNECTOR_SOCKET_HEIGHT,
  DEFAULT_BLOCK_HEIGHT,
} from '../../constans/Global.js';
import {
  getBoundingClientRectRounded,
  clientPointToElementLocal,
} from '../../utils/SvgUtils.js';

// Connector hit bands in the block group's local coordinate system.
export class ConnectorZone {
  constructor({ type, x, y, width, height }) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
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
    switch (data.type) {
      case 'default-block':
        return ConnectorZone.#stackZonesForDefaultBlock(data, blockElement);
      default:
        return [];
    }
  }

  static #bboxFallback(data) {
    return {
      connectorX: 0,
      width: data.width ?? 0,
      topBaseY: 0,
      bottomBaseY: DEFAULT_BLOCK_HEIGHT,
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

    const r = getBoundingClientRectRounded(blockElement);
    const topLeft = clientPointToElementLocal(blockElement, r.left, r.top);
    const topRight = clientPointToElementLocal(blockElement, r.right, r.top);
    const bottomLeft = clientPointToElementLocal(blockElement, r.left, r.bottom);
    const widthFromClient = Math.abs(topRight.x - topLeft.x);
    return {
      connectorX: topLeft.x,
      width: widthFromClient > 0 ? widthFromClient : b.width,
      topBaseY: topLeft.y - CONNECTOR_THRESHOLD,
      bottomBaseY: bottomLeft.y,
    };
  }

  // Stack connector zones for a default block.
  static #stackZonesForDefaultBlock(data, blockElement) {
    const { connectorX, width, topBaseY, bottomBaseY } =
      ConnectorZone.#readLocalGeometry(data, blockElement);

    return [
      new ConnectorZone({
        type: 'top',
        x: connectorX,
        y: topBaseY + CONNECTOR_OFFSETS.TOP_Y,
        width,
        height: CONNECTOR_THRESHOLD,
      }),
      new ConnectorZone({
        type: 'bottom',
        x: connectorX,
        y: bottomBaseY - CONNECTOR_SOCKET_HEIGHT + CONNECTOR_OFFSETS.BOTTOM_Y,
        width,
        height: CONNECTOR_THRESHOLD,
      }),
    ];
  }
}
