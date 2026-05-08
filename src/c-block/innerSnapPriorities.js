import { pickStackSnapFromCandidates } from '../stack-connect/layout/stackSnapPositions.js';
import { findCBlockBottomInnerHit } from './bottomInnerHit.js';
import {
  findCBlockTopInnerHit,
  isTopInnerGhostEligible,
} from './topInnerHit.js';

/**
 * Приоритет: middle; иначе `bottom-inner` (в хвост внутреннего стека); иначе `top-inner`
 * (prepend у «рта» при непустом внутреннем стеке или первый слот); иначе обычный stack snap.
 */
export function resolveGhostSnapWithTopInnerPriority(
  candidates,
  draggedBlock,
  draggedElement,
  blockRegistry
) {
  const standard = pickStackSnapFromCandidates(candidates);
  if (!draggedBlock || !draggedElement || !blockRegistry) return standard;
  if (standard && standard.mode === 'middle') return standard;

  if (isTopInnerGhostEligible(draggedBlock)) {
    const bottomHit = findCBlockBottomInnerHit(
      draggedBlock,
      draggedElement,
      blockRegistry
    );
    if (bottomHit) {
      return { staticUUID: bottomHit.cBlock.blockUUID, mode: 'bottomInner' };
    }
  }

  if (!isTopInnerGhostEligible(draggedBlock)) return standard;

  const hit = findCBlockTopInnerHit(
    draggedBlock,
    draggedElement,
    blockRegistry
  );
  if (!hit) return standard;

  return { staticUUID: hit.cBlock.blockUUID, mode: 'topInner' };
}
