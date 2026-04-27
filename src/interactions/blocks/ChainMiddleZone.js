import * as Global from '../../constans/Global.js';
import * as SvgUtils from '../../utils/SvgUtils.js';
import * as ConnectorZoneModule from './ConnectorZone.js';
import * as StackSnapLayout from '../connections/stackSnapLayout.js';

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

// Joint seam in parent <g> local coordinates (replaces bottom successor).
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
  const pt = SvgUtils.clientPointToElementLocal(parentEl, seamClientX, seamClientY);
  return pt?.y ?? null;
}

export function applyStackChainMiddles(blockRegistry, getDataForBlock) {
  for (const block of blockRegistry.values()) {
    const data = getDataForBlock(block);
    if (!data || !block.element) continue;
    block.connectorZones = ConnectorZoneModule.ConnectorZone.buildForBlock(data, block.element);
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

function isSpreadExcluded(blockUUID, exclude) {
  if (exclude == null) return false;
  if (typeof exclude === 'string') return blockUUID === exclude;
  if (exclude instanceof Set) return exclude.has(blockUUID);
  if (Array.isArray(exclude)) return exclude.includes(blockUUID);
  return false;
}

// Reset tail spread: SVG translate back to model x/y; skip excluded UUID(s) (e.g. dragging stack on overlay).
export function clearChainSpread(blockRegistry, excludeBlockUUID = null) {
  for (const workspaceBlock of blockRegistry.values()) {
    if (!workspaceBlock.element) continue;
    if (isSpreadExcluded(workspaceBlock.blockUUID, excludeBlockUUID)) continue;

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
    if (isSpreadExcluded(tailBlock.blockUUID, excludeBlockUUID)) {
      continue;
    }
    const spreadOffsetY =
      tailBlock.y +
        deltaY -
        Global.CONNECTOR_SOCKET_HEIGHT +
        Global.START_BLOCK_NORMAL_STACK_EXTRA_Y;
    tailBlock.element.setAttribute(
      'transform',
      `translate(${tailBlock.x}, ${spreadOffsetY})`
    );
  }
}

// Middle-preview tail shift: block height + extra socket gap for start/stop.
export function ghostSpreadDeltaY(draggedElement) {
  if (!draggedElement || typeof draggedElement.getBBox !== 'function') return 0;
  try {
    const bboxHeight = draggedElement.getBBox().height;
    if (!Number.isFinite(bboxHeight) || bboxHeight <= 0) return 0;
    return bboxHeight + StackSnapLayout.middleTailSpreadExtraY(draggedElement);
  } catch {
    return 0;
  }
}

function buildMiddleZone(parent, child, parentData, childData) {
  const childTop = ConnectorZoneModule.ConnectorZone.zoneByType(child.connectorZones, 'top');
  const parentBottom = ConnectorZoneModule.ConnectorZone.zoneByType(parent.connectorZones, 'bottom');
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

  return new ConnectorZoneModule.ConnectorZone({
    type: 'middle',
    x: parentBottom.x,
    y: seamY - Global.CONNECTOR_THRESHOLD / 2,
    width: parentBottom.width,
    height: Global.CONNECTOR_THRESHOLD,
    inCBlock,
    linkedChildUUID: child.blockUUID,
  });
}
