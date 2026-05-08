import * as CBlockTopInner from '../c-block/topInnerConnector.js';
import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as ConnLocal from '../calculations/connectorZoneLocalMath.js';

/** Полосы попадания коннекторов в локальной системе координат группы `<g>` блока. */
export class ConnectorZone {
  static zoneByType(zones, type) {
    if (!zones || typeof zones.find !== 'function') return null;
    const zoneMatch = zones.find(z => z.type === type);
    if (zoneMatch === undefined) return null;
    return zoneMatch;
  }

  /**
   * @param {{
   *   type?: string;
   *   x?: number;
   *   y?: number;
   *   width?: number;
   *   height?: number;
   *   inCBlock?: boolean;
   *   linkedChildUUID?: string | null;
   * }} [spec]
   */
  constructor(spec = {}) {
    this.type = spec.type;
    this.x = spec.x;
    this.y = spec.y;
    this.width = spec.width;
    this.height = spec.height;
    if (spec.type === 'middle') {
      this.inCBlock = Boolean(spec.inCBlock);
      let linkedChildId = null;
      if (spec.linkedChildUUID != null) {
        linkedChildId = spec.linkedChildUUID;
      }
      this.linkedChildUUID = linkedChildId;
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

  /** Как во внутреннем чтении для `buildForBlock` (локальный фрейм коннектора под `<g>` блока). */
  static getLocalGeometry(data, blockElement) {
    return ConnectorZone.#readLocalGeometry(data, blockElement);
  }

  static buildForBlock(data, blockElement) {
    const g = ConnectorZone.#readLocalGeometry(data, blockElement);
    const { connectorX, width, topBaseY, bottomBaseY } = g;
    switch (data.type) {
      case 'default-block':
        return [
          ConnectorZone.#makeTopZone(connectorX, width, topBaseY),
          ConnectorZone.#makeBottomZone(connectorX, width, bottomBaseY),
        ];
      case 'c-block': {
        const zones = [
          ConnectorZone.#makeTopZone(connectorX, width, topBaseY),
          ConnectorZone.#makeBottomZone(connectorX, width, bottomBaseY),
        ];
        zones.push(
          new ConnectorZone(CBlockTopInner.computeCBlockTopInnerRect(g))
        );
        return zones;
      }
      case 'start-block':
        return [ConnectorZone.#makeBottomZone(connectorX, width, bottomBaseY)];
      case 'stop-block':
        return [ConnectorZone.#makeTopZone(connectorX, width, topBaseY)];
      default:
        return [];
    }
  }

  static #bboxFallback(data) {
    let blockHeight = Global.DEFAULT_BLOCK_HEIGHT;
    if (data.height != null) {
      blockHeight = data.height;
    }
    let blockWidth = 0;
    if (data.width != null) {
      blockWidth = data.width;
    }
    return {
      connectorX: 0,
      width: blockWidth,
      topBaseY: 0,
      bottomBaseY: blockHeight,
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
    const topLeft = SvgUtils.clientPointToElementLocal(
      blockElement,
      r.left,
      r.top
    );
    const topRight = SvgUtils.clientPointToElementLocal(
      blockElement,
      r.right,
      r.top
    );
    const bottomLeft = SvgUtils.clientPointToElementLocal(
      blockElement,
      r.left,
      r.bottom
    );
    if (!topLeft || !topRight || !bottomLeft) return fallback;

    const widthFromClient = Math.abs(topRight.x - topLeft.x);
    let resolvedConnectorWidth;
    if (widthFromClient > 0) {
      resolvedConnectorWidth = widthFromClient;
    } else {
      resolvedConnectorWidth = b.width;
    }
    return {
      connectorX: topLeft.x,
      width: resolvedConnectorWidth,
      topBaseY: ConnLocal.connectorLocalTopBaseY(topLeft.y),
      bottomBaseY: bottomLeft.y,
    };
  }

  static #makeTopZone(connectorX, width, topBaseY) {
    return new ConnectorZone({
      type: 'top',
      x: connectorX,
      y: ConnLocal.connectorLocalTopZoneY(topBaseY),
      width,
      height: Global.CONNECTOR_THRESHOLD,
    });
  }

  static #makeBottomZone(connectorX, width, bottomBaseY) {
    return new ConnectorZone({
      type: 'bottom',
      x: connectorX,
      y: ConnLocal.connectorLocalBottomZoneY(bottomBaseY),
      width,
      height: Global.CONNECTOR_THRESHOLD,
    });
  }
}
