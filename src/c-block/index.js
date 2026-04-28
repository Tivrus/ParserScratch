/**
 * Логика редактора для c-block (вложенный стек, внутренняя область, зоны middle и т.д.).
 * Подключайте новые модули отсюда по мере разработки.
 */

export { computeCBlockTopInnerRect } from './topInnerConnector.js';
export { findCBlockTopInnerHit, isTopInnerGhostEligible } from './topInnerHit.js';
export { computeTopInnerGhostWorldPosition } from './innerGhostLayout.js';
export {
  buildStretchedCBlockPathD,
  cBlockTopInnerStretchDeltaY,
  cBlockVerticalStretchPerVCommand,
  getWorkspaceBlockPathElement,
} from './cBlockPathStretchPreview.js';
export { resolveGhostSnapWithTopInnerPriority } from './innerSnapPriorities.js';
