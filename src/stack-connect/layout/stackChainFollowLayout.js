import * as SnapLayout from './stackSnapLayout.js';

/**
 * Раскладка стека: пересчитать мировые позиции всех блоков ниже `fromBlock` по `nextUUID`
 * (каждый следующий — «под» предыдущим по геометрии snap).
 */
export function repositionFollowingStackBlocks(fromBlock, blockRegistry){
  let currentBlock = fromBlock;
  while (currentBlock.nextUUID){
    const nextBlock = blockRegistry.get(currentBlock.nextUUID);
    if (!nextBlock || !nextBlock.element) break;
    const nextWorldPosition = SnapLayout.StackSnapLayout.translateInContainer(
      currentBlock,
      nextBlock.element,
      'below'
    );
    if (!nextWorldPosition) break;
    nextBlock.setPosition(nextWorldPosition.x, nextWorldPosition.y);
    currentBlock = nextBlock;
  }
}
