import * as ZoneModule from '../blocks/ZoneModule.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as CBlockMath from '../calculations/CBlockMath.js';

export function calc_CblockTopInnerGhost_WorldPos(cBlock){
  if (!cBlock || !cBlock.element) return null;
  if (cBlock.type !== 'c-block') return null;

  const localGeom = ZoneModule.Zone.getLocalGeometry(
    { type: 'c-block' },
    cBlock.element
  );
  const slot = CBlockMath.build_CblockZone_TopInner_WhenInnerStackEmpty(localGeom);

  const { x: cblockX, y: cblockY } = SvgUtils.parseTranslateTransform(
    cBlock.element
  );
  return {
    x: CBlockMath.calc_Cblock_InputBlocks_childrenNested_Xoffset(cblockX, slot.x),
    y: CBlockMath.calc_CblockGhost_and_InnerBlocks_Pos(
      cblockY,
      slot.y,
      slot.height
    ),
  };
}
