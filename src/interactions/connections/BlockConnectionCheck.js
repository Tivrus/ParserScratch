// --- Stack snap rules (no graph mutations) ---

import * as SvgUtils from '../../utils/SvgUtils.js';
import * as ConnectorZoneModule from '../blocks/ConnectorZone.js';
import * as ConnectorClientGeometry from './connectorClientGeometry.js';
import * as StackMiddleJoint from './stackMiddleJoint.js';
import * as StackSocketHit from './stackSocketHit.js';
import * as StackChainGraph from './stackChainGraph.js';

export class BlockConnectionCheck {
  static resolveDraggedBlockUUID(draggedElement, grabManager) {
    const grabWorkspaceBlockUUID = grabManager?.getWorkspaceBlockGrabUUID?.();
    if (grabWorkspaceBlockUUID) {
      return grabWorkspaceBlockUUID;
    }
    return SvgUtils.readWorkspaceBlockUUID(draggedElement) || '';
  }

  static canConnectStackBelow(draggedBlock, targetBlock, blockRegistry = null) {
    if (!ConnectorZoneModule.ConnectorZone.zoneByType(draggedBlock.connectorZones, 'top')) return false;
    if (targetBlock?.nextUUID) return false;
    const resolvedSocket = StackSocketHit.getStackSocketBelow(targetBlock, blockRegistry);
    if (!resolvedSocket) return false;
    return StackSocketHit.draggedOutlineIntersectsSocket(draggedBlock, resolvedSocket);
  }

  static canConnectStackAbove(draggedBlock, targetBlock, blockRegistry = null) {
    if (!ConnectorZoneModule.ConnectorZone.zoneByType(draggedBlock.connectorZones, 'bottom')) return false;
    const resolvedSocket = StackSocketHit.getStackSocketAbove(targetBlock, blockRegistry);
    if (!resolvedSocket) return false;
    return StackSocketHit.draggedOutlineIntersectsSocket(draggedBlock, resolvedSocket);
  }

  /**
   * Held **chain** (≥2 blocks) head overlaps other stack head's **top** socket: prefix held chain, then other.
   * Single-block drags use normal `above` snap instead.
   */
  static canPrefixHeldChainOnOtherHead(draggedBlock, otherHeadBlock, blockRegistry) {
    if (!draggedBlock?.element || !otherHeadBlock?.element || !blockRegistry) return false;
    if (!draggedBlock.nextUUID) return false;
    if (otherHeadBlock.parentUUID) return false;
    const topSocketZone = ConnectorZoneModule.ConnectorZone.zoneByType(otherHeadBlock.connectorZones, 'top');
    if (!topSocketZone) return false;

    const heldChainTail = StackChainGraph.stackTailBlock(blockRegistry, draggedBlock);
    if (!heldChainTail || heldChainTail.type === 'stop-block') return false;

    const draggedClientRect = draggedBlock.element.getBoundingClientRect();
    const topSocketClientRect = ConnectorClientGeometry.zoneToClientRect(otherHeadBlock.element, topSocketZone);
    if (!topSocketClientRect) return false;
    return ConnectorClientGeometry.rectsIntersectClient(draggedClientRect, topSocketClientRect);
  }

  static middleInsertEligibility(draggedBlock, parentBlock, childBlock) {
    if (!draggedBlock?.element || !parentBlock?.element || !childBlock?.element) return false;
    if (draggedBlock.parentUUID || draggedBlock.nextUUID) return false;

    const draggedHasTopSocket = Boolean(
      ConnectorZoneModule.ConnectorZone.zoneByType(draggedBlock.connectorZones, 'top')
    );
    const draggedHasBottomSocket = Boolean(
      ConnectorZoneModule.ConnectorZone.zoneByType(draggedBlock.connectorZones, 'bottom')
    );
    const draggedBlockType = draggedBlock.type;
    if (draggedBlockType === 'start-block') {
      if (!draggedHasBottomSocket) return false;
    } else if (draggedBlockType === 'stop-block') {
      if (!draggedHasTopSocket) return false;
    } else {
      if (!draggedHasTopSocket || !draggedHasBottomSocket) return false;
    }

    if (
      parentBlock.nextUUID !== childBlock.blockUUID ||
      childBlock.parentUUID !== parentBlock.blockUUID
    ) {
      return false;
    }
    return Boolean(StackMiddleJoint.middleJointOnParent(parentBlock, childBlock));
  }

