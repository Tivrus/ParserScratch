// Stack snap hit-test only (no scene graph changes).

import { readWorkspaceBlockUUID } from '../../utils/SvgUtils.js';

// While a workspace block is grabbed, GrabManager is the source of truth for UUID (DOM on overlay can disagree).
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

function canConnectStackBelowGeometry(dragged, other) {
  const otherBottom = zoneByType(other.connectorZones, 'bottom');
  if (!otherBottom) return false;

  const draggedOutline = dragged.element.getBoundingClientRect();
  const otherBottomClient = zoneToClientRect(other.element, otherBottom);
  if (!otherBottomClient) return false;

  if (!rectsIntersectClient(draggedOutline, otherBottomClient)) return false;

  const draggedBottom = zoneByType(dragged.connectorZones, 'bottom');
  if (!draggedBottom) return true;

  const draggedBottomClient = zoneToClientRect(dragged.element, draggedBottom);
  if (!draggedBottomClient) return false;
  return !rectsIntersectClient(draggedBottomClient, otherBottomClient);
}

function canConnectStackAboveGeometry(dragged, other) {
  const otherTop = zoneByType(other.connectorZones, 'top');
  if (!otherTop) return false;

  const draggedOutline = dragged.element.getBoundingClientRect();
  const otherTopClient = zoneToClientRect(other.element, otherTop);
  if (!otherTopClient) return false;

  if (!rectsIntersectClient(draggedOutline, otherTopClient)) return false;

  const draggedTop = zoneByType(dragged.connectorZones, 'top');
  if (!draggedTop) return true;

  const draggedTopClient = zoneToClientRect(dragged.element, draggedTop);
  if (!draggedTopClient) return false;
  return !rectsIntersectClient(draggedTopClient, otherTopClient);
}

export function canConnectStackBelow(dragged, other) {
  if (!zoneByType(dragged.connectorZones, 'top')) return false;
  return canConnectStackBelowGeometry(dragged, other);
}

export function canConnectStackAbove(dragged, other) {
  if (!zoneByType(dragged.connectorZones, 'bottom')) return false;
  return canConnectStackAboveGeometry(dragged, other);
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

    const below = canConnectStackBelow(dragged, other);
    const above = canConnectStackAbove(dragged, other);
    if (below || above) {
      candidates.push({ staticUUID: otherId, below, above });
    }
  }
  return candidates;
}
