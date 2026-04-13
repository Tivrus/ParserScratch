// --- Stack snap hit-test (no graph mutations) ---

import { readWorkspaceBlockUUID } from '../../utils/SvgUtils.js';

export class BlockConnectionCheck {
  // Prefer GrabManager UUID while a workspace block is grabbed (overlay DOM can disagree).
  static resolveDraggedBlockId(draggedElement, grabManager) {
    const key = grabManager?.getWorkspaceBlockGrabKey?.();
    if (key) return key;
    return readWorkspaceBlockUUID(draggedElement) || '';
  }

  static rectsIntersectClient(a, b) {
    const separated =
      a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
    return !separated;
  }

  // Zone in block <g> local space -> axis-aligned rect in viewport pixels.
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

  // Middle joint on `child` that stacks under `parentUUID`.
  static middleZoneForParent(child, parentUUID) {
    return (
      child?.connectorZones?.find(
        z => z.type === 'middle' && z.linkedParentUUID === parentUUID
      ) ?? null
    );
  }

  static canConnectStackBelow(dragged, other, blockRegistry = null) {
    if (!this.#zoneByType(dragged.connectorZones, 'top')) return false;
    return this.#canConnectStackBelowGeometry(dragged, other, blockRegistry);
  }

  static canConnectStackAbove(dragged, other, blockRegistry = null) {
    if (!this.#zoneByType(dragged.connectorZones, 'bottom')) return false;
    return this.#canConnectStackAboveGeometry(dragged, other, blockRegistry);
  }

  // Free command block + valid parent→child link + middle zone exists (no geometry).
  static middleInsertEligibility(dragged, parent, child) {
    if (!dragged?.element || !parent?.element || !child?.element) return false;
    if (dragged.parentUUID || dragged.nextUUID) return false;
    if (!this.#zoneByType(dragged.connectorZones, 'top')) return false;
    if (!this.#zoneByType(dragged.connectorZones, 'bottom')) return false;
    if (parent.nextUUID !== child.blockUUID || child.parentUUID !== parent.blockUUID) {
      return false;
    }
    return Boolean(this.middleZoneForParent(child, parent.blockUUID));
  }

  // Hit-test uses the real `mid` on the child (ConnectionGhostPreview patches y/height while split).
  static canInsertAtMiddleJoint(dragged, parent, child) {
    if (!this.middleInsertEligibility(dragged, parent, child)) return false;
    const mid = this.middleZoneForParent(child, parent.blockUUID);
    if (!mid) return false;

    const draggedOutline = dragged.element.getBoundingClientRect();
    const midClient = this.zoneToClientRect(child.element, mid);
    if (!midClient) return false;
    return this.rectsIntersectClient(draggedOutline, midClient);
  }

  static listConnectionCandidates(draggedElement, blockRegistry, grabManager) {
    const draggedId = this.resolveDraggedBlockId(draggedElement, grabManager);
    if (!draggedId) return [];

    const dragged = blockRegistry.get(draggedId);
    if (!dragged?.connectorZones?.length) return [];

    const candidates = [];

    for (const [otherId, other] of blockRegistry) {
      if (otherId === draggedId) continue;
      if (!other?.element || !other.connectorZones?.length) continue;

      const below = this.canConnectStackBelow(dragged, other, blockRegistry);
      const above = this.canConnectStackAbove(dragged, other, blockRegistry);
      if (below || above) {
        candidates.push({ staticUUID: otherId, below, above });
      }
    }

    for (const child of blockRegistry.values()) {
      if (child.blockUUID === draggedId || !child.parentUUID) continue;
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

    return candidates;
  }

  static #zoneByType(zones, type) {
    return zones?.find(z => z.type === type) ?? null;
  }

  static #getSocketBelow(other, blockRegistry) {
    const bottom = this.#zoneByType(other.connectorZones, 'bottom');
    if (bottom) return { el: other.element, zone: bottom };
    if (blockRegistry && other.nextUUID) {
      const child = blockRegistry.get(other.nextUUID);
      const mid = this.middleZoneForParent(child, other.blockUUID);
      if (mid && child?.element) return { el: child.element, zone: mid };
    }
    return null;
  }

  static #getSocketAbove(other, blockRegistry) {
    const top = this.#zoneByType(other.connectorZones, 'top');
    if (top) return { el: other.element, zone: top };
    if (blockRegistry && other.parentUUID) {
      const mid = this.middleZoneForParent(other, other.parentUUID);
      if (mid) return { el: other.element, zone: mid };
    }
    return null;
  }

  static #canConnectStackBelowGeometry(dragged, other, blockRegistry) {
    const sock = this.#getSocketBelow(other, blockRegistry);
    if (!sock) return false;

    const draggedOutline = dragged.element.getBoundingClientRect();
    const targetClient = this.zoneToClientRect(sock.el, sock.zone);
    if (!targetClient) return false;

    if (!this.rectsIntersectClient(draggedOutline, targetClient)) return false;

    const draggedBottom = this.#zoneByType(dragged.connectorZones, 'bottom');
    if (!draggedBottom) return true;

    const draggedBottomClient = this.zoneToClientRect(dragged.element, draggedBottom);
    if (!draggedBottomClient) return false;
    return !this.rectsIntersectClient(draggedBottomClient, targetClient);
  }

  static #canConnectStackAboveGeometry(dragged, other, blockRegistry) {
    const sock = this.#getSocketAbove(other, blockRegistry);
    if (!sock) return false;

    const draggedOutline = dragged.element.getBoundingClientRect();
    const targetClient = this.zoneToClientRect(sock.el, sock.zone);
    if (!targetClient) return false;

    if (!this.rectsIntersectClient(draggedOutline, targetClient)) return false;

    const draggedTop = this.#zoneByType(dragged.connectorZones, 'top');
    if (!draggedTop) return true;

    const draggedTopClient = this.zoneToClientRect(dragged.element, draggedTop);
    if (!draggedTopClient) return false;
    return !this.rectsIntersectClient(draggedTopClient, targetClient);
  }
}
