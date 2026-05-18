import * as StackChainDrag from '../blocks/StackChainDrag.js';
import * as CBlockInnerGhostLayout from './innerGhostLayout.js';
import * as StackChainFollowLayout from '../stack-connect/layout/stackChainFollowLayout.js';

export function layoutInnerStackUnderCBlock(blockRegistry, cBlock){
  if (!cBlock || !cBlock.innerStackHeadUUID || !cBlock.element) return;
  
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
  if (!innerHead || !innerHead.element) return;
  const pos = CBlockInnerGhostLayout.calcTopInnerGhostWorldPosition(cBlock);
  if (!pos) return;
  innerHead.setPosition(Math.round(pos.x), Math.round(pos.y));
  StackChainFollowLayout.repositionFollowingStackBlocks(innerHead, blockRegistry);
  let cur = innerHead;
  const visited = new Set();
  while (cur && cur.blockUUID && !visited.has(cur.blockUUID)){
    visited.add(cur.blockUUID);
    if (cur.type === 'c-block'){
      layoutInnerStackUnderCBlock(blockRegistry, cur);
    }
    let nextBlockInChain = null;
    if (cur.nextUUID){
      nextBlockInChain = blockRegistry.get(cur.nextUUID);
      if (nextBlockInChain === undefined){
        nextBlockInChain = null;
      }
    }
    cur = nextBlockInChain;
  }
}

export function layoutAllCBlockInnerStacks(blockRegistry){
  for (const block of blockRegistry.values()){
    if (block.parentUUID != null) continue;

    for (const b of StackChainDrag.collectChainBlocksFromHead(
      blockRegistry,
      block
    )){
      if (b.type === 'c-block'){
        layoutInnerStackUnderCBlock(blockRegistry, b);
      }
    }
  }
}
