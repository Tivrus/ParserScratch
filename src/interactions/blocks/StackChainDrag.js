// Workspace script stacks: blocks link with parentUUID / nextUUID. Workspace drag starts only from the
// stack head (no parent); every successor in the chain moves with that head.

export function isWorkspaceStackHead(block) {
  return Boolean(block && block.parentUUID == null);
}

// Returns blocks from head to tail following nextUUID. Pass the head Block or its UUID string.
export function collectChainBlocksFromHead(blockRegistry, headBlockOrUuid) {
  const headBlock =
    typeof headBlockOrUuid === 'string'
      ? blockRegistry.get(headBlockOrUuid)
      : headBlockOrUuid;

  if (!headBlock) {
    return [];
  }

  const blocksInOrder = [];
  const visitedUUIDs = new Set();
  let current = headBlock;

  while (current && !visitedUUIDs.has(current.blockUUID)) {
    visitedUUIDs.add(current.blockUUID);
    blocksInOrder.push(current);

    if (!current.nextUUID) {
      break;
    }
    current = blockRegistry.get(current.nextUUID) ?? null;
  }

  return blocksInOrder;
}

// UUID set for the whole stack (head through tail). Used so middle-preview spread ignores every block
// that is on the drag overlay, not only the head.
export function collectChainUuidSetFromHead(blockRegistry, headUUID) {
  return new Set(
    collectChainBlocksFromHead(blockRegistry, headUUID).map(block => block.blockUUID)
  );
}
