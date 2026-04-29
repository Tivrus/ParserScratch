import { pickStackSnapFromCandidates } from '../stack-connect/layout/stackSnapPositions.js';
import { findCBlockTopInnerHit, isTopInnerGhostEligible } from './topInnerHit.js';

/**
 * Middle insert wins; else c-block `top-inner` overlap when the held head is eligible (chain OK, not start-block); else default stack snap.
 */
export function resolveGhostSnapWithTopInnerPriority(
  candidates,
  draggedBlock,
  draggedElement,
  blockRegistry
) {
  const standard = pickStackSnapFromCandidates(candidates);
  if (!draggedBlock || !draggedElement || !blockRegistry) return standard;
  if (standard?.mode === 'middle') return standard;

  if (!isTopInnerGhostEligible(draggedBlock)) return standard;

  const hit = findCBlockTopInnerHit(draggedBlock, draggedElement, blockRegistry);
  if (!hit) return standard;

  return { staticUUID: hit.cBlock.blockUUID, mode: 'topInner' };
}
