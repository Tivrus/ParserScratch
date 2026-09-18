import * as StackChainDrag from '../../blocks/StackChainDrag.js'
import * as Global from '../../constants/Global.js'
import * as CBlockMath from '../../calculations/CBlockMath.js'
import * as MathUtils from '../../utils/MathUtils.js'
import * as SvgUtils from '../../utils/SvgUtils.js'

function read_DragGhost_SilhouetteHeightPx(draggedElement){
  const pathEl = draggedElement?.querySelector(':scope > path')
  return SvgUtils.get_Height(pathEl) || SvgUtils.get_Height(draggedElement)
}

function indicesOfVerticalPathCommands(commands){
  const indices = []
  for (let i = 0; i < commands.length; i++){
    const { command, args } = commands[i]
    if (
      typeof command === 'string' &&
      command.toLowerCase() === 'v' &&
      args.length > 0
    ){
      indices.push(i)
    }
  }
  return indices
}

function parseCBlockPath(basePathD){
  if (typeof basePathD !== 'string' || !basePathD) return null

  const commands = SvgUtils.parseSvgPath(basePathD)
  return { commands, verticalIndices: indicesOfVerticalPathCommands(commands) }
}

function buildPathWithStretchedInnerLegs(basePathD, perLegDelta){
  if (!Number.isFinite(perLegDelta) || perLegDelta <= 0) return basePathD

  const path = parseCBlockPath(basePathD)
  if (!path) return basePathD

  for (const legIndex of Global.C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES){
    const commandIndex = path.verticalIndices[legIndex]
    const command = path.commands[commandIndex]
    if (!command?.args.length) return basePathD
    command.args[0] = SvgUtils.adjustValue(command.args[0], perLegDelta)
  }
  return SvgUtils.stringifyPath(path.commands)
}

export function calc_CblockTopInner_PathStretchDelta(draggedElement){
  return MathUtils.clampNonNegative(
    read_DragGhost_SilhouetteHeightPx(draggedElement)
  )
}

export function calc_CblockTopInner_PrependShift(draggedElement){
  const height = read_DragGhost_SilhouetteHeightPx(draggedElement)
  if (!Number.isFinite(height) || height <= 0) return 0
  return CBlockMath.calc_PrependSpread(height)
}

export function calc_CblockTopInner_PrependSpread(
  draggedElement,
  endsWithStop = false
){
  const baseSpread = calc_CblockTopInner_PrependShift(draggedElement)
  return CBlockMath.calc_PrependSpread_Total(baseSpread, endsWithStop)
}

export function build_CblockInnerStack_PathD_FromLegDelta(
  basePathD,
  perLegDelta
){
  return buildPathWithStretchedInnerLegs(basePathD, perLegDelta)
}

export function build_CblockInnerStack_PathD_FromNominalHeight(
  basePathD,
  stackHeight,
  endsWithStop
){
  const perLegDelta = CBlockMath.calc_PathStretch_FromStack(
    stackHeight,
    Boolean(endsWithStop)
  )
  return buildPathWithStretchedInnerLegs(basePathD, perLegDelta)
}

export function build_CblockInnerStack_PathD_FromGhostHeight(
  basePathD,
  ghostHeight,
  isEmpty = true,
  endsWithStop = false
){
  if (!basePathD || !Number.isFinite(ghostHeight) || ghostHeight <= 0){
    return basePathD
  }
  return build_CblockInnerStack_PathD_FromLegDelta(
    basePathD,
    CBlockMath.calc_PathStretch_FromGhost(ghostHeight, isEmpty, endsWithStop)
  )
}


export function find_Cblock_PathEl(block){
  const pathNode = block?.element?.querySelector(':scope > path')
  if (!(pathNode instanceof SVGPathElement)){
    return null
  }
  return pathNode
}

export function calc_InnerStackHeight(
  blockRegistry,
  innerHead,
  prepareBlockData
){
  if (!innerHead || typeof prepareBlockData !== 'function') return 0
  const chain = StackChainDrag.collect_Chain(
    blockRegistry,
    innerHead
  )
  if (!chain.length){
    return 0
  }
  const orderedHeightsPx = chain.map(block => {
    const height = Number(prepareBlockData(block.blockKey)?.height)
    return height > 0 && Number.isFinite(height)
      ? height
      : Global.DEFAULT_BLOCK_HEIGHT
  })
  return MathUtils.clampNonNegative(
    CBlockMath.calc_InnerStackHeight(orderedHeightsPx)
  )
}

export function apply_CblockInnerStack_PathStretch(
  blockRegistry,
  cBlock,
  prepareBlockData
){
  const pathEl = find_Cblock_PathEl(cBlock)
  if (!pathEl || typeof prepareBlockData !== 'function') return

  const basePathD = prepareBlockData(cBlock.blockKey)?.pathData
  if (typeof basePathD !== 'string' || !basePathD) return

  let innerStackNominalHeightPx = 0
  let innerStackEndsWithStop = false
  const innerHead = cBlock.innerStackHeadUUID && blockRegistry.get(cBlock.innerStackHeadUUID)
  if (innerHead){
    innerStackEndsWithStop = StackChainDrag.is_ChainEndsWithStop(
      blockRegistry,
      innerHead
    )
    innerStackNominalHeightPx = calc_InnerStackHeight(
      blockRegistry,
      innerHead,
      prepareBlockData
    )
  }

  if (innerStackNominalHeightPx <= 0){
    pathEl.setAttribute('d', basePathD)
    return
  }
  pathEl.setAttribute(
    'd',
    build_CblockInnerStack_PathD_FromNominalHeight(
      basePathD,
      innerStackNominalHeightPx,
      innerStackEndsWithStop
    )
  )
}
