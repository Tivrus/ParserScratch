import * as StackChainDrag from '../blocks/StackChainDrag.js';

export function find_StackHead_Block(blockRegistry, block){
  let currentBlock = block;
  while (currentBlock && currentBlock.parentUUID){
    const parentBlock = blockRegistry.get(currentBlock.parentUUID);
    if (!parentBlock) break;
    currentBlock = parentBlock;
  }
  return currentBlock;
}

export function collect_StackChain_FromHeadToInclusive(
  blockRegistry,
  head,
  tailInclusive
){
  const chainBlocks = [];
  let currentBlock = head;
  while (currentBlock){
    chainBlocks.push(currentBlock);
    if (currentBlock.blockUUID === tailInclusive.blockUUID) break;
    if (!currentBlock.nextUUID) break;
    let following = blockRegistry.get(currentBlock.nextUUID);
    if (following === undefined){
      following = null;
    }
    currentBlock = following;
  }
  return chainBlocks;
}

export function find_StackTail_Block(blockRegistry, headBlock){
  const chain = StackChainDrag.collect_StackChain_BlocksFromHead(blockRegistry, headBlock);
  if (!chain.length) return null;
  return chain[chain.length - 1];
}

export function is_Block_OnCBlockInnerStack(block, cBlock, blockRegistry){
  if (
    !block ||
    !block.blockUUID ||
    !cBlock ||
    cBlock.type !== 'c-block' ||
    !cBlock.innerStackHeadUUID ||
    !blockRegistry
  ){
    return false;
  }
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
  if (!innerHead) return false;
  const innerStack = StackChainDrag.collect_StackChain_BlocksFromHead(blockRegistry, innerHead);
  return innerStack.some(b => b.blockUUID === block.blockUUID);
}
