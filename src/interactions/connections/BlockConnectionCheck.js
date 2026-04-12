// --- Stack snap hit-test (no graph mutations) ---

import { readWorkspaceBlockUUID } from '../../utils/SvgUtils.js';

// Prefer GrabManager UUID while a workspace block is grabbed (overlay DOM can disagree).
export function resolveDraggedBlockId(draggedElement, grabManager) {
  const key = grabManager?.getWorkspaceBlockGrabKey?.();
  if (key) return key;
  return readWorkspaceBlockUUID(draggedElement) || '';
}

// --- Viewport geometry ---

export function rectsIntersectClient(a, b) {
  const separated =
    a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
  return !separated;
}

// Zone in block <g> local space -> axis-aligned rect in viewport pixels.
export function zoneToClientRect(blockGroup, zone) {
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

// --- Stack rules ---

function zoneByType(zones, type) {
  return zones?.find(z => z.type === type) ?? null;
}

// Middle joint on `child` that stacks under `parentUUID`.
export function middleZoneForParent(child, parentUUID) {
  return (
    child?.connectorZones?.find(
      z => z.type === 'middle' && z.linkedParentUUID === parentUUID
    ) ?? null
  );
}

// Socket under `other`: its bottom zone, or the stack joint middle on the next block.
function getSocketBelow(other, blockRegistry) {
  const bottom = zoneByType(other.connectorZones, 'bottom');
  if (bottom) return { el: other.element, zone: bottom };
  if (blockRegistry && other.nextUUID) {
    const child = blockRegistry.get(other.nextUUID);
    const mid = middleZoneForParent(child, other.blockUUID);
    if (mid && child?.element) return { el: child.element, zone: mid };
  }
  return null;
}

// Socket above `other`: its top zone, or the joint middle when it has a parent.
function getSocketAbove(other, blockRegistry) {
  const top = zoneByType(other.connectorZones, 'top');
  if (top) return { el: other.element, zone: top };
  if (blockRegistry && other.parentUUID) {
    const mid = middleZoneForParent(other, other.parentUUID);
    if (mid) return { el: other.element, zone: mid };
  }
  return null;
}

function canConnectStackBelowGeometry(dragged, other, blockRegistry) {
  const sock = getSocketBelow(other, blockRegistry);
  if (!sock) return false;

  const draggedOutline = dragged.element.getBoundingClientRect();
  const targetClient = zoneToClientRect(sock.el, sock.zone);
  if (!targetClient) return false;

  if (!rectsIntersectClient(draggedOutline, targetClient)) return false;

  const draggedBottom = zoneByType(dragged.connectorZones, 'bottom');
  if (!draggedBottom) return true;

  const draggedBottomClient = zoneToClientRect(dragged.element, draggedBottom);
  if (!draggedBottomClient) return false;
  return !rectsIntersectClient(draggedBottomClient, targetClient);
}

function canConnectStackAboveGeometry(dragged, other, blockRegistry) {
  const sock = getSocketAbove(other, blockRegistry);
  if (!sock) return false;

  const draggedOutline = dragged.element.getBoundingClientRect();
  const targetClient = zoneToClientRect(sock.el, sock.zone);
  if (!targetClient) return false;

  if (!rectsIntersectClient(draggedOutline, targetClient)) return false;

  const draggedTop = zoneByType(dragged.connectorZones, 'top');
  if (!draggedTop) return true;

  const draggedTopClient = zoneToClientRect(dragged.element, draggedTop);
  if (!draggedTopClient) return false;
  return !rectsIntersectClient(draggedTopClient, targetClient);
}

export function canConnectStackBelow(dragged, other, blockRegistry = null) {
  if (!zoneByType(dragged.connectorZones, 'top')) return false;
  return canConnectStackBelowGeometry(dragged, other, blockRegistry);
}

export function canConnectStackAbove(dragged, other, blockRegistry = null) {
  if (!zoneByType(dragged.connectorZones, 'bottom')) return false;
  return canConnectStackAboveGeometry(dragged, other, blockRegistry);
}

// Free command block + valid parent→child link + middle zone exists (no geometry).
export function middleInsertEligibility(dragged, parent, child) {
  if (!dragged?.element || !parent?.element || !child?.element) return false;
  if (dragged.parentUUID || dragged.nextUUID) return false;
  if (!zoneByType(dragged.connectorZones, 'top')) return false;
  if (!zoneByType(dragged.connectorZones, 'bottom')) return false;
  if (parent.nextUUID !== child.blockUUID || child.parentUUID !== parent.blockUUID) return false;
  return Boolean(middleZoneForParent(child, parent.blockUUID));
}

// Hit-test uses the real `mid` on the child (ConnectionGhostPreview patches y/height while split).
export function canInsertAtMiddleJoint(dragged, parent, child) {
  if (!middleInsertEligibility(dragged, parent, child)) return false;
  const mid = middleZoneForParent(child, parent.blockUUID);
  if (!mid) return false;

  const draggedOutline = dragged.element.getBoundingClientRect();
  const midClient = zoneToClientRect(child.element, mid);
  if (!midClient) return false;
  return rectsIntersectClient(draggedOutline, midClient);
}

// --- Registry scan ---

export function listConnectionCandidates(draggedElement, blockRegistry, grabManager) {
  const draggedId = resolveDraggedBlockId(draggedElement, grabManager);
  if (!draggedId) return [];

  const dragged = blockRegistry.get(draggedId);
  if (!dragged?.connectorZones?.length) return [];

  const candidates = [];

  for (const [otherId, other] of blockRegistry) {
    if (otherId === draggedId) continue;
    if (!other?.element || !other.connectorZones?.length) continue;

    const below = canConnectStackBelow(dragged, other, blockRegistry);
    const above = canConnectStackAbove(dragged, other, blockRegistry);
    if (below || above) {
      candidates.push({ staticUUID: otherId, below, above });
    }
  }

  for (const child of blockRegistry.values()) {
    if (child.blockUUID === draggedId || !child.parentUUID) continue;
    const parent = blockRegistry.get(child.parentUUID);
    if (!parent?.element || !child.element) continue;
    if (canInsertAtMiddleJoint(dragged, parent, child)) {
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
