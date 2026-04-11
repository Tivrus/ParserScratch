/** Block stack connection eligibility (checks only; no scene graph changes). */
export {
  rectsIntersectClient,
  zoneToClientRect,
  canConnectStackBelow,
  canConnectStackAbove,
  listConnectionCandidates
} from './BlockConnectionCheck.js';

export { ConnectionGhostPreview } from './ConnectionGhostPreview.js';
