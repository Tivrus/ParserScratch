import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as CBlockMath from '../calculations/CBlockMath.js';

function indicesOfVerticalCommands(commands) {
  const indices = [];
  for (let i = 0; i < commands.length; i++) {
    const { command, args } = commands[i];
    if (
      typeof command === 'string' &&
      command.toLowerCase() === 'v' &&
      args.length > 0
    ) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Растягивает «рот» c-block, правя две выбранные команды `v`.
 * Возвращает `basePathD` без изменений, если путь не канонический (4×`v`).
 *
 * @param {string} basePathD
 * @param {number} ghostPathHeightPx
 * @param {string|undefined} draggedBlockType
 */
export function buildCBlockInnerStackStretchedPathD(
  basePathD,
  ghostPathHeightPx,
  draggedBlockType
) {
  if (typeof basePathD !== 'string' || !basePathD || ghostPathHeightPx <= 0) {
    return basePathD;
  }

  const commands = SvgUtils.parseSvgPath(basePathD);
  const vAt = indicesOfVerticalCommands(commands);
  if (vAt.length !== Global.C_BLOCK_CANONICAL_PATH_EXPECTED_V_COUNT) {
    return basePathD;
  }

  const perLeg = CBlockMath.cBlockInnerStackStretchDeltaPerLegPx(
    ghostPathHeightPx,
    draggedBlockType
  );
  if (!Number.isFinite(perLeg) || perLeg <= 0) {
    return basePathD;
  }

  for (const legIndex of Global.C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES) {
    if (legIndex < 0 || legIndex >= vAt.length) {
      return basePathD;
    }
    const cmdIndex = vAt[legIndex];
    const current = commands[cmdIndex].args[0];
    commands[cmdIndex].args[0] = SvgUtils.adjustValue(current, perLeg);
  }

  return SvgUtils.stringifyPath(commands);
}

/**
 * Те же индексы ног, что у {@link buildCBlockInnerStackStretchedPathD}, с явной дельтой на ногу
 * (превью prepend top-inner: суммарная вертикаль ≈ 2× дельта на ногу в каноническом path).
 */
export function buildCBlockInnerStackStretchedPathDWithFixedPerLeg(
  basePathD,
  perLegDeltaPx
) {
  if (
    typeof basePathD !== 'string' ||
    !basePathD ||
    !Number.isFinite(perLegDeltaPx) ||
    perLegDeltaPx <= 0
  ) {
    return basePathD;
  }

  const commands = SvgUtils.parseSvgPath(basePathD);
  const vAt = indicesOfVerticalCommands(commands);
  if (vAt.length !== Global.C_BLOCK_CANONICAL_PATH_EXPECTED_V_COUNT) {
    return basePathD;
  }

  for (const legIndex of Global.C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES) {
    if (legIndex < 0 || legIndex >= vAt.length) {
      return basePathD;
    }
    const cmdIndex = vAt[legIndex];
    const current = commands[cmdIndex].args[0];
    commands[cmdIndex].args[0] = SvgUtils.adjustValue(current, perLegDeltaPx);
  }

  return SvgUtils.stringifyPath(commands);
}
