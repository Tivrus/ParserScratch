import * as Global from '../constants/Global.js';

export function calc_MiddleChainSplit_StartBlock_OffsetPx(){
  return {
    x: Global.START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET.x,
    y: Global.START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET.y,
  };
}

export function calc_MiddleChainSplit_StopBlock_OffsetPx(){
  return {
    x: Global.STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET.x,
    y: Global.STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET.y,
  };
}
