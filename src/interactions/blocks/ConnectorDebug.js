import * as SvgUtils from '../../utils/SvgUtils.js';
import { CONNECTOR_ZONE_STYLE } from '../../constans/Global.js';

/** Zone rects are drawn in overlay SVG space: block translate (bx,by) plus optional offset from workspace SVG alignment. */
function drawZone(group, zone, bx, by, offsetX, offsetY) {
  const x = bx + zone.x + offsetX;
  const y = by + zone.y + offsetY;

  group.appendChild(SvgUtils.createElement('rect', {
    x: String(x), y: String(y),
    width: String(zone.width), height: String(zone.height),
    ...CONNECTOR_ZONE_STYLE,
  }));

  const label = SvgUtils.createElement('text', {
    x: String(x + 8), y: String(y + 12),
    fill: '#00ff00', 'font-size': '11', 'font-weight': 'bold',
    'font-family': 'Arial, sans-serif', 'pointer-events': 'none',
  });
  label.style.textShadow = '0 0 3px rgba(0,0,0,0.8)';
  label.textContent = zone.type;
  group.appendChild(label);
}

// Activates a live visual overlay for all connector zones.
// Returns a stop() function to disable the overlay.
//   blockRegistry    — Map<blockUUID, Block> from BlockSpawner
//   blockContainerEl — <svg id="block-container">
//   overlayEl        — <svg id="drag-overlay">
export function enableConnectorDebug(blockRegistry, blockContainerEl, overlayEl) {
  const group = SvgUtils.createElement('g', {
    id: 'connector-debug-overlay',
    'pointer-events': 'none',
  });
  overlayEl.appendChild(group);

  let rafId = null;

  function draw() {
    while (group.firstChild) group.removeChild(group.firstChild);

    const containerRect = blockContainerEl.getBoundingClientRect();
    const overlayRect = overlayEl.getBoundingClientRect();
    // Workspace <svg> origin vs overlay <svg> origin (screen px). Only needed while the block lives in block-container.
    const workspaceToOverlayX = containerRect.left - overlayRect.left;
    const workspaceToOverlayY = containerRect.top - overlayRect.top;

    for (const block of blockRegistry.values()) {
      if (!block.connectorZones?.length) continue;
      const { x: bx, y: by } = SvgUtils.parseTranslateTransform(block.element);
      const blockInWorkspaceSvg = blockContainerEl.contains(block.element);
      const offsetX = blockInWorkspaceSvg ? workspaceToOverlayX : 0;
      const offsetY = blockInWorkspaceSvg ? workspaceToOverlayY : 0;
      for (const zone of block.connectorZones) {
        drawZone(group, zone, bx, by, offsetX, offsetY);
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  rafId = requestAnimationFrame(draw);

  return function stop() {
    cancelAnimationFrame(rafId);
    group.remove();
  };
}
