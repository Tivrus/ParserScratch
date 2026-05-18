/** Правила stack snap без изменения графа блоков. */

import * as SvgUtils from '../../infrastructure/svg/SvgUtils.js';
import * as ZoneModule from '../../blocks/ZoneModule.js';
import * as ZoneClientGeometry from './ZoneClientGeometry.js';
import * as StackMiddleJoint from './stackMiddleJoint.js';
import * as StackSocketHit from './stackSocketHit.js';
import * as StackChainGraph from '../layout/stackChainGraph.js';

export class BlockConnectionCheck {
  static resolveDraggedBlockUUID(draggedElement, grabManager){
    let grabWorkspaceBlockUUID = '';
    if (
      grabManager &&
      typeof grabManager.getWorkspaceBlockGrabUUID === 'function'
    ){
      const uuidFromGrab = grabManager.getWorkspaceBlockGrabUUID();
      if (uuidFromGrab){
        grabWorkspaceBlockUUID = uuidFromGrab;
      }
    }
    if (grabWorkspaceBlockUUID){
      return grabWorkspaceBlockUUID;
    }
    return SvgUtils.readWorkspaceBlockUUID(draggedElement) || '';
  }

  static canConnectStackBelow(draggedBlock, targetBlock, blockRegistry = null){
    if (
      !ZoneModule.Zone.zoneByType(
        draggedBlock.Zones,
        'top'
      )
    )
      return false;
    if (targetBlock && targetBlock.nextUUID) return false;
    const resolvedSocket = StackSocketHit.getStackSocketBelow(
      targetBlock,
      blockRegistry
    );
    if (!resolvedSocket) return false;
    return StackSocketHit.draggedOutlineIntersectsSocket(
      draggedBlock,
      resolvedSocket
    );
  }

  static canConnectStackAbove(draggedBlock, targetBlock, blockRegistry = null){
    if (
      !ZoneModule.Zone.zoneByType(
        draggedBlock.Zones,
        'bottom'
      )
    )
      return false;
    const resolvedSocket = StackSocketHit.getStackSocketAbove(
      targetBlock,
      blockRegistry
    );
    if (!resolvedSocket) return false;
    return StackSocketHit.draggedOutlineIntersectsSocket(
      draggedBlock,
      resolvedSocket
    );
  }

  /**
   * Held **chain** (≥2 blocks) head overlaps other stack head's **top** socket: prefix held chain, then other.
   * Single-block drags use normal `above` snap instead.
   */
  static canPrefixHeldChainOnOtherHead(
    draggedBlock,
    otherHeadBlock,
    blockRegistry
  ){
    if (
      !draggedBlock ||
      !draggedBlock.element ||
      !otherHeadBlock ||
      !otherHeadBlock.element ||
      !blockRegistry
    )
      return false;
    if (
      otherHeadBlock.type === 'c-block' &&
      StackChainGraph.isBlockOnCBlockInnerSubstack(
        draggedBlock,
        otherHeadBlock,
        blockRegistry
      )
    ){
      return false;
    }
    if (!draggedBlock.nextUUID) return false;
    if (otherHeadBlock.parentUUID) return false;
    const topSocketZone = ZoneModule.Zone.zoneByType(
      otherHeadBlock.Zones,
      'top'
    );
    if (!topSocketZone) return false;

    const heldChainTail = StackChainGraph.stackTailBlock(
      blockRegistry,
      draggedBlock
    );
    if (!heldChainTail || heldChainTail.type === 'stop-block') return false;

    const draggedClientRect = draggedBlock.element.getBoundingClientRect();
    const topSocketClientRect = ZoneClientGeometry.zoneToClientRect(
      otherHeadBlock.element,
      topSocketZone
    );
    if (!topSocketClientRect) return false;
    return ZoneClientGeometry.rectsIntersectClient(
      draggedClientRect,
      topSocketClientRect
    );
  }

  static middleInsertEligibility(
    draggedBlock,
    parentBlock,
    childBlock,
    blockRegistry = null
  ){
    if (
      !draggedBlock ||
      !draggedBlock.element ||
      !parentBlock ||
      !parentBlock.element ||
      !childBlock ||
      !childBlock.element
    )
      return false;
    if (draggedBlock.parentUUID || draggedBlock.nextUUID) return false;

    if (
      draggedBlock.type === 'c-block' &&
      blockRegistry &&
      (StackChainGraph.isBlockOnCBlockInnerSubstack(
        parentBlock,
        draggedBlock,
        blockRegistry
      ) ||
        StackChainGraph.isBlockOnCBlockInnerSubstack(
          childBlock,
          draggedBlock,
          blockRegistry
        ))
    ){
      return false;
    }

    if (blockRegistry){
      for (const end of [parentBlock, childBlock]){
        if (
          end &&
          end.type === 'c-block' &&
          StackChainGraph.isBlockOnCBlockInnerSubstack(
            draggedBlock,
            end,
            blockRegistry
          )
        ){
          return false;
        }
      }
    }

    const draggedHasTopSocket = Boolean(
      ZoneModule.Zone.zoneByType(
        draggedBlock.Zones,
        'top'
      )
    );
    const draggedHasBottomSocket = Boolean(
      ZoneModule.Zone.zoneByType(
        draggedBlock.Zones,
        'bottom'
      )
    );
    const draggedBlockType = draggedBlock.type;
    if (draggedBlockType === 'start-block'){
      if (!draggedHasBottomSocket) return false;
    } else if (draggedBlockType === 'stop-block'){
      if (!draggedHasTopSocket) return false;
    } else {
      if (!draggedHasTopSocket || !draggedHasBottomSocket) return false;
    }

    if (
      parentBlock.nextUUID !== childBlock.blockUUID ||
      childBlock.parentUUID !== parentBlock.blockUUID
    ){
      return false;
    }
    return Boolean(
      StackMiddleJoint.middleJointOnParent(parentBlock, childBlock)
    );
  }

