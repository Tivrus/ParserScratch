/**
 * Все числовые формулы, связанные с **c-block**: слоты top-inner / bottom-inner, мировая позиция
 * призрака, бюджеты растяжения path и дельты на ноги `v` внутреннего стека.
 */

import * as Global from '../constants/Global.js';
import { clampNonNegative } from '../infrastructure/math/MathUtils.js';

// --- top-inner: локальные rect в системе `<g>` c-block ---

/**
 * Локальная Y верхнего края слота `top-inner` для **пустого** «рта» c-block (номинальный корпус).
 * Сумма половин порога, полного порога и половины сокета выравнивает полосу относительно path.
 */
export function topInnerEmptyMouthSlotLocalY() {
  const thresholdPx = Global.CONNECTOR_THRESHOLD;
  return (
    thresholdPx / 2 +
    thresholdPx -
    Global.CONNECTOR_SOCKET_HEIGHT / 2
  );
}

/**
 * Локальная Y верхнего края `top-inner`, когда внутри c-block уже есть стек:
 * полоса на пол-высоты выше верхней границы первого внутреннего блока (в локальных Y c-block).
 *
 * @param {number} innerStackHeadTopLocalY верх первого внутреннего блока в системе c-block `<g>`
 */
export function topInnerSlotLocalYWhenInnerStackPresent(innerStackHeadTopLocalY) {
  return innerStackHeadTopLocalY - Global.CONNECTOR_THRESHOLD / 2;
}

// --- bottom-inner: синтетическая зона хвоста и полоса hit ---

/**
 * Локальная Y синтетической нижней зоны хвоста внутреннего стека (для перевода в координаты c-block).
 * Смещение от `bottomBaseY` геометрии хвостового блока с учётом глубины сокета и константного оффсета.
 */
export function syntheticInnerTailBottomZoneLocalY(bottomBaseY) {
  return (
    bottomBaseY -
    Global.CONNECTOR_SOCKET_HEIGHT +
    Global.CONNECTOR_OFFSETS.BOTTOM_Y
  );
}

/**
 * Локальная Y верхнего края полосы `bottom-inner` на `<g>` c-block, если известен центр шва
 * между хвостом и «дном рта» (в локальных Y c-block).
 */
export function bottomInnerHitBandLocalTopY(seamCenterLocalY, bandHeightPx) {
  return seamCenterLocalY - bandHeightPx;
}

// --- мировые координаты призрака top-inner ---

/**
 * Мировая Y левого верхнего угла призрака при snap во **внутренний** слот c-block (`top-inner`).
 * Слот задаётся номинальным rect; поправка на толщину hit-полосы и половину сокета + зазор шляпы.
 */
export function topInnerGhostWorldY(
  cBlockTranslateY,
  slotTopLocalY,
  slotHeightPx,
  hatExtraY
) {
  return (
    cBlockTranslateY +
    slotTopLocalY +
    slotHeightPx -
    Global.CONNECTOR_THRESHOLD +
    Global.CONNECTOR_SOCKET_HEIGHT / 2 +
    hatExtraY
  );
}

/**
 * Мировая X: смещение c-block + локальный левый край слота.
 */
export function topInnerGhostWorldX(cBlockTranslateX, slotLeftLocalX) {
  return cBlockTranslateX + slotLeftLocalX;
}

// --- path: prepend / превью / растяжение «рта» ---

/**
 * Сырой сдвиг prepend top-inner: высота силуэта минус глубина сокета (ещё без clamp).
 */
export function prependPreviewShiftRawPx(silhouetteHeightPx) {
  return silhouetteHeightPx - Global.CONNECTOR_SOCKET_HEIGHT;
}

/**
 * Неотрицательный сдвиг превью prepend (см. `cBlockTopInnerPrependPreviewShiftY`).
 */
export function prependPreviewShiftClampedPx(silhouetteHeightPx) {
  return clampNonNegative(prependPreviewShiftRawPx(silhouetteHeightPx));
}

/**
 * Дополнительный сдвиг вниз для **существующей** внутренней цепочки при prepend, если перетаскивается stop-block.
 */
export function prependInnerStackSpreadExtraForStopBlockPx() {
  return Global.CONNECTOR_SOCKET_HEIGHT;
}

/**
 * Суммарный spread внутреннего стека: база + доп. для stop.
 *
 * @param {number} baseShiftPx результат `prependPreviewShiftClampedPx`
 * @param {string|undefined} draggedBlockType
 */
export function prependInnerStackSpreadTotalPx(baseShiftPx, draggedBlockType) {
  if (draggedBlockType === 'stop-block') {
    return baseShiftPx + prependInnerStackSpreadExtraForStopBlockPx();
  }
  return baseShiftPx;
}

/**
 * Дельта высоты path на одну «ногу» при превью top-inner с фиксированной дельтой на ногу:
 * половина полной высоты призрака (две ноги в сумме дают `ghostHeightPx`).
 */
export function ghostHeightPerVerticalLegPx(ghostHeightPx) {
  return ghostHeightPx / 2;
}

/**
 * На сколько пикселей удлинить **каждую** из двух выбранных вертикальных ног path c-block
 * при растяжении «рта» под внутренний стек (зависит от типа головы цепочки внутри).
 *
 * @param {number} ghostPathHeightPx целевая высота «рта»
 * @param {string|undefined} draggedBlockType тип первого блока внутреннего стека / перетаскиваемого
 * @returns {number} дельта на одну команду `v`; ≤0 означает «не растягивать»
 */
export function cBlockInnerStackStretchDeltaPerLegPx(
  ghostPathHeightPx,
  draggedBlockType
) {
  if (!Number.isFinite(ghostPathHeightPx)) {
    return 0;
  }
  const emptyInnerSpacePx = Global.C_BLOCK_EMPTY_INNER_SPACE;
  if (draggedBlockType === 'stop-block') {
    return ghostPathHeightPx - emptyInnerSpacePx;
  }
  return (
    ghostPathHeightPx -
    emptyInnerSpacePx -
    Global.CONNECTOR_SOCKET_HEIGHT / 2 -
    Global.START_BLOCK_NORMAL_STACK_EXTRA_Y * 2
  );
}
