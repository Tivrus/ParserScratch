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
export { calcTopInnerGhostWorldPosition } from './innerGhostLayout.js';
export {
  layoutInnerStackUnderCBlock,
  layoutAllCBlockInnerStacks,
} from './cBlockInnerStackWorkspaceLayout.js';
export { resolveGhostSnapWithTopInnerPriority } from './innerSnapPriorities.js';
export { calcCBlockBottomInnerRect } from './bottomInnerZone.js';
export { findCBlockBottomInnerHit } from './bottomInnerHit.js';
export {
  calcCBlockTopInnerWhenIsEmpty,
  calcCBlockTopInner,
} from './topInnerZone.js';
export {
  findCBlockTopInnerHit,
  isTopInnerGhostEligible,
} from './topInnerHit.js';
