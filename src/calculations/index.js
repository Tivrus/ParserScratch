/**
 * Централизованные **числовые** формулы рабочей области: стеки, коннекторы, c-block, сетка, камера.
 * DOM, hit-test и обход графа блоков остаются в соответствующих модулях; здесь только выражения
 * из констант {@link ../constants/Global.js} и координат, уже извлечённых из SVG.
 */

export * from './stackHatOffsets.js';
export * from './StackWorkspaceMath.js';
export * from './stackChainSpreadAndMiddleZone.js';
export * from './stackSeamClientMath.js';
export * from './CBlockMath.js';
export * from './connectorZoneLocalMath.js';
export * from './innerStackNominalHeightAccumulation.js';
export * from './middleJointClientBand.js';
