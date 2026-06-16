import * as Global from '../../../src/constants/Global.js';

export function calc_BlockZone_Top_Pos_TopEdgeY(blockTopEdgeY){
  return blockTopEdgeY - Global.ZONE_HEIGHT;
}

export function calc_BlockZone_Bottom_Pos_BottomEdgeY(blockBottomEdgeY){
  return blockBottomEdgeY - Global.ZONE_SOCKET_HEIGHT;
}


