// --- Stack graph (parentUUID / nextUUID, no DOM hit-test) ---

/** Walk `parentUUID` to the top of a stack. */
export function findStackHeadBlock(blockRegistry, block) {
  let currentBlock = block;
  while (currentBlock?.parentUUID) {
    const parentBlock = blockRegistry.get(currentBlock.parentUUID);
    if (!parentBlock) break;
    currentBlock = parentBlock;
  }
  return currentBlock;
}

/** Ordered blocks from `head` along `nextUUID` until `tailInclusive` is included. */
export function collectChainFromHeadToInclusive(blockRegistry, head, tailInclusive) {
  const chainBlocks = [];
  let currentBlock = head;
  while (currentBlock) {
    chainBlocks.push(currentBlock);
    if (currentBlock.blockUUID === tailInclusive.blockUUID) break;
    if (!currentBlock.nextUUID) break;
    currentBlock = blockRegistry.get(currentBlock.nextUUID) ?? null;
  }
  return chainBlocks;
}

/** Last block along `nextUUID` from `headBlock`, or `headBlock` if no successor. */
export function stackTailBlock(blockRegistry, headBlock) {
  if (!headBlock?.blockUUID || !blockRegistry) return null;
  let currentBlock = headBlock;
  const visitedUUIDs = new Set();
  while (currentBlock?.nextUUID && !visitedUUIDs.has(currentBlock.blockUUID)) {
    visitedUUIDs.add(currentBlock.blockUUID);
    currentBlock = blockRegistry.get(currentBlock.nextUUID) ?? null;
  }
  return currentBlock;
}
