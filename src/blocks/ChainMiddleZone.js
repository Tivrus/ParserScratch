import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as StackChainGraph from '../stack-connect/layout/stackChainGraph.js';
import * as StackChainDrag from './StackChainDrag.js';
import * as ConnectorZoneModule from './ConnectorZone.js';
import * as CBlockBottomInner from '../c-block/bottomInnerConnector.js';
import * as CBlockTopInner from '../c-block/topInnerConnector.js';
import * as ChainSpreadMath from '../calculations/stackChainSpreadAndMiddleZone.js';
import * as StackSeamClientMath from '../calculations/stackSeamClientMath.js';
import * as StackHatOffsets from '../calculations/stackHatOffsets.js';

function zoneToClientRect(blockGroup, zone) {
  const svg = blockGroup.ownerSVGElement;
  if (
    !svg ||
    typeof svg.createSVGPoint !== 'function' ||
    typeof blockGroup.getScreenCTM !== 'function'
  ) {
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

/** Шов между блоками в локальных координатах родительского `<g>` (вместо нижнего successor). */
function jointSeamCenterLocalOnParent(
  parentEl,
  childEl,
  parentBottomZone,
  childTopZone
) {
  const rParent = zoneToClientRect(parentEl, parentBottomZone);
  const rChild = zoneToClientRect(childEl, childTopZone);
  if (!rParent || !rChild) {
    return null;
  }
  const seamClientY = StackSeamClientMath.stackSeamCenterClientY(rParent, rChild);
  const parentRect = parentEl.getBoundingClientRect();
  const seamClientX = (parentRect.left + parentRect.right) / 2;
  const pt = SvgUtils.clientPointToElementLocal(
    parentEl,
    seamClientX,
    seamClientY
  );
  if (!pt) return null;
  return pt.y;
}

export function applyStackChainMiddles(blockRegistry, getDataForBlock) {
  for (const block of blockRegistry.values()) {
    const data = getDataForBlock(block);
    if (!data || !block.element) continue;
    block.connectorZones = ConnectorZoneModule.ConnectorZone.buildForBlock(
      data,
      block.element
    );
  }

  /* Внутренний стек c-block: у первого нет top, у последнего нет bottom; один блок — без обоих. */
  for (const cBlock of blockRegistry.values()) {
    if (cBlock.type !== 'c-block' || !cBlock.innerStackHeadUUID) continue;
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
    if (!innerHead || !Array.isArray(innerHead.connectorZones)) continue;
    const innerTail = StackChainGraph.stackTailBlock(blockRegistry, innerHead);
    if (!innerTail || !Array.isArray(innerTail.connectorZones)) continue;

    innerHead.connectorZones = innerHead.connectorZones.filter(
      z => z.type !== 'top'
    );
    if (innerTail.blockUUID === innerHead.blockUUID) {
      innerHead.connectorZones = innerHead.connectorZones.filter(
        z => z.type !== 'bottom'
      );
    } else {
      innerTail.connectorZones = innerTail.connectorZones.filter(
        z => z.type !== 'bottom'
      );
    }
  }

  for (const child of blockRegistry.values()) {
    if (!child.parentUUID) continue;
    const parent = blockRegistry.get(child.parentUUID);
    if (!parent || !parent.element || !child.element) continue;
    if (parent.nextUUID !== child.blockUUID) continue;

    const parentData = getDataForBlock(parent);
    const childData = getDataForBlock(child);
    if (!parentData || !childData) continue;

    const middle = buildMiddleZone(parent, child, parentData, childData);
    if (!middle) continue;

    parent.connectorZones = parent.connectorZones.filter(
      z => z.type !== 'bottom'
    );
    child.connectorZones = child.connectorZones.filter(z => z.type !== 'top');
    parent.connectorZones.push(middle);
  }

  for (const cBlock of blockRegistry.values()) {
    if (cBlock.type !== 'c-block' || !cBlock.innerStackHeadUUID) continue;
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
    if (!innerHead || !innerHead.element || !cBlock.element) continue;
    const data = getDataForBlock(cBlock);
    if (!data) continue;
    const g = ConnectorZoneModule.ConnectorZone.getLocalGeometry(data, cBlock.element);
    const rect = CBlockTopInner.computeCBlockTopInnerRectWithInnerStack(
      g,
      cBlock.element,
      innerHead.element
    );
    const zones = cBlock.connectorZones;
    if (!Array.isArray(zones)) continue;
    const idx = zones.findIndex(z => z.type === 'top-inner');
    if (idx >= 0) {
      cBlock.connectorZones[idx] = new ConnectorZoneModule.ConnectorZone(rect);
    }

    cBlock.connectorZones = cBlock.connectorZones.filter(
      z => z.type !== 'bottom-inner'
    );
    const innerTail = StackChainGraph.stackTailBlock(
      blockRegistry,
      innerHead
    );
    if (innerTail && innerTail.element && innerTail.type !== 'stop-block') {
      const bottomRect = CBlockBottomInner.computeCBlockBottomInnerRect(
        cBlock.element,
        innerTail.element,
        innerTail.type,
        g
      );
      if (bottomRect) {
        cBlock.connectorZones.push(
          new ConnectorZoneModule.ConnectorZone(bottomRect)
        );
      }
    }
  }
}

function getChainTailFromBlock(blockRegistry, startBlockUUID) {
  const tailBlocks = [];
  let currentBlockUUID = startBlockUUID;
  const visitedUUIDs = new Set();
  while (currentBlockUUID && !visitedUUIDs.has(currentBlockUUID)) {
    visitedUUIDs.add(currentBlockUUID);
    const block = blockRegistry.get(currentBlockUUID);
    if (!block || !block.element) break;
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

/** Сброс визуального spread: translate в модельные x/y; исключить UUID (например цепочка на overlay). */
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
  for (const tailBlock of getChainTailFromBlock(
    blockRegistry,
    pivotChildUUID
  )) {
    if (isSpreadExcluded(tailBlock.blockUUID, excludeBlockUUID)) {
      continue;
    }
    const spreadOffsetY = ChainSpreadMath.chainTailSpreadPreviewTranslateY(
      tailBlock.y,
      deltaY
    );
    tailBlock.element.setAttribute(
      'transform',
      `translate(${tailBlock.x}, ${spreadOffsetY})`
    );
  }
}

/** Превью: сдвиг внутреннего стека вниз под призрак в первом слоте (модельные x/y не меняются). */
export function setCBlockInnerStackPreviewSpread(
  blockRegistry,
  cBlock,
  deltaY,
  excludeBlockUUID = null
) {
  if (!cBlock || !cBlock.innerStackHeadUUID || !deltaY || !blockRegistry) return;
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
  if (!innerHead) return;
  for (const b of StackChainDrag.collectChainBlocksFromHead(
    blockRegistry,
    innerHead
  )) {
    if (!b || !b.element) continue;
    if (isSpreadExcluded(b.blockUUID, excludeBlockUUID)) continue;
    b.element.setAttribute(
      'transform',
      `translate(${b.x}, ${b.y + deltaY})`
    );
  }
}

export function clearCBlockInnerStackPreviewSpread(blockRegistry, cBlock) {
  if (!cBlock || !cBlock.innerStackHeadUUID || !blockRegistry) return;
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
  if (!innerHead) return;
  for (const b of StackChainDrag.collectChainBlocksFromHead(
    blockRegistry,
    innerHead
  )) {
    if (!b || !b.element) continue;
    b.element.setAttribute('transform', `translate(${b.x}, ${b.y})`);
  }
}

/** Доп. сдвиг хвоста при middle-preview: высота блока + зазор сокета для start/stop. */
export function ghostSpreadDeltaY(draggedElement) {
  if (!draggedElement || typeof draggedElement.getBBox !== 'function') return 0;
  try {
    const bboxHeight = draggedElement.getBBox().height;
    if (!Number.isFinite(bboxHeight) || bboxHeight <= 0) return 0;
    return bboxHeight + StackHatOffsets.middleTailSpreadExtraY(draggedElement);
  } catch {
    return 0;
  }
}

function buildMiddleZone(parent, child, parentData, childData) {
  const childTop = ConnectorZoneModule.ConnectorZone.zoneByType(
    child.connectorZones,
    'top'
  );
  const parentBottom = ConnectorZoneModule.ConnectorZone.zoneByType(
    parent.connectorZones,
    'bottom'
  );
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

  const inCBlock =
    parentData.type === 'c-block' || childData.type === 'c-block';

  return new ConnectorZoneModule.ConnectorZone({
    type: 'middle',
    x: parentBottom.x,
    y: ChainSpreadMath.middleConnectorHitBandLocalTopY(seamY),
    width: parentBottom.width,
    height: Global.CONNECTOR_THRESHOLD,
    inCBlock,
    linkedChildUUID: child.blockUUID,
  });
}
