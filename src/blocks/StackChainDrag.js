// Workspace script stacks: blocks link with parentUUID / nextUUID.
// - Dragging the head moves the whole stack.
// - Dragging any other block splits the stack: upper part stays, lower part (grabbed..tail) is dragged.
//   Rebuild connector zones after split so middle joints become bottom + top again.

export function isWorkspaceStackHead(block) {
  return Boolean(block && block.parentUUID == null);
}

// Break the link parent → grabbed. Upper chain ends at `parent` (bottom zone returns); grabbed becomes
// head of the lower chain (top zone returns). Middle between them is removed when zones are rebuilt.
export function splitWorkspaceStackAtGrabbed(blockRegistry, grabbedBlock) {
  if (!grabbedBlock?.blockUUID || grabbedBlock.parentUUID == null) {
    return null;
  }

  const parent = blockRegistry.get(grabbedBlock.parentUUID);
  if (!parent || parent.nextUUID !== grabbedBlock.blockUUID) {
    return null;
  }

  parent.nextUUID = null;
  grabbedBlock.parentUUID = null;
  grabbedBlock.topLevel = true;
  parent.topLevel = parent.parentUUID == null;

  return { upperTail: parent, lowerHead: grabbedBlock };
}

// Ordered stack from head to tail (nextUUID). `headBlockOrId` is a Block or its UUID string.
export function collectChainBlocksFromHead(blockRegistry, headBlockOrId) {
  const headBlock =
    typeof headBlockOrId === 'string' ? blockRegistry.get(headBlockOrId) : headBlockOrId;

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
  const uuidList = collectChainBlocksFromHead(blockRegistry, headUUID).map(
    (block) => block.blockUUID
  );
  return new Set(uuidList);
}
