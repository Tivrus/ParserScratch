import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

// Canonical c-block path (blockShapes) has four `v` commands in order: v40, v16, v24, v-96.
// We only lengthen the inner-stack shelf and the paired closing leg by the same delta each.

const EXPECTED_V_COUNT = 4;

// Indices among all `v` commands in the path (0 = first `v`, …).
const V_INNER_SHELF = 1;
const V_CLOSING_LEG = 3;

const LEGS_TO_STRETCH = [V_INNER_SHELF, V_CLOSING_LEG];

/**
 * Delta applied to each stretched leg, from ghost path height and dragged block type.
 * @param {number} ghostPathHeightPx
 * @param {string|undefined} draggedBlockType
 */
function stretchDeltaPerLegPx(ghostPathHeightPx, draggedBlockType) {
  if (!Number.isFinite(ghostPathHeightPx)) {
    return 0;
  }
  const empty = Global.C_BLOCK_EMPTY_INNER_SPACE;
  if (draggedBlockType === 'stop-block') {
    return ghostPathHeightPx - empty;
  }
  return (
    ghostPathHeightPx -
    empty -
    Global.CONNECTOR_SOCKET_HEIGHT / 2 -
    Global.START_BLOCK_NORMAL_STACK_EXTRA_Y
  );
}

function indicesOfVerticalCommands(commands) {
  const indices = [];
  for (let i = 0; i < commands.length; i++) {
    const { command, args } = commands[i];
    if (typeof command === 'string' && command.toLowerCase() === 'v' && args.length > 0) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * Stretches the inner mouth of a c-block by editing two specific `v` commands.
 * Returns `basePathD` unchanged if the path is not the canonical 4×`v` shape.
 *
 * @param {string} basePathD
 * @param {number} ghostPathHeightPx
 * @param {string|undefined} draggedBlockType
 */
export function buildCBlockInnerStackStretchedPathD(basePathD, ghostPathHeightPx, draggedBlockType) {
  if (typeof basePathD !== 'string' || !basePathD || ghostPathHeightPx <= 0) {
    return basePathD;
  }

  const commands = SvgUtils.parseSvgPath(basePathD);
  const vAt = indicesOfVerticalCommands(commands);
  if (vAt.length !== EXPECTED_V_COUNT) {
    return basePathD;
  }

  const perLeg = stretchDeltaPerLegPx(ghostPathHeightPx, draggedBlockType);
  if (!Number.isFinite(perLeg) || perLeg <= 0) {
    return basePathD;
  }

  for (const legIndex of LEGS_TO_STRETCH) {
    if (legIndex < 0 || legIndex >= vAt.length) {
      return basePathD;
    }
    const cmdIndex = vAt[legIndex];
    const current = commands[cmdIndex].args[0];
    commands[cmdIndex].args[0] = SvgUtils.adjustValue(current, perLeg);
  }

  return SvgUtils.stringifyPath(commands);
}
