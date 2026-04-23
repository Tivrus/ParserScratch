// --- Stack snap hit-test (no graph mutations) ---

import { readWorkspaceBlockUUID } from '../../utils/SvgUtils.js';
import { ConnectorZone } from '../blocks/ConnectorZone.js';

export class BlockConnectionCheck {
  // UUID of the dragged workspace block; grab manager wins if the block is grabbed.
  static resolveDraggedBlockUUID(draggedElement, grabManager) {
    const fromGrab = grabManager?.getWorkspaceBlockGrabUUID?.();
    if (fromGrab) {
      return fromGrab;
    }

    return readWorkspaceBlockUUID(draggedElement) || '';
  }

  // Axis-aligned overlap in viewport (client) coordinates.
  static rectsIntersectClient(clientRectA, clientRectB) {
    const separated =
      clientRectA.right <= clientRectB.left ||
      clientRectA.left >= clientRectB.right ||
      clientRectA.bottom <= clientRectB.top ||
      clientRectA.top >= clientRectB.bottom;
    return !separated;
  }

  // Connector zone rect in block local space → AABB in client pixels (getScreenCTM).
  static zoneToClientRect(blockGroup, zone) {
    const svg = blockGroup.ownerSVGElement;
    if (!svg?.createSVGPoint || typeof blockGroup.getScreenCTM !== 'function') {
      return null;
    }

    const ctm = blockGroup.getScreenCTM();
    if (!ctm) return null;

    const pt = svg.createSVGPoint();
    const corners = [
      [zone.x, zone.y],
      [zone.x + zone.width, zone.y],
      [zone.x + zone.width, zone.y + zone.height],
      [zone.x, zone.y + zone.height],
    ];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const [lx, ly] of corners) {
      pt.x = lx;
      pt.y = ly;
      try {
        const p = pt.matrixTransform(ctm);
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      } catch {
        return null;
      }
    }

