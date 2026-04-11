// Stack snap eligibility (checks only; no linking in the scene graph).

// --- Viewport geometry ---

export function rectsIntersectClient(a, b) {
  const separated =
    a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
  return !separated;
}

// Zone in block <g> local space → axis-aligned rect in viewport pixels.
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

  return { 
    left: minX, 
    top: minY, 
    right: maxX, 
    bottom: maxY };
}

// --- Stack rules (one edge: top or bottom) ---

function zoneByType(zones, type) {
  return zones?.find(z => z.type === type) ?? null;
}

function canStackOnEdge(dragged, other, edge) {
  const bandOnOther = zoneByType(other.connectorZones, edge);
  const bandOnDragged = zoneByType(dragged.connectorZones, edge);
  if (!bandOnOther || !bandOnDragged) return false;

  const draggedOutline = dragged.element.getBoundingClientRect();
  const otherBandClient = zoneToClientRect(other.element, bandOnOther);
  const draggedBandClient = zoneToClientRect(dragged.element, bandOnDragged);
  if (!otherBandClient || !draggedBandClient) return false;

  const draggedTouchesOtherSocket = rectsIntersectClient(draggedOutline, otherBandClient);
  const twoSocketsOverlap = rectsIntersectClient(draggedBandClient, otherBandClient);

  return draggedTouchesOtherSocket && !twoSocketsOverlap;
}

export function canConnectStackBelow(dragged, other) {
  return canStackOnEdge(dragged, other, 'bottom');
}

export function canConnectStackAbove(dragged, other) {
  return canStackOnEdge(dragged, other, 'top');
}

// --- Registry scan ---

export function listConnectionCandidates(draggedElement, blockRegistry) {
  const draggedId = draggedElement?.dataset?.blockUUID;
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
