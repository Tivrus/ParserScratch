import * as SvgUtils from '../../utils/SvgUtils.js';
import * as Global from '../../constans/Global.js';
import * as ConnectorClientGeometry from '../connections/connectorClientGeometry.js';
import * as StackMiddleJoint from '../connections/stackMiddleJoint.js';

const DEBUG_GROUP_CLASS = 'connector-debug-connectors';

function drawZone(parent, zone, x, y, width, height) {
  parent.appendChild(
    SvgUtils.createElement('rect', {
      x: String(x),
      y: String(y),
      width: String(width),
      height: String(height),
      ...Global.CONNECTOR_ZONE_STYLE,
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

// All zones live in drag-overlay, viewport→overlay coords (same idea as zoneToClientRect in hit-test).
export function enableConnectorDebug(blockRegistry, blockContainerEl, overlayEl) {
  blockContainerEl?.querySelector(`g.${DEBUG_GROUP_CLASS}`)?.remove();

  const createdGroups = [];
  let g = overlayEl?.querySelector(`g.${DEBUG_GROUP_CLASS}`);
  if (!g && overlayEl) {
    g = SvgUtils.createElement('g', {
      class: DEBUG_GROUP_CLASS,
      'pointer-events': 'none',
    });
    overlayEl.appendChild(g);
    createdGroups.push(g);
  } else if (g) {
    createdGroups.push(g);
  }

  let rafId = requestAnimationFrame(function tick() {
    if (!overlayEl || !g) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    g.replaceChildren();
    const or = overlayEl.getBoundingClientRect();

    for (const block of blockRegistry.values()) {
      if (!block.connectorZones?.length || !block.element) continue;
      for (const zone of block.connectorZones) {
        let zc;
        if (zone.type === 'middle' && zone.linkedChildUUID) {
          const ch = blockRegistry.get(zone.linkedChildUUID);
          zc = ch && StackMiddleJoint.middleJointBandClientRect(block, ch, zone);
        } else {
          zc = ConnectorClientGeometry.zoneToClientRect(block.element, zone);
        }
        if (!zc) continue;
        const x = zc.left - or.left;
        const y = zc.top - or.top;
        const w = zc.right - zc.left;
        const h = zc.bottom - zc.top;
        drawZone(g, zone, x, y, w, h);
      }
    }

    rafId = requestAnimationFrame(tick);
  });

  return () => {
    cancelAnimationFrame(rafId);
    createdGroups.forEach(el => el.remove());
  };
}
