import * as StackChainDrag from '../blocks/StackChainDrag.js';
import * as Global from '../constants/Global.js';
import * as CBlockMath from '../calculations/CBlockMath.js';
import * as InnerStackAcc from '../calculations/InnerStackNominalHeightMath.js';
import * as MathUtils from '../infrastructure/math/MathUtils.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

function read_DragGhost_SilhouetteHeightPx(draggedElement){
  if (!draggedElement) return 0;
  let pathEl = null;
  if (typeof draggedElement.querySelector === 'function'){
    pathEl = draggedElement.querySelector(':scope > path');
  }
  let height = SvgUtils.getElementBBoxHeight(pathEl);
  if (height > 0) return height;
  return SvgUtils.getElementBBoxHeight(draggedElement);
}

function indicesOfVerticalPathCommands(commands){
  const indices = [];
  for (let i = 0; i < commands.length; i++){
    const { command, args } = commands[i];
    if (
      typeof command === 'string' &&
      command.toLowerCase() === 'v' &&
      args.length > 0
    ){
      indices.push(i);
    }
  }
  return indices;
}

export function calc_CblockTopInner_PreviewPathStretchDeltaPx(draggedElement){
  return MathUtils.clampNonNegative(
    read_DragGhost_SilhouetteHeightPx(draggedElement)
  );
}

export function calc_CblockTopInner_PrependPreviewShiftPx(draggedElement){
  const silhouetteHeightPx = read_DragGhost_SilhouetteHeightPx(draggedElement);
  if (!Number.isFinite(silhouetteHeightPx) || silhouetteHeightPx <= 0) return 0;
  return CBlockMath.calc_CblockTopInner_PrependSpreadClampedPx(silhouetteHeightPx);
}

export function calc_CblockTopInner_PrependInnerStackSpreadPx(
  draggedElement,
  draggedChainEndsWithStopBlock = false
){
  const baseSpreadPx = calc_CblockTopInner_PrependPreviewShiftPx(draggedElement);
  return CBlockMath.calc_CblockTopInner_PrependSpreadTotalPx(
    baseSpreadPx,
    draggedChainEndsWithStopBlock
  );
}

export function build_CblockInnerStack_PathD_WithPerLegDelta(
  basePathD,
  perLegDeltaPx
){
  if (
    typeof basePathD !== 'string' ||
    !basePathD ||
    !Number.isFinite(perLegDeltaPx) ||
    perLegDeltaPx <= 0
  ){
    return basePathD;
  }

  const commands = SvgUtils.parseSvgPath(basePathD);
  const verticalCommandIndices = indicesOfVerticalPathCommands(commands);
  if (
    verticalCommandIndices.length !==
    Global.C_BLOCK_CANONICAL_PATH_EXPECTED_V_COUNT
  ){
    return basePathD;
  }

  for (const legIndex of Global.C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES){
    if (legIndex < 0 || legIndex >= verticalCommandIndices.length){
      return basePathD;
    }
    const commandIndex = verticalCommandIndices[legIndex];
    const current = commands[commandIndex].args[0];
    commands[commandIndex].args[0] = SvgUtils.adjustValue(current, perLegDeltaPx);
  }

  return SvgUtils.stringifyPath(commands);
}

export function build_CblockInnerStack_PathD_WithNominalHeight(
  basePathD,
  innerStackNominalHeightPx,
  innerStackEndsWithStopBlock
){
  if (
    typeof basePathD !== 'string' ||
    !basePathD ||
    innerStackNominalHeightPx <= 0
  ){
    return basePathD;
  }

  const commands = SvgUtils.parseSvgPath(basePathD);
  const verticalCommandIndices = indicesOfVerticalPathCommands(commands);
  if (
    verticalCommandIndices.length !==
    Global.C_BLOCK_CANONICAL_PATH_EXPECTED_V_COUNT
  ){
    return basePathD;
  }

  const perLegDeltaPx =
    CBlockMath.calc_CblockInnerStack_BodyPath_PerLeg_VerticalStretchDeltaPx_ForInnerStackNominalHeight(
      innerStackNominalHeightPx,
      Boolean(innerStackEndsWithStopBlock)
    );
  if (!Number.isFinite(perLegDeltaPx) || perLegDeltaPx <= 0){
    return basePathD;
  }

  for (const legIndex of Global.C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES){
    if (legIndex < 0 || legIndex >= verticalCommandIndices.length){
      return basePathD;
    }
    const commandIndex = verticalCommandIndices[legIndex];
    const current = commands[commandIndex].args[0];
    commands[commandIndex].args[0] = SvgUtils.adjustValue(current, perLegDeltaPx);
  }

  return SvgUtils.stringifyPath(commands);
}

