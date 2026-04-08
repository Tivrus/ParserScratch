import {
  CONNECTOR_THRESHOLD,
  CONNECTOR_OFFSETS,
  DEFAULT_BLOCK_HEIGHT,
} from '../../constans/Global.js';

// Pure data class — no DOM attachment.
// Zones live in overlay space, not inside the block's <g>.
export class ConnectorZone {
  constructor({ type, x, y, width, height }) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /** Same space as block translate — add blockX/blockY for workspace/overlay positioning. */
  getAbsoluteRect(blockX, blockY) {
    return {
      x: blockX + this.x,
      y: blockY + this.y,
      width: this.width,
      height: this.height,
    };
  }

  static buildForBlock(data) {
    switch (data.type) {
      case 'default-block':
        return ConnectorZone.#stackZonesForWidth(data.width);
      default:
        return [];
    }
  }

  // === STACK ZONES FOR WIDTH ===
  static #stackZonesForWidth(blockWidth) {
    const bandHeight = CONNECTOR_THRESHOLD;
    const topBandY = CONNECTOR_OFFSETS.TOP_Y;
    const bottomBandY = CONNECTOR_OFFSETS.BOTTOM_Y;

    const top = new ConnectorZone({
      type: 'top',
      x: 0,
      y: topBandY,
      width: blockWidth,
      height: bandHeight,
    });

    const bottom = new ConnectorZone({
      type: 'bottom',
      x: 0,
      y: bottomBandY,
      width: blockWidth,
      height: bandHeight,
    });

    return [top, bottom];
  }
}
