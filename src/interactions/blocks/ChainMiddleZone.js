import {
  CONNECTOR_SOCKET_HEIGHT,
  CONNECTOR_THRESHOLD,
} from '../../constans/Global.js';
import { clientPointToElementLocal } from '../../utils/SvgUtils.js';
import { ConnectorZone } from './ConnectorZone.js';

function zoneToClientRect(blockGroup, zone) {
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

// Шов в локальных координатах parent <g> (наследник bottom).
function jointSeamCenterLocalOnParent(parentEl, childEl, parentBottomZone, childTopZone) {
  const rParent = zoneToClientRect(parentEl, parentBottomZone);
  const rChild = zoneToClientRect(childEl, childTopZone);
  if (!rParent || !rChild) {
    return null;
  }
  const centerParentY = (rParent.top + rParent.bottom) / 2;
  const centerChildY = (rChild.top + rChild.bottom) / 2;
  const seamClientY = (centerParentY + centerChildY) / 2;
  const parentRect = parentEl.getBoundingClientRect();
  const seamClientX = (parentRect.left + parentRect.right) / 2;
  const pt = clientPointToElementLocal(parentEl, seamClientX, seamClientY);
  return pt?.y ?? null;
}

export function applyStackChainMiddles(blockRegistry, getDataForBlock) {
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

    const middle = buildMiddleZone(parent, child, parentData, childData);
    if (!middle) continue;

    parent.connectorZones = parent.connectorZones.filter(z => z.type !== 'bottom');
    child.connectorZones = child.connectorZones.filter(z => z.type !== 'top');
    parent.connectorZones.push(middle);
  }
}

function getChainTailFromBlock(blockRegistry, startBlockUUID) {
  const tailBlocks = [];
  let currentBlockUUID = startBlockUUID;
  const visitedUUIDs = new Set();
  while (currentBlockUUID && !visitedUUIDs.has(currentBlockUUID)) {
    visitedUUIDs.add(currentBlockUUID);
    const block = blockRegistry.get(currentBlockUUID);
    if (!block?.element) break;
    tailBlocks.push(block);
    currentBlockUUID = block.nextUUID;
  }
  return tailBlocks;
}

// Reset tail spread: SVG translate back to model x/y; skip excludeBlockUUID (e.g. block on drag overlay).
export function clearChainSpread(blockRegistry, excludeBlockUUID = null) {
  for (const workspaceBlock of blockRegistry.values()) {
    if (!workspaceBlock.element) continue;
    if (excludeBlockUUID != null && workspaceBlock.blockUUID === excludeBlockUUID) continue;

    workspaceBlock.element.setAttribute(
      'transform',
      `translate(${workspaceBlock.x}, ${workspaceBlock.y})`
    );
  }
}


export function setChainSpreadBelow(
  blockRegistry,
  pivotChildUUID,
  deltaY,
  excludeBlockUUID = null
) {
  if (!deltaY) {
    clearChainSpread(blockRegistry, excludeBlockUUID);
    return;
  }
  clearChainSpread(blockRegistry, excludeBlockUUID);
  for (const tailBlock of getChainTailFromBlock(blockRegistry, pivotChildUUID)) {
    if (excludeBlockUUID != null && tailBlock.blockUUID === excludeBlockUUID) {
      continue;
    }
    const spreadOffsetY = tailBlock.y + deltaY - CONNECTOR_SOCKET_HEIGHT + 2;
    tailBlock.element.setAttribute(
      'transform',
      `translate(${tailBlock.x}, ${spreadOffsetY})`
    );
  }
}

// Полная высота перетаскиваемого блока — сдвиг хвоста цепи при middle-preview.
export function ghostSpreadDeltaY(draggedElement) {
  if (!draggedElement || typeof draggedElement.getBBox !== 'function') return 0;
  try {
    const bboxHeight = draggedElement.getBBox().height;
    return Number.isFinite(bboxHeight) && bboxHeight > 0 ? bboxHeight : 0;
  } catch {
    return 0;
  }
}

function buildMiddleZone(parent, child, parentData, childData) {
  const childTop = ConnectorZone.zoneByType(child.connectorZones, 'top');
  const parentBottom = ConnectorZone.zoneByType(parent.connectorZones, 'bottom');
  if (!childTop || !parentBottom) {
    return null;
  }

  const seamY = jointSeamCenterLocalOnParent(
    parent.element,
    child.element,
    parentBottom,
    childTop
  );
  if (seamY == null) {
    return null;
  }

  const inCBlock = parentData.type === 'c-block' || childData.type === 'c-block';

  return new ConnectorZone({
    type: 'middle',
    x: parentBottom.x,
    y: seamY - CONNECTOR_THRESHOLD / 2,
    width: parentBottom.width,
    height: CONNECTOR_THRESHOLD,
    inCBlock,
    linkedChildUUID: child.blockUUID,
  });
}
