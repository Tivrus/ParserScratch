// --- Connector zones: viewport (client) geometry for hit-tests ---

/** Axis-aligned overlap in viewport (client) coordinates. */
export function rectsIntersectClient(clientRectA, clientRectB) {
  const separated =
    clientRectA.right <= clientRectB.left ||
    clientRectA.left >= clientRectB.right ||
    clientRectA.bottom <= clientRectB.top ||
    clientRectA.top >= clientRectB.bottom;
  return !separated;
}

/** Connector zone rect in block local space → AABB in client pixels (`getScreenCTM`). */
export function zoneToClientRect(blockGroup, zone) {
  const svg = blockGroup.ownerSVGElement;
  if (!svg?.createSVGPoint || typeof blockGroup.getScreenCTM !== 'function') {
    return null;
  }

  const blockScreenMatrix = blockGroup.getScreenCTM();
  if (!blockScreenMatrix) return null;

  const svgPoint = svg.createSVGPoint();
  const cornersLocal = [
    [zone.x, zone.y],
    [zone.x + zone.width, zone.y],
    [zone.x + zone.width, zone.y + zone.height],
    [zone.x, zone.y + zone.height],
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [localX, localY] of cornersLocal) {
    svgPoint.x = localX;
    svgPoint.y = localY;
    try {
      const clientPoint = svgPoint.matrixTransform(blockScreenMatrix);
      minX = Math.min(minX, clientPoint.x);
      minY = Math.min(minY, clientPoint.y);
      maxX = Math.max(maxX, clientPoint.x);
      maxY = Math.max(maxY, clientPoint.y);
    } catch {
      return null;
    }
  }

  return { left: minX, top: minY, right: maxX, bottom: maxY };
}
