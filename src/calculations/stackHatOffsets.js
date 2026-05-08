import * as Global from '../constants/Global.js';

/**
 * Дополнительный сдвиг по Y для **шляпы** (`start-block`) при стыковке в стек.
 * Обычный стек: небольшой зазор, чтобы швы визуально не наезжали.
 * Режим middle: полная «глубина» сокета — как при вставке между блоками.
 *
 * @param {string|undefined} blockDatasetType значение `dataset.type` перетаскиваемого SVG
 * @param {boolean} middleConnector true, если snap идёт в слот middle между родителем и ребёнком
 * @returns {number} пиксели; 0 для не-start блоков
 */
export function hatStackExtraYForWorldSnap(
  blockDatasetType,
  middleConnector
) {
  if (blockDatasetType !== 'start-block') {
    return 0;
  }
  if (middleConnector) {
    return Global.CONNECTOR_SOCKET_HEIGHT;
  }
  return Global.START_BLOCK_NORMAL_STACK_EXTRA_Y;
}

/**
 * Обёртка над {@link hatStackExtraYForWorldSnap}: читает `dataset` у элемента (как раньше `capStackExtraY`).
 *
 * @param {SVGElement|null|undefined} draggedElement
 * @param {{ middleConnector?: boolean }} [options]
 */
export function capStackExtraY(draggedElement, options = {}) {
  const middleConnector = options.middleConnector === true;
  if (!draggedElement || !draggedElement.dataset) {
    return 0;
  }
  return hatStackExtraYForWorldSnap(
    draggedElement.dataset.type,
    middleConnector
  );
}

/**
 * Доп. вертикаль для **раздвижки хвоста** при middle-preview: только шляпа и «крышка» получают
 * зазор сокета — визуально место под вставляемый блок между половинками коннектора.
 *
 * @param {string|undefined} blockDatasetType
 * @returns {number}
 */
export function middleTailSpreadExtraYFromBlockType(blockDatasetType) {
  if (
    blockDatasetType === 'start-block' ||
    blockDatasetType === 'stop-block'
  ) {
    return Global.CONNECTOR_SOCKET_HEIGHT;
  }
  return 0;
}

/**
 * @param {SVGElement|null|undefined} draggedElement
 * @returns {number}
 */
export function middleTailSpreadExtraY(draggedElement) {
  let blockDatasetType;
  if (draggedElement && draggedElement.dataset) {
    blockDatasetType = draggedElement.dataset.type;
  }
  return middleTailSpreadExtraYFromBlockType(blockDatasetType);
}

/**
 * При snap **выше** якоря: если перетаскиваемый блок не шляпа, добавляется микрозазор
 * `START_BLOCK_NORMAL_STACK_EXTRA_Y` (как у обычного стека под start).
 */
export function stackAboveNudgeYForNonStartDragged(draggedElement) {
  if (!draggedElement || !draggedElement.dataset) {
    return 0;
  }
  if (draggedElement.dataset.type !== 'start-block') {
    return Global.START_BLOCK_NORMAL_STACK_EXTRA_Y;
  }
  return 0;
}
