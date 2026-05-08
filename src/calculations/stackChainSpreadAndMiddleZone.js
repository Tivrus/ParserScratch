import * as Global from '../constants/Global.js';

/**
 * Временный `translate` по Y для блоков **хвоста** цепочки при превью «раздвинуть ниже шва»:
 * модельная `y` блока + величина раздвижки, скорректированная на визуальную геометрию сокета
 * и типичный зазор стека со start-block.
 *
 * @param {number} tailBlockWorldY модельная координата `block.y`
 * @param {number} spreadDeltaY сдвиг из ghost (см. {@link ../blocks/ChainMiddleZone.js})
 */
export function chainTailSpreadPreviewTranslateY(tailBlockWorldY, spreadDeltaY) {
  return (
    tailBlockWorldY +
    spreadDeltaY -
    Global.CONNECTOR_SOCKET_HEIGHT +
    Global.START_BLOCK_NORMAL_STACK_EXTRA_Y
  );
}

/**
 * Локальная координата Y **верхнего края** полосы middle hit-zone на `<g>` родителя,
 * если известна локальная Y центра шва между родителем и ребёнком.
 */
export function middleConnectorHitBandLocalTopY(seamCenterLocalY) {
  return seamCenterLocalY - Global.CONNECTOR_THRESHOLD / 2;
}