  static canInsertAtMiddleJoint(
    draggedBlock,
    parentBlock,
    childBlock,
    blockRegistry
  ){
    if (
      !this.middleInsertEligibility(
        draggedBlock,
        parentBlock,
        childBlock,
        blockRegistry
      )
    ){
      return false;
    }
    const middleZone = StackMiddleJoint.middleJointOnParent(
      parentBlock,
      childBlock
    );
    if (!middleZone){
      return false;
    }
    const draggedClientRect = draggedBlock.element.getBoundingClientRect();
    const middleBandClientRect = StackMiddleJoint.middleJointBandClientRect(
      parentBlock,
      childBlock,
      middleZone
    );
    if (!middleBandClientRect){
      return false;
    }
    return ZoneClientGeometry.rectsIntersectClient(
      draggedClientRect,
      middleBandClientRect
    );
  }

  static listConnectionCandidates(draggedElement, blockRegistry, grabManager){
    const draggedBlockUUID = this.resolveDraggedBlockUUID(
      draggedElement,
      grabManager
    );
    if (!draggedBlockUUID) return [];

    const draggedBlock = blockRegistry.get(draggedBlockUUID);
    let isCapStackBlock = false;
    if (draggedBlock){
      if (
        draggedBlock.type === 'start-block' ||
        draggedBlock.type === 'stop-block'
      ){
        isCapStackBlock = true;
      }
    }
    const ZoneCount =
      draggedBlock &&
      draggedBlock.Zones &&
      draggedBlock.Zones.length;
    if (!draggedBlock || (!ZoneCount && !isCapStackBlock)) return [];

    const candidates = [];

    for (const [otherBlockUUID, otherBlock] of blockRegistry){
      if (otherBlockUUID === draggedBlockUUID) continue;
      if (!otherBlock || !otherBlock.element) continue;
      const otherZones = otherBlock.Zones;
      if (!otherZones || !otherZones.length) continue;

      if (
        draggedBlock.type === 'c-block' &&
        StackChainGraph.isBlockOnCBlockInnerSubstack(
          otherBlock,
          draggedBlock,
          blockRegistry
        )
      ){
        continue;
      }

      if (
        otherBlock.type === 'c-block' &&
        StackChainGraph.isBlockOnCBlockInnerSubstack(
          draggedBlock,
          otherBlock,
          blockRegistry
        )
      ){
        continue;
      }

      const prefixChainOnOtherHead =
        blockRegistry &&
        this.canPrefixHeldChainOnOtherHead(
          draggedBlock,
          otherBlock,
          blockRegistry
        );
      const canSnapBelow =
        !prefixChainOnOtherHead &&
        this.canConnectStackBelow(draggedBlock, otherBlock, blockRegistry);
      const canSnapAbove =
        !prefixChainOnOtherHead &&
        this.canConnectStackAbove(draggedBlock, otherBlock, blockRegistry);
      if (prefixChainOnOtherHead || canSnapBelow || canSnapAbove){
        candidates.push({
          snapUUID: otherBlockUUID,
          below: canSnapBelow,
          above: canSnapAbove,
          prefixOnHead: prefixChainOnOtherHead,
        });
      }
    }

    for (const childBlock of blockRegistry.values()){
      if (childBlock.blockUUID === draggedBlockUUID || !childBlock.parentUUID)
        continue;
      const parentBlock = blockRegistry.get(childBlock.parentUUID);
      if (!parentBlock || !parentBlock.element || !childBlock.element) continue;

      if (
        this.canInsertAtMiddleJoint(
          draggedBlock,
          parentBlock,
          childBlock,
          blockRegistry
        )
      ){
        candidates.push({
          snapUUID: childBlock.blockUUID,
          parentUUID: parentBlock.blockUUID,
          middle: true,
          below: false,
          above: false,
        });
      }
    }

    return this.#dropBelowAboveThatDuplicateMiddleJoint(candidates);
  }

  static #dropBelowAboveThatDuplicateMiddleJoint(candidates){
    const middleChildUUIDByParentUUID = new Map();
    for (const candidate of candidates){
      if (candidate.middle && candidate.parentUUID != null){
        middleChildUUIDByParentUUID.set(
          candidate.parentUUID,
          candidate.snapUUID
        );
      }
    }
    if (middleChildUUIDByParentUUID.size === 0){
      return candidates;
    }

    const middleChildUUIDSet = new Set(middleChildUUIDByParentUUID.values());

    const filteredCandidates = [];
    for (const candidate of candidates){
      if (candidate.middle){
        filteredCandidates.push(candidate);
        continue;
      }
      let keepBelow = candidate.below;
      let keepAbove = candidate.above;
      if (keepBelow && middleChildUUIDByParentUUID.has(candidate.snapUUID)){
        keepBelow = false;
      }
      if (keepAbove && middleChildUUIDSet.has(candidate.snapUUID)){
        keepAbove = false;
      }
      if (keepBelow || keepAbove || candidate.prefixOnHead){
        filteredCandidates.push({
          ...candidate,
          below: keepBelow,
          above: keepAbove,
        });
      }
    }
    return filteredCandidates;
  }
}
