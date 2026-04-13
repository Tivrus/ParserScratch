import {
  CONNECTOR_SOCKET_HEIGHT,
  CONNECTOR_THRESHOLD,
} from '../../constans/Global.js';
import { clientPointToElementLocal } from '../../utils/SvgUtils.js';
import { ConnectorZone } from './ConnectorZone.js';

// --- Stack joints: one middle band between parent.next ↔ child, replaces parent.bottom + child.top ---

export class StackChainMiddle {
  // Seam center in child local Y. `childSpreadClientDy` — сдвиг верха child вниз (px), до apply transform.
  static seamCenterLocalYOnChild(parentEl, childEl, childSpreadClientDy = 0) {
    const pr = parentEl.getBoundingClientRect();
    const cr = childEl.getBoundingClientRect();
    const childTop = cr.top + childSpreadClientDy;
    const seamClientY = (pr.bottom + childTop) / 2;
    const seamClientX = (cr.left + cr.right) / 2;
    const local = clientPointToElementLocal(childEl, seamClientX, seamClientY);
    return local?.y ?? null;
  }

  // Middle zone height while chain is split (ghost height drives the gap).
  static middleZoneSplitHeight(ghostBlockHeight) {
    const raw =
      ghostBlockHeight - CONNECTOR_SOCKET_HEIGHT + 2 + CONNECTOR_THRESHOLD / 2;
    return Math.max(CONNECTOR_THRESHOLD, raw);
  }

  // Expanded middle band: centered on seam, covers socket halves of parent/child.
  static expandedMiddleZoneLocal(
    parentEl,
    childEl,
    midZone,
    ghostBlockHeight,
    childSpreadClientDy = 0
  ) {
    const seamLy = this.seamCenterLocalYOnChild(parentEl, childEl, childSpreadClientDy);
    if (seamLy == null || !midZone) return null;
    const h = this.middleZoneSplitHeight(ghostBlockHeight);
    return {
      type: 'middle',
      x: midZone.x,
      y: seamLy - h / 2,
      width: midZone.width,
      height: h,
    };
  }

  // Rebuild base zones on every block, then merge stack joints into middle zones on the child block.
  static applyStackChainMiddles(blockRegistry, getDataForBlock) {
    for (const block of blockRegistry.values()) {
      const data = getDataForBlock(block);
      if (!data || !block.element) continue;
      block.connectorZones = ConnectorZone.buildForBlock(data, block.element);
    }

    for (const child of blockRegistry.values()) {
      if (!child.parentUUID) continue;
      const parent = blockRegistry.get(child.parentUUID);
      if (!parent?.element || !child.element) continue;

      const parentData = getDataForBlock(parent);
      const childData = getDataForBlock(child);
      if (!parentData || !childData) continue;

      const middle = this.#buildMiddleZone(parent, child, parentData, childData);
      if (!middle) continue;

      parent.connectorZones = parent.connectorZones.filter(z => z.type !== 'bottom');
      child.connectorZones = child.connectorZones.filter(z => z.type !== 'top');
      child.connectorZones.push(middle);
    }
  }

  static getChainTailFromBlock(blockRegistry, startUUID) {
    const tail = [];
    let id = startUUID;
    const seen = new Set();
    while (id && !seen.has(id)) {
      seen.add(id);
      const b = blockRegistry.get(id);
      if (!b?.element) break;
      tail.push(b);
      id = b.nextUUID;
    }
    return tail;
  }

  static clearChainSpread(blockRegistry, excludeUUID = null) {
    if (!blockRegistry) return;
    for (const b of blockRegistry.values()) {
      if (!b.element) continue;
      if (excludeUUID != null && b.blockUUID === excludeUUID) continue;
      b.element.setAttribute('transform', `translate(${b.x}, ${b.y})`);
    }
  }

  static setChainSpreadBelow(blockRegistry, pivotChildUUID, deltaY, excludeUUID = null) {
    if (!blockRegistry || !deltaY) {
      this.clearChainSpread(blockRegistry, excludeUUID);
      return;
    }
    this.clearChainSpread(blockRegistry, excludeUUID);
    const tail = this.getChainTailFromBlock(blockRegistry, pivotChildUUID);
    for (const b of tail) {
      if (excludeUUID != null && b.blockUUID === excludeUUID) continue;
      b.element.setAttribute(
        'transform',
        `translate(${b.x}, ${b.y + deltaY - CONNECTOR_SOCKET_HEIGHT + 2})`
      );
    }
  }

  static ghostSpreadDeltaY(draggedElement) {
    if (!draggedElement || typeof draggedElement.getBBox !== 'function') return 0;
    try {
      const h = draggedElement.getBBox().height;
      return Number.isFinite(h) && h > 0 ? h : 0;
    } catch {
      return 0;
    }
  }

  static #zoneByType(zones, type) {
    return zones?.find(z => z.type === type) ?? null;
  }

  static #buildMiddleZone(parent, child, parentData, childData) {
    const topZone = this.#zoneByType(child.connectorZones, 'top');
    if (!topZone) return null;

    const seamLy = this.seamCenterLocalYOnChild(parent.element, child.element);
    if (seamLy == null) return null;
    const y = seamLy - CONNECTOR_THRESHOLD / 2 - CONNECTOR_SOCKET_HEIGHT / 2;

    const inCBlock = parentData.type === 'c-block' || childData.type === 'c-block';

    return new ConnectorZone({
      type: 'middle',
      x: topZone.x,
      y,
      width: topZone.width,
      height: CONNECTOR_THRESHOLD,
      inCBlock,
      linkedParentUUID: parent.blockUUID,
    });
  }
}
