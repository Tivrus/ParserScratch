/** Граф стека: `parentUUID` / `nextUUID`, без DOM hit-test. */

/** Подъём по `parentUUID` к голове стека. */
export function findStackHeadBlock(blockRegistry, block) {
  let currentBlock = block;
  while (currentBlock && currentBlock.parentUUID) {
    const parentBlock = blockRegistry.get(currentBlock.parentUUID);
    if (!parentBlock) break;
    currentBlock = parentBlock;
  }
  return currentBlock;
}

/** Блоки по порядку от `head` по `nextUUID` до включения `tailInclusive`. */
export function collectChainFromHeadToInclusive(
  blockRegistry,
  head,
  tailInclusive
) {
  const chainBlocks = [];
  let currentBlock = head;
  while (currentBlock) {
    chainBlocks.push(currentBlock);
    if (currentBlock.blockUUID === tailInclusive.blockUUID) break;
    if (!currentBlock.nextUUID) break;
    let following = blockRegistry.get(currentBlock.nextUUID);
    if (following === undefined) {
      following = null;
    }
    currentBlock = following;
  }
  return chainBlocks;
}

/** Последний блок по `nextUUID` от `headBlock`, либо сам `headBlock` без преемника. */
export function stackTailBlock(blockRegistry, headBlock) {
  if (!headBlock || !headBlock.blockUUID || !blockRegistry) return null;
  let currentBlock = headBlock;
  const visitedUUIDs = new Set();
  while (
    currentBlock &&
    currentBlock.nextUUID &&
    !visitedUUIDs.has(currentBlock.blockUUID)
  ) {
    visitedUUIDs.add(currentBlock.blockUUID);
    let following = blockRegistry.get(currentBlock.nextUUID);
    if (following === undefined) {
      following = null;
    }
    currentBlock = following;
  }
  return currentBlock;
}

/**
 * Лежит ли `block` на вложенном внутреннем стеке `cBlock` (от `innerStackHeadUUID` по `nextUUID`).
 */
export function isBlockOnCBlockInnerSubstack(block, cBlock, blockRegistry) {
  if (
    !block ||
    !block.blockUUID ||
    !cBlock ||
    cBlock.type !== 'c-block' ||
    !cBlock.innerStackHeadUUID ||
    !blockRegistry
  ) {
    return false;
  }
  let cur = blockRegistry.get(cBlock.innerStackHeadUUID);
  while (cur) {
    if (cur.blockUUID === block.blockUUID) return true;
    let nextInner = null;
    if (cur.nextUUID) {
      nextInner = blockRegistry.get(cur.nextUUID);
      if (nextInner === undefined) {
        nextInner = null;
      }
    }
    cur = nextInner;
  }
  return false;
}