    return { left: minX, top: minY, right: maxX, bottom: maxY };
  }

  // Middle zone on parent <g>, replaces bottom; link to block below via linkedChildUUID.
  static middleJointOnParent(parent, child) {
    return (
      parent?.connectorZones?.find(
        z => z.type === 'middle' && z.linkedChildUUID === child.blockUUID
      ) ?? null
    );
  }

  // Joint band in viewport: moves with child spread (translate), not fixed to parent alone.
  static middleJointBandClientRect(parent, child, mid) {
    if (!parent?.element || !child?.element || !mid) return null;
    const horizontal = this.zoneToClientRect(parent.element, mid);
    if (!horizontal) return null;
    const pr = parent.element.getBoundingClientRect();
    const cr = child.element.getBoundingClientRect();
    const seamY = (pr.bottom + cr.top) / 2;
    const halfH = mid.height / 2;
    return {
      left: horizontal.left,
      right: horizontal.right,
      top: seamY - halfH,
      bottom: seamY + halfH,
    };
  }

  static canConnectStackBelow(dragged, other, blockRegistry = null) {
    if (!ConnectorZone.zoneByType(dragged.connectorZones, 'top')) return false;
    // Below this block only when it has no stack successor; otherwise use middle (between) or below the tail.
    if (other?.nextUUID) return false;
    return this.#canConnectStackBelowGeometry(dragged, other, blockRegistry);
  }

  static canConnectStackAbove(dragged, other, blockRegistry = null) {
    if (!ConnectorZone.zoneByType(dragged.connectorZones, 'bottom')) return false;
    return this.#canConnectStackAboveGeometry(dragged, other, blockRegistry);
  }

  static middleInsertEligibility(dragged, parent, child) {
    if (!dragged?.element || !parent?.element || !child?.element) return false;
    if (dragged.parentUUID || dragged.nextUUID) return false;

    const hasTop = Boolean(ConnectorZone.zoneByType(dragged.connectorZones, 'top'));
    const hasBottom = Boolean(ConnectorZone.zoneByType(dragged.connectorZones, 'bottom'));
    const t = dragged.type;
    if (t === 'start-block') {
      if (!hasBottom) return false;
    } else if (t === 'stop-block') {
      if (!hasTop) return false;
    } else {
      if (!hasTop || !hasBottom) return false;
    }

    if (parent.nextUUID !== child.blockUUID || child.parentUUID !== parent.blockUUID) {
      return false;
    }
    return Boolean(this.middleJointOnParent(parent, child));
  }

  // Insert-between: band on live parent↔child seam (includes child spread translate).
  static canInsertAtMiddleJoint(dragged, parent, child) {
    if (!this.middleInsertEligibility(dragged, parent, child)) {
      return false;
    }
    const mid = this.middleJointOnParent(parent, child);
    if (!mid) {
      return false;
    }
    const draggedOutline = dragged.element.getBoundingClientRect();
    const zoneClient = this.middleJointBandClientRect(parent, child, mid);
    if (!zoneClient) {
      return false;
    }
    return this.rectsIntersectClient(draggedOutline, zoneClient);
  }

  static listConnectionCandidates(draggedElement, blockRegistry, grabManager) {
    const draggedUUID = this.resolveDraggedBlockUUID(draggedElement, grabManager);
    if (!draggedUUID) return [];

    const dragged = blockRegistry.get(draggedUUID);
    const capStack =
      dragged?.type === 'start-block' || dragged?.type === 'stop-block';
    if (!dragged || (!dragged.connectorZones?.length && !capStack)) return [];

    const candidates = [];

    for (const [otherUUID, other] of blockRegistry) {
      if (otherUUID === draggedUUID) continue;
      if (!other?.element || !other.connectorZones?.length) continue;

      const below = this.canConnectStackBelow(dragged, other, blockRegistry);
      const above = this.canConnectStackAbove(dragged, other, blockRegistry);
      if (below || above) {
        candidates.push({ staticUUID: otherUUID, below, above });
      }
    }

    for (const child of blockRegistry.values()) {
      if (child.blockUUID === draggedUUID || !child.parentUUID) continue;
      const parent = blockRegistry.get(child.parentUUID);
      if (!parent?.element || !child.element) continue;

      if (this.canInsertAtMiddleJoint(dragged, parent, child)) {
        candidates.push({
          staticUUID: child.blockUUID,
          parentUUID: parent.blockUUID,
          middle: true,
          below: false,
          above: false,
        });
      }
    }

    return this.#dropBelowAboveThatDuplicateMiddleJoint(candidates);
  }

  // Middle and below(parent)/above(child) share one seam; strip duplicate below/above when middle exists.
  static #dropBelowAboveThatDuplicateMiddleJoint(candidates) {
    const middleChildByParent = new Map();
    for (const c of candidates) {
      if (c.middle && c.parentUUID != null) {
        middleChildByParent.set(c.parentUUID, c.staticUUID);
      }
    }
    if (middleChildByParent.size === 0) {
      return candidates;
    }

    const middleChildUUIDs = new Set(middleChildByParent.values());

    const next = [];
    for (const c of candidates) {
      if (c.middle) {
        next.push(c);
        continue;
      }
      let below = c.below;
      let above = c.above;
      if (below && middleChildByParent.has(c.staticUUID)) {
        below = false;
      }
      if (above && middleChildUUIDs.has(c.staticUUID)) {
        above = false;
      }
      if (below || above) {
        next.push({ ...c, below, above });
      }
    }
    return next;
  }

  static #getSocketBelow(other, blockRegistry) {
    const bottom = ConnectorZone.zoneByType(other.connectorZones, 'bottom');
    if (bottom) return { el: other.element, zone: bottom };
    if (blockRegistry && other.nextUUID) {
      const child = blockRegistry.get(other.nextUUID);
      const mid = child ? this.middleJointOnParent(other, child) : null;
      if (mid && other?.element) {
        return { el: other.element, zone: mid, middlePair: { parent: other, child } };
      }
    }
    return null;
  }

  static #getSocketAbove(other, blockRegistry) {
    const top = ConnectorZone.zoneByType(other.connectorZones, 'top');
    if (top) return { el: other.element, zone: top };
    if (blockRegistry && other.parentUUID) {
      const parent = blockRegistry.get(other.parentUUID);
      const mid = parent ? this.middleJointOnParent(parent, other) : null;
      if (mid && parent?.element) {
        return { el: parent.element, zone: mid, middlePair: { parent, child: other } };
      }
    }
    return null;
  }

  // Hit: dragged <g> bbox ∩ zone; for middle — live seam band (middlePair).
  static #outlineIntersectsSocket(dragged, sock) {
    const draggedOutline = dragged.element.getBoundingClientRect();
    let targetClient;
    if (sock.zone?.type === 'middle' && sock.middlePair) {
      const { parent, child } = sock.middlePair;
      targetClient = this.middleJointBandClientRect(parent, child, sock.zone);
    } else {
      targetClient = this.zoneToClientRect(sock.el, sock.zone);
    }
    if (!targetClient) return false;
    return this.rectsIntersectClient(draggedOutline, targetClient);
  }

  static #canConnectStackBelowGeometry(dragged, other, blockRegistry) {
    const sock = this.#getSocketBelow(other, blockRegistry);
    if (!sock) return false;
    return this.#outlineIntersectsSocket(dragged, sock);
  }

  static #canConnectStackAboveGeometry(dragged, other, blockRegistry) {
    const sock = this.#getSocketAbove(other, blockRegistry);
    if (!sock) return false;
    return this.#outlineIntersectsSocket(dragged, sock);
  }
}
