// C-block editor helpers (nested stack, inner zones, top-inner snap / path stretch).

export { computeCBlockTopInnerRect } from './topInnerConnector.js';
export { findCBlockTopInnerHit, isTopInnerGhostEligible } from './topInnerHit.js';
export { computeTopInnerGhostWorldPosition } from './innerGhostLayout.js';
export {
  buildStretchedCBlockPathD,
  cBlockTopInnerStretchDeltaY,
  getWorkspaceBlockPathElement,
} from './cBlockPathStretchPreview.js';
export { buildCBlockInnerStackStretchedPathD } from './cBlockInnerStackPathStretch.js';
export { resolveGhostSnapWithTopInnerPriority } from './innerSnapPriorities.js';