  static canInsertAtMiddleJoint(draggedBlock, parentBlock, childBlock) {
    if (!this.middleInsertEligibility(draggedBlock, parentBlock, childBlock)) {
      return false;
    }
    const middleZone = StackMiddleJoint.middleJointOnParent(parentBlock, childBlock);
    if (!middleZone) {
      return false;
    }
    const draggedClientRect = draggedBlock.element.getBoundingClientRect();
    const middleBandClientRect = StackMiddleJoint.middleJointBandClientRect(
      parentBlock,
      childBlock,
      middleZone
    );
    if (!middleBandClientRect) {
      return false;
    }
    return ConnectorClientGeometry.rectsIntersectClient(draggedClientRect, middleBandClientRect);
  }

  static listConnectionCandidates(draggedElement, blockRegistry, grabManager) {
    const draggedBlockUUID = this.resolveDraggedBlockUUID(draggedElement, grabManager);
    if (!draggedBlockUUID) return [];

    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    const isCapStackBlock =
      draggedBlock?.type === 'start-block' || draggedBlock?.type === 'stop-block';
    if (!draggedBlock || (!draggedBlock.connectorZones?.length && !isCapStackBlock)) return [];

    const candidates = [];

    for (const [otherBlockUUID, otherBlock] of blockRegistry) {
      if (otherBlockUUID === draggedBlockUUID) continue;
      if (!otherBlock?.element || !otherBlock.connectorZones?.length) continue;

      const prefixChainOnOtherHead =
        blockRegistry && this.canPrefixHeldChainOnOtherHead(draggedBlock, otherBlock, blockRegistry);
      const canSnapBelow =
        !prefixChainOnOtherHead && this.canConnectStackBelow(draggedBlock, otherBlock, blockRegistry);
      const canSnapAbove =
        !prefixChainOnOtherHead && this.canConnectStackAbove(draggedBlock, otherBlock, blockRegistry);
      if (prefixChainOnOtherHead || canSnapBelow || canSnapAbove) {
        candidates.push({
          staticUUID: otherBlockUUID,
          below: canSnapBelow,
          above: canSnapAbove,
          prefixOnHead: prefixChainOnOtherHead,
        });
      }
    }

    for (const childBlock of blockRegistry.values()) {
      if (childBlock.blockUUID === draggedBlockUUID || !childBlock.parentUUID) continue;
      const parentBlock = blockRegistry.get(childBlock.parentUUID);
      if (!parentBlock?.element || !childBlock.element) continue;

      if (this.canInsertAtMiddleJoint(draggedBlock, parentBlock, childBlock)) {
        candidates.push({
          staticUUID: childBlock.blockUUID,
          parentUUID: parentBlock.blockUUID,
          middle: true,
          below: false,
          above: false,
        });
      }
    }

    return this.#dropBelowAboveThatDuplicateMiddleJoint(candidates);
  }

  static #dropBelowAboveThatDuplicateMiddleJoint(candidates) {
    const middleChildUUIDByParentUUID = new Map();
    for (const candidate of candidates) {
      if (candidate.middle && candidate.parentUUID != null) {
        middleChildUUIDByParentUUID.set(candidate.parentUUID, candidate.staticUUID);
      }
    }
    if (middleChildUUIDByParentUUID.size === 0) {
      return candidates;
    }

    const middleChildUUIDSet = new Set(middleChildUUIDByParentUUID.values());

    const filteredCandidates = [];
    for (const candidate of candidates) {
      if (candidate.middle) {
        filteredCandidates.push(candidate);
        continue;
      }
      let keepBelow = candidate.below;
      let keepAbove = candidate.above;
      if (keepBelow && middleChildUUIDByParentUUID.has(candidate.staticUUID)) {
        keepBelow = false;
      }
      if (keepAbove && middleChildUUIDSet.has(candidate.staticUUID)) {
        keepAbove = false;
      }
      if (keepBelow || keepAbove || candidate.prefixOnHead) {
        filteredCandidates.push({ ...candidate, below: keepBelow, above: keepAbove });
      }
    }
    return filteredCandidates;
  }
}
