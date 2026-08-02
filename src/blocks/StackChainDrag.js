export function is_WorkspaceStackHead(block){
  return Boolean(block && block.parentUUID == null);
}

export function split_WorkspaceStack_AtGrabbed(blockRegistry, grabbedBlock){
  if (!grabbedBlock || !grabbedBlock.blockUUID || grabbedBlock.parentUUID == null){
    return null;
  }

  const parent = blockRegistry.get(grabbedBlock.parentUUID);
  if (!parent){
    return null;
  }

  if (parent.nextUUID === grabbedBlock.blockUUID){
    parent.nextUUID = null;
    grabbedBlock.parentUUID = null;
    grabbedBlock.topLevel = true;
    parent.topLevel = parent.parentUUID == null;
    return { upperTail: parent, lowerHead: grabbedBlock };
  }

  if (
    parent.type === 'c-block' &&
    parent.innerStackHeadUUID === grabbedBlock.blockUUID
  ){
    parent.innerStackHeadUUID = null;
    grabbedBlock.parentUUID = null;
    grabbedBlock.topLevel = true;
    parent.topLevel = parent.parentUUID == null;
    return { upperTail: parent, lowerHead: grabbedBlock };
  }

  return null;
}

export function collect_StackChain_BlocksFromHead(blockRegistry, headBlockOrId){
  const headBlock =
    typeof headBlockOrId === 'string'
      ? blockRegistry.get(headBlockOrId)
      : headBlockOrId;

  if (!headBlock){
    return [];
  }

  const blocksInOrder = [];
  const visitedUUIDs = new Set();
  let current = headBlock;

  while (current && !visitedUUIDs.has(current.blockUUID)){
    visitedUUIDs.add(current.blockUUID);
    blocksInOrder.push(current);

    if (!current.nextUUID){
      break;
    }
    let followingBlock = blockRegistry.get(current.nextUUID);
    if (followingBlock === undefined){
      followingBlock = null;
    }
    current = followingBlock;
  }

  return blocksInOrder;
}

export function is_WorkspaceChain_EndsWithStopBlock(blockRegistry, headBlockOrId){
  const chain = collect_StackChain_BlocksFromHead(blockRegistry, headBlockOrId);
  const tail = chain[chain.length - 1];
  return Boolean(tail && tail.type === 'stop-block');
}

export function collect_StackChain_UuidSetFromHead(blockRegistry, headUUID){
  const uuidList = collect_StackChain_BlocksFromHead(blockRegistry, headUUID).map(
    block => block.blockUUID
  );
  return new Set(uuidList);
}

export function collect_StackChain_BlocksIncludingInnerTrees(
  blockRegistry,
  headBlockOrId
){
  const headBlock =
    typeof headBlockOrId === 'string'
      ? blockRegistry.get(headBlockOrId)
      : headBlockOrId;
  if (!headBlock){
    return [];
  }

  const result = [];
  const seen = new Set();

  function appendInnerStackBlocks(cBlock){
    if (!cBlock || !cBlock.innerStackHeadUUID){
      return;
    }
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
    if (!innerHead){
      return;
    }
    for (const inner of collect_StackChain_BlocksFromHead(blockRegistry, innerHead)){
      if (seen.has(inner.blockUUID)){
        continue;
      }
      seen.add(inner.blockUUID);
      result.push(inner);
      if (inner.type === 'c-block'){
        appendInnerStackBlocks(inner);
      }
    }
  }

  for (const block of collect_StackChain_BlocksFromHead(blockRegistry, headBlock)){
    if (seen.has(block.blockUUID)){
      continue;
    }
    seen.add(block.blockUUID);
    result.push(block);
    if (block.type === 'c-block'){
      appendInnerStackBlocks(block);
    }
  }
  return result;
}

export function collect_StackChain_UuidSetIncludingInnerTrees(blockRegistry, headUUID){
  return new Set(
    collect_StackChain_BlocksIncludingInnerTrees(blockRegistry, headUUID).map(
      b => b.blockUUID
    )
  );
}
