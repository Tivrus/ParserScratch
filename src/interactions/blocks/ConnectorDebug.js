import * as SvgUtils from '../../utils/SvgUtils.js';
import { CONNECTOR_ZONE_STYLE } from '../../constans/Global.js';

// Previous session teardown to prevent stacked rAF loops if enable is called again
let disconnectConnectorDebug = null;

function drawZone(parent, zone, bx, by, offsetX, offsetY) {
  const x = bx + zone.x + offsetX;
  const y = by + zone.y + offsetY;

  parent.appendChild(
    SvgUtils.createElement('rect', {
      x: String(x),
      y: String(y),
      width: String(zone.width),
      height: String(zone.height),
      ...CONNECTOR_ZONE_STYLE,
    })
  );

  const label = SvgUtils.createElement('text', {
    x: String(x + 8),
    y: String(y + 12),
    fill: '#00ff00',
    'font-size': '11',
    'font-weight': 'bold',
    'font-family': 'Arial, sans-serif',
    'pointer-events': 'none',
  });
  label.style.textShadow = '0 0 3px rgba(0,0,0,0.8)';
  label.textContent =
    zone.type === 'middle' && zone.inCBlock ? 'middle(C)' : zone.type;
  parent.appendChild(label);
}

// Enables a live visual overlay for all connector zones
export function enableConnectorDebug(blockRegistry, blockContainerEl, overlayEl) {
  if (disconnectConnectorDebug) {
    disconnectConnectorDebug();
  }

  const group = SvgUtils.createElement('g', {
    id: 'connector-debug-overlay',
    'pointer-events': 'none',
  });
  overlayEl.appendChild(group);

  let rafId;

  function tick() {
    while (group.firstChild) group.removeChild(group.firstChild);

    const cr = blockContainerEl.getBoundingClientRect();
    const or = overlayEl.getBoundingClientRect();
    const ox = cr.left - or.left;
    const oy = cr.top - or.top;

    for (const block of blockRegistry.values()) {
      if (!block.connectorZones?.length) continue;
      const { x: bx, y: by } = SvgUtils.parseTranslateTransform(block.element);
      const inWorkspaceSvg = blockContainerEl.contains(block.element);
      const dx = inWorkspaceSvg ? ox : 0;
      const dy = inWorkspaceSvg ? oy : 0;
      for (const zone of block.connectorZones) {
        drawZone(group, zone, bx, by, dx, dy);
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  disconnectConnectorDebug = () => {
    cancelAnimationFrame(rafId);
    rafId = null;
    group.remove();
    disconnectConnectorDebug = null;
  };

  return disconnectConnectorDebug;
}
