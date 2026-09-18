export function is_StackHead(block){
  return Boolean(block.parentUUID == null)
}

export function split_StackAtGrabbed(blockRegistry, grabbedBlock){
  if (!grabbedBlock || !grabbedBlock.blockUUID || grabbedBlock.parentUUID == null){
    return null
  }

  const parent = blockRegistry.get(grabbedBlock.parentUUID)
  if (!parent){
    return null
  }

  if (parent.nextUUID === grabbedBlock.blockUUID){
    parent.nextUUID = null
    grabbedBlock.parentUUID = null
    grabbedBlock.topLevel = true
    parent.topLevel = parent.parentUUID == null
    return { upperTail: parent, lowerHead: grabbedBlock }
  }

  if (
    parent.type === 'c-block' &&
    parent.innerStackHeadUUID === grabbedBlock.blockUUID
  ){
    parent.innerStackHeadUUID = null
    grabbedBlock.parentUUID = null
    grabbedBlock.topLevel = true
    parent.topLevel = parent.parentUUID == null
    return { upperTail: parent, lowerHead: grabbedBlock }
  }

  return null
}

export function collect_Chain(blockRegistry, headBlockOrId){
  const headBlock =
    typeof headBlockOrId === 'string'
      ? blockRegistry.get(headBlockOrId)
      : headBlockOrId

  if (!headBlock){
    return []
  }

  const blocksInOrder = []
  const visitedUUIDs = new Set()
  let current = headBlock

  while (current && !visitedUUIDs.has(current.blockUUID)){
    visitedUUIDs.add(current.blockUUID)
    blocksInOrder.push(current)

    if (!current.nextUUID){
      break
    }
    let followingBlock = blockRegistry.get(current.nextUUID)
    if (followingBlock === undefined){
      followingBlock = null
    }
    current = followingBlock
  }

  return blocksInOrder
}

export function is_ChainEndsWithStop(blockRegistry, headBlockOrId){
  const chain = collect_Chain(blockRegistry, headBlockOrId)
  const tail = chain[chain.length - 1]
  return Boolean(tail && tail.type === 'stop-block')
}

export function collect_ChainUuids(blockRegistry, headUUID){
  const uuidList = collect_Chain(blockRegistry, headUUID).map(
    block => block.blockUUID
  )
  return new Set(uuidList)
}

export function collect_ChainTree(
  blockRegistry,
  headBlockOrId
){
  const headBlock =
    typeof headBlockOrId === 'string'
      ? blockRegistry.get(headBlockOrId)
      : headBlockOrId
  if (!headBlock){
    return []
  }

  const result = []
  const seen = new Set()

  function appendInnerStackBlocks(cBlock){
    if (!cBlock || !cBlock.innerStackHeadUUID){
      return
    }
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID)
    if (!innerHead){
      return
    }
    for (const inner of collect_Chain(blockRegistry, innerHead)){
      if (seen.has(inner.blockUUID)){
        continue
      }
      seen.add(inner.blockUUID)
      result.push(inner)
      if (inner.type === 'c-block'){
        appendInnerStackBlocks(inner)
      }
    }
  }

  for (const block of collect_Chain(blockRegistry, headBlock)){
    if (seen.has(block.blockUUID)){
      continue
    }
    seen.add(block.blockUUID)
    result.push(block)
    if (block.type === 'c-block'){
      appendInnerStackBlocks(block)
    }
  }
  return result
}

export function collect_ChainTreeUuids(blockRegistry, headUUID){
  return new Set(
    collect_ChainTree(blockRegistry, headUUID).map(
      b => b.blockUUID
    )
  )
}

export function find_StackHead(blockRegistry, block){
  let current = block
  while (current && current.parentUUID){
    const parent = blockRegistry.get(current.parentUUID)
    if (!parent) break
    current = parent
  }
  return current
}

export function find_StackTail(blockRegistry, headBlock){
  const chain = collect_Chain(blockRegistry, headBlock)
  if (!chain.length) return null
  return chain[chain.length - 1]
}

export function collect_ChainTo(
  blockRegistry,
  head,
  tailInclusive
){
  const chain = []
  let current = head
  while (current){
    chain.push(current)
    if (current.blockUUID === tailInclusive.blockUUID) break
    if (!current.nextUUID) break
    current = blockRegistry.get(current.nextUUID) || null
  }
  return chain
}

export function is_OnInnerStack(block, cBlock, blockRegistry){
  if (
    !block ||
    !block.blockUUID ||
    !cBlock ||
    cBlock.type !== 'c-block' ||
    !cBlock.innerStackHeadUUID ||
    !blockRegistry
  ){
    return false
  }
  const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID)
  if (!innerHead) return false
  return collect_Chain(blockRegistry, innerHead).some(
    b => b.blockUUID === block.blockUUID
  )
}
