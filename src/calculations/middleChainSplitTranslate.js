import * as Global from '../../../src/constants/Global.js';

export function getWorkspaceChainSegmentWorldOffsetPxAfterStartMiddleSplit(){
  const o = Global.START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET;
  return { x: o.x, y: o.y };
}

export function getWorkspaceChainSegmentWorldOffsetPxAfterStopMiddleSplit(){
  const o = Global.STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET;
  return { x: o.x, y: o.y };
}
