/**
 * Рабочие стеки: связь `parentUUID` / `nextUUID`. Перетаскивание головы двигает цепочку;
 * перетаскивание другого блока разрезает стек (верх остаётся, низ уезжает) — после сплита
 * пересобрать зоны коннекторов, чтобы middle снова стал bottom/top.
 */

export function isWorkspaceStackHead(block) {
  return Boolean(block && block.parentUUID == null);
}

/**
 * Разрыв связи parent → grabbed: верх заканчивается на `parent`, grabbed становится головой нижней части;
 * зона middle между ними исчезает до пересборки коннекторов.
 */
export function splitWorkspaceStackAtGrabbed(blockRegistry, grabbedBlock) {
  if (!grabbedBlock || !grabbedBlock.blockUUID || grabbedBlock.parentUUID == null) {
    return null;
  }

  const parent = blockRegistry.get(grabbedBlock.parentUUID);
  if (!parent) {
    return null;
  }

  if (parent.nextUUID === grabbedBlock.blockUUID) {
    parent.nextUUID = null;
    grabbedBlock.parentUUID = null;
    grabbedBlock.topLevel = true;
    parent.topLevel = parent.parentUUID == null;
    return { upperTail: parent, lowerHead: grabbedBlock };
  }

  if (
    parent.type === 'c-block' &&
    parent.innerStackHeadUUID === grabbedBlock.blockUUID
  ) {
    parent.innerStackHeadUUID = null;
    grabbedBlock.parentUUID = null;
    grabbedBlock.topLevel = true;
    parent.topLevel = parent.parentUUID == null;
    return { upperTail: parent, lowerHead: grabbedBlock };
  }

  return null;
}

/**
 * Упорядоченная цепочка от головы к хвосту по `nextUUID`.
 * @param {Map<string, import('./Block.js').Block>} blockRegistry
 * @param {import('./Block.js').Block|string} headBlockOrId
 */
export function collectChainBlocksFromHead(blockRegistry, headBlockOrId) {
  const headBlock =
    typeof headBlockOrId === 'string'
      ? blockRegistry.get(headBlockOrId)
      : headBlockOrId;

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
    let followingBlock = blockRegistry.get(current.nextUUID);
    if (followingBlock === undefined) {
      followingBlock = null;
    }
    current = followingBlock;
  }

  return blocksInOrder;
}

/**
 * Множество UUID всей цепочки (голова…хвост): middle-preview spread не трогает все блоки на overlay.
 */
export function collectChainUuidSetFromHead(blockRegistry, headUUID) {
  const uuidList = collectChainBlocksFromHead(blockRegistry, headUUID).map(
    block => block.blockUUID
  );
  return new Set(uuidList);
}

/**
 * Внешний стек от `headBlockOrId` плюс каждый внутренний подстек у c-block в этом множестве (вложенность).
 * Нужно при удалении цепочки, чтобы вложенные блоки не остались в реестре.
 */
export function collectBlocksToRemoveIncludingInnerTrees(
  blockRegistry,
  headBlockOrId
) {
  const headBlock =
    typeof headBlockOrId === 'string'
      ? blockRegistry.get(headBlockOrId)
      : headBlockOrId;
  if (!headBlock) {
    return [];
  }

  const result = [];
  const seen = new Set();
  const queue = [headBlock];

  while (queue.length > 0) {
    const chainStart = queue.shift();
    if (!chainStart || !chainStart.blockUUID || seen.has(chainStart.blockUUID)) {
      continue;
    }
    for (const block of collectChainBlocksFromHead(blockRegistry, chainStart)) {
      if (seen.has(block.blockUUID)) {
        continue;
      }
      seen.add(block.blockUUID);
      result.push(block);
      if (block.type === 'c-block' && block.innerStackHeadUUID) {
        const innerHead = blockRegistry.get(block.innerStackHeadUUID);
        if (innerHead && !seen.has(innerHead.blockUUID)) {
          queue.push(innerHead);
        }
      }
    }
  }
  return result;
}

/**
 * Внешний стек (`nextUUID`) плюс внутренние подстеки у каждого c-block на цепочке (вложенные c-block тоже).
 * Порядок: каждый c-block сразу за ним — его внутренняя цепочка в порядке DFS.
 */
export function collectChainBlocksFromHeadForWorkspaceDrag(
  blockRegistry,
  headBlockOrId
) {
  const headBlock =
    typeof headBlockOrId === 'string'
      ? blockRegistry.get(headBlockOrId)
      : headBlockOrId;
  if (!headBlock) {
    return [];
  }

  const result = [];
  const seen = new Set();

  function appendInnerStackBlocks(cBlock) {
    if (!cBlock || !cBlock.innerStackHeadUUID) {
      return;
    }
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
    if (!innerHead) {
      return;
    }
    for (const inner of collectChainBlocksFromHead(blockRegistry, innerHead)) {
      if (seen.has(inner.blockUUID)) {
        continue;
      }
      seen.add(inner.blockUUID);
      result.push(inner);
      if (inner.type === 'c-block') {
        appendInnerStackBlocks(inner);
      }
    }
  }

  for (const block of collectChainBlocksFromHead(blockRegistry, headBlock)) {
    if (seen.has(block.blockUUID)) {
      continue;
    }
    seen.add(block.blockUUID);
    result.push(block);
    if (block.type === 'c-block') {
      appendInnerStackBlocks(block);
    }
  }
  return result;
}

export function collectChainUuidSetForWorkspaceDrag(blockRegistry, headUUID) {
  return new Set(
    collectChainBlocksFromHeadForWorkspaceDrag(blockRegistry, headUUID).map(
      b => b.blockUUID
    )
  );
}
