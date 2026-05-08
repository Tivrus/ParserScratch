/**
 * Числовые формулы **стека в мировых координатах**, **сетки рабочей области** и **инерции камеры**
 * после панорамирования (скорость, трение за кадр).
 */

import * as Global from '../constants/Global.js';

// --- snap стека: мировые Y под `#block-world-root` ---

/**
 * Мировая координата Y для snap **ниже** якоря: низ bbox якоря минус перекрытие сокета плюс поправка на тип шляпы.
 */
export function worldYStackBelow(
  anchorTranslateY,
  anchorLocalTopY,
  anchorLocalHeight,
  hatExtraY
) {
  return (
    anchorTranslateY +
    anchorLocalTopY +
    anchorLocalHeight -
    Global.CONNECTOR_SOCKET_HEIGHT +
    hatExtraY
  );
}

/**
 * Мировая Y для snap **выше** якоря: верх якоря + сокет − высота цепочки − поправки на шляпу
 * и на «обычный» стек под start-block.
 */
export function worldYStackAbove(
  anchorTranslateY,
  anchorLocalTopY,
  draggedBlockHeight,
  hatExtraY,
  nonHatStackNudgeY
) {
  return (
    anchorTranslateY +
    anchorLocalTopY +
    Global.CONNECTOR_SOCKET_HEIGHT -
    draggedBlockHeight -
    hatExtraY -
    nonHatStackNudgeY
  );
}

/**
 * Мировая Y **головы** перетаскиваемой цепочки при вставке префиксом на голову существующего стека
 * (`prefixOnHead`): выравнивание по сокету и микрозазору шляпы.
 */
export function worldYPrefixOnHeadGhost(
  anchorHeadTranslateY,
  heldChainHeadHeight
) {
  return (
    anchorHeadTranslateY -
    heldChainHeadHeight +
    Global.CONNECTOR_SOCKET_HEIGHT -
    Global.START_BLOCK_NORMAL_STACK_EXTRA_Y
  );
}

// --- сетка: привязка мировых координат блоков ---

/**
 * Округление мировых координат блока к сетке рабочей области (или к пикселю, если snap выключен).
 *
 * @param {number} x
 * @param {number} y
 * @param {number} [cellPx]
 * @returns {{ x: number; y: number }}
 */
export function snapWorldCoordsToGrid(
  x,
  y,
  cellPx = Global.WORKSPACE_GRID_CELL_PX
) {
  const roundedX = Math.round(Number(x)) || 0;
  const roundedY = Math.round(Number(y)) || 0;
  if (!Global.WORKSPACE_BLOCK_GRID_SNAP.enabled) {
    return { x: roundedX, y: roundedY };
  }
  return {
    x: Math.round(roundedX / cellPx) * cellPx,
    y: Math.round(roundedY / cellPx) * cellPx,
  };
}

// --- инерция камеры: импульс и затухание за кадр (без чтения конфига из Global) ---

/**
 * Длительность жеста не ниже минимума (избегает деления на ноль и «мгновенных» импульсов).
 */
export function coastGestureDurationMs(rawDurationMs, minDurationMs) {
  return Math.max(rawDurationMs, minDurationMs);
}

/**
 * Горизонтальная скорость после нормализации дельты по длительности и усилению импульса.
 */
export function impulseVelocityPxPerMs(
  deltaPixels,
  durationMs,
  impulseGain
) {
  return (deltaPixels / durationMs) * impulseGain;
}

/**
 * Множитель затухания скорости за кадр: `frictionPerMs ** dtMs`.
 */
export function velocityDecayFactorForFrame(frictionPerMs, dtMs) {
  return frictionPerMs ** dtMs;
}

/**
 * Смещение вида за кадр: `velocity * dt` (скорость в px/ms × длительность кадра в ms).
 */
export function offsetDeltaForFrame(velocityPxPerMs, dtMs) {
  return velocityPxPerMs * dtMs;
}
