import * as StackChainDrag from '../blocks/StackChainDrag.js';
import * as CBlockInnerGhostPos from './CBlockInnerGhostPos.js';
import * as StackSnapWorldLayout from '../stack-connect/stackSnapWorldLayout.js';

export function layout_CblockInnerStack_Blocks(blockRegistry, cBlock){
  if (!cBlock || !cBlock.innerStackHeadUUID || !cBlock.element) return;

  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
  if (!innerHead || !innerHead.element) return;
  const worldPos = CBlockInnerGhostPos.calc_CblockTopInnerGhost_WorldPos(cBlock);
  if (!worldPos) return;
  innerHead.setPosition(Math.round(worldPos.x), Math.round(worldPos.y));
  StackSnapWorldLayout.reposition_FollowingStackBlocks(
    innerHead,
    blockRegistry
  );

  let currentBlock = innerHead;
  const visitedUUIDs = new Set();
  while (
    currentBlock &&
    currentBlock.blockUUID &&
    !visitedUUIDs.has(currentBlock.blockUUID)
  ){
    visitedUUIDs.add(currentBlock.blockUUID);
    if (currentBlock.type === 'c-block'){
      layout_CblockInnerStack_Blocks(blockRegistry, currentBlock);
    }
    let nextBlockInChain = null;
    if (currentBlock.nextUUID){
      nextBlockInChain = blockRegistry.get(currentBlock.nextUUID);
      if (nextBlockInChain === undefined){
        nextBlockInChain = null;
      }
    }
    currentBlock = nextBlockInChain;
  }
}

export function layout_AllCblockInnerStacks(blockRegistry){
  for (const block of blockRegistry.values()){
    if (block.parentUUID != null) continue;

    for (const chainBlock of StackChainDrag.collect_StackChain_BlocksFromHead(
      blockRegistry,
      block
    )){
      if (chainBlock.type === 'c-block'){
        layout_CblockInnerStack_Blocks(blockRegistry, chainBlock);
      }
    }
  }
}
