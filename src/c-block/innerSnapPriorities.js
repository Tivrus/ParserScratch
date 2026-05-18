import * as StackSnapPositions from '../stack-connect/layout/stackSnapPositions.js';
import * as BottomInnerHit from './bottomInnerHit.js';
import * as TopInnerHit from './topInnerHit.js';

export function resolveGhostSnapWithTopInnerPriority(
  candidates,
  draggedBlock,
  draggedElement,
  blockRegistry
){
  const standard = StackSnapPositions.pickStackSnapFromCandidates(candidates);
  if (!draggedBlock || !draggedElement || !blockRegistry) return standard;
  if (standard && standard.mode === 'middle') return standard;

  if (TopInnerHit.isTopInnerGhostEligible(draggedBlock)){
    const bottomHit = BottomInnerHit.findCBlockBottomInnerHit(
      draggedBlock,
      draggedElement,
      blockRegistry
    );
    if (bottomHit){
      return { snapUUID: bottomHit.cBlock.blockUUID, mode: 'bottomInner' };
    }
  }

  if (!TopInnerHit.isTopInnerGhostEligible(draggedBlock)) return standard;

  const hit = TopInnerHit.findCBlockTopInnerHit(
    draggedBlock,
    draggedElement,
    blockRegistry
  );
  if (!hit) return standard;

  return { snapUUID: hit.cBlock.blockUUID, mode: 'topInner' };
}
