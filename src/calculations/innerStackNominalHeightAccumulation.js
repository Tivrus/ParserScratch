import * as Global from '../constants/Global.js';

/**
 * Номинальная высота вертикального стека блоков: первый блок полностью, каждый следующий
 * «наезжает» на предыдущий на величину сокета (как визуально стыкуются блоки).
 *
 * @param {number[]} orderedBlockHeightsPx высоты от головы к хвосту
 * @param {number} [connectorSocketHeightPx] по умолчанию из Global
 * @returns {number}
 */
export function accumulateStackedBlockHeightsPx(
  orderedBlockHeightsPx,
  connectorSocketHeightPx = Global.CONNECTOR_SOCKET_HEIGHT
) {
  if (!orderedBlockHeightsPx.length) {
    return 0;
  }
  let totalPx = orderedBlockHeightsPx[0];
  for (let index = 1; index < orderedBlockHeightsPx.length; index++) {
    totalPx += orderedBlockHeightsPx[index] - connectorSocketHeightPx;
  }
  return totalPx;
}
