import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as CBlockMath from '../calculations/CBlockMath.js';
import * as Global from '../../../src/constants/Global.js';

export function calcCBlockTopInnerWhenIsEmpty(localGeom){
  const { ZoneX, width } = localGeom;
  return CBlockMath.build_CblockZone_TopInner(
    ZoneX,
    width,
    CBlockMath.calc_CblockZone_TopInner_Pos_WhenIsEmpty()
  );
}

export function calcCBlockTopInner(
  localGeom,
  cBlockElement,
  innerHeadElement
  ){
  const { ZoneX, width } = localGeom;

  let y;
  if (cBlockElement && innerHeadElement && typeof innerHeadElement.getBBox === 'function'){
    try {
      const cTy = SvgUtils.parseTranslateTransform(cBlockElement).y;
      const hTy = SvgUtils.parseTranslateTransform(innerHeadElement).y;
      const innerTopLocalY = CBlockMath.calc_CblockZone_TopInner_Pos(hTy, cTy);
      if (Number.isFinite(innerTopLocalY)){
        y = innerTopLocalY - Global.ZONE_HEIGHT/2;
      }
    }catch{
      /* fall through */
    }
  }
  if (y === undefined){
    return calcCBlockTopInnerWhenIsEmpty(localGeom);
  }

  return CBlockMath.build_CblockZone_TopInner(ZoneX, width, y);
}
