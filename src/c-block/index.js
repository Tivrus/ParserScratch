/** Вспомогательные функции c-block: вложенный стек, зоны, snap top-inner / bottom-inner, растяжение path. */

export { buildCBlockInnerStackStretchedPathD } from './cBlockInnerStackPathStretch.js';
export {
  applyWorkspaceCBlockInnerStretch,
  buildStretchedCBlockPathD,
  buildStretchedCBlockPathDFromGhostHeight,
  cBlockTopInnerPrependInnerStackSpreadY,
  cBlockTopInnerPrependPreviewShiftY,
  cBlockTopInnerStretchDeltaY,
  getWorkspaceBlockPathElement,
  measureInnerStackNominalHeightPx,
  measureInnerStackWorldHeightPx,
} from './cBlockPathStretchPreview.js';
export { computeTopInnerGhostWorldPosition } from './innerGhostLayout.js';
export { resolveGhostSnapWithTopInnerPriority } from './innerSnapPriorities.js';
export { computeCBlockBottomInnerRect } from './bottomInnerConnector.js';
export { findCBlockBottomInnerHit } from './bottomInnerHit.js';
export { computeCBlockTopInnerRect, computeCBlockTopInnerRectWithInnerStack } from './topInnerConnector.js';
export {
  findCBlockTopInnerHit,
  isTopInnerGhostEligible,
} from './topInnerHit.js';