export function build_CblockInnerStack_PathD_StretchedFromGhostHeight(
  basePathD,
  ghostHeightPx,
  isInnerStackEmpty = true,
  draggedChainEndsWithStopBlock = false
){
  if (!basePathD || !Number.isFinite(ghostHeightPx) || ghostHeightPx <= 0){
    return basePathD;
  }
  return build_CblockInnerStack_PathD_WithPerLegDelta(
    basePathD,
    CBlockMath.calc_CblockInnerStack_BodyPath_PerLeg_VerticalStretchPx_FromGhostHeight_ForTopInnerPreview(
      ghostHeightPx,
      isInnerStackEmpty,
      draggedChainEndsWithStopBlock
    )
  );
}

export function find_CblockWorkspace_PathElement(block){
  if (!block || !block.element || typeof block.element.querySelector !== 'function'){
    return null;
  }
  const pathNode = block.element.querySelector(':scope > path');
  if (!(pathNode instanceof SVGPathElement)){
    return null;
  }
  return pathNode;
}

export function measure_CblockInnerStack_NominalHeightPx(
  blockRegistry,
  innerHead,
  prepareBlockData
){
  if (!innerHead || typeof prepareBlockData !== 'function'){
    return 0;
  }
  const chain = StackChainDrag.collect_StackChain_BlocksFromHead(
    blockRegistry,
    innerHead
  );
  if (!chain.length){
    return 0;
  }
  const orderedHeightsPx = [];
  for (let i = 0; i < chain.length; i++){
    const blockData = prepareBlockData(chain[i].blockKey);
    let blockHeight = Global.DEFAULT_BLOCK_HEIGHT;
    if (
      blockData &&
      blockData.height != null &&
      Number.isFinite(Number(blockData.height)) &&
      Number(blockData.height) > 0
    ){
      blockHeight = Number(blockData.height);
    }
    orderedHeightsPx.push(blockHeight);
  }
  return MathUtils.clampNonNegative(
    InnerStackAcc.calc_InnerStack_NominalHeightPx(
      orderedHeightsPx
    )
  );
}

export function measure_CblockInnerStack_WorldHeightPx(blockRegistry, innerHead){
  if (
    !innerHead ||
    !innerHead.element ||
    typeof innerHead.element.getBBox !== 'function'
  ){
    return 0;
  }
  let minY = Infinity;
  let maxY = -Infinity;
  for (const block of StackChainDrag.collect_StackChain_BlocksFromHead(
    blockRegistry,
    innerHead
  )){
    const bbox = SvgUtils.getElementBBox(block.element);
    if (!bbox) continue;

    const { y: translateY } = SvgUtils.parseTranslateTransform(block.element);
    const top = translateY + bbox.y;
    const bottom = translateY + bbox.y + bbox.height;
    minY = Math.min(minY, top);
    maxY = Math.max(maxY, bottom);
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)){
    return 0;
  }
  return MathUtils.clampNonNegative(maxY - minY);
}

export function apply_CblockWorkspace_InnerStackPathStretch(
  blockRegistry,
  cBlock,
  prepareBlockData
){
  const pathEl = find_CblockWorkspace_PathElement(cBlock);
  if (!pathEl || typeof prepareBlockData !== 'function'){
    return;
  }
  const data = prepareBlockData(cBlock.blockKey);
  let basePathD = null;
  if (data && data.pathData !== undefined){
    basePathD = data.pathData;
  }
  if (typeof basePathD !== 'string' || !basePathD){
    return;
  }

  let innerStackNominalHeightPx = 0;
  let innerStackEndsWithStop = false;
  if (cBlock.innerStackHeadUUID){
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
    if (innerHead){
      innerStackEndsWithStop = StackChainDrag.is_WorkspaceChain_EndsWithStopBlock(
        blockRegistry,
        innerHead
      );
      innerStackNominalHeightPx = measure_CblockInnerStack_NominalHeightPx(
        blockRegistry,
        innerHead,
        prepareBlockData
      );
    }
  }

  if (innerStackNominalHeightPx <= 0){
    pathEl.setAttribute('d', basePathD);
    return;
  }
  pathEl.setAttribute(
    'd',
    build_CblockInnerStack_PathD_WithNominalHeight(
      basePathD,
      innerStackNominalHeightPx,
      innerStackEndsWithStop
    )
  );
}
