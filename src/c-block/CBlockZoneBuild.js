import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as CBlockMath from '../calculations/CBlockMath.js';
import * as Global from '../constants/Global.js';
import * as ZoneModule from '../blocks/ZoneModule.js';
import * as ZoneClientRectMath from '../calculations/ZoneClientRectMath.js';

export function build_CblockZone_TopInner_ForBlock(
  localGeom,
  cBlockElement,
  innerHeadElement
){
  const { ZoneX, width } = localGeom;

  if (
    cBlockElement &&
    innerHeadElement
  ){
    const innerHeadBBox = SvgUtils.getElementBBox(innerHeadElement);
    if (innerHeadBBox) {
      try {
        const cblockTranslateY = SvgUtils.parseTranslateTransform(cBlockElement).y;
        const innerHeadTranslateY =
          SvgUtils.parseTranslateTransform(innerHeadElement).y;
        const zoneY = CBlockMath.calc_CblockZone_TopInner_Y_FromInnerHeadTranslate(
          innerHeadTranslateY,
          cblockTranslateY
        );
        if (zoneY != null){
          return CBlockMath.build_CblockZone_TopInner(ZoneX, width, zoneY);
        }
      } catch {
        /* fall through */
      }
    }
  }

  return CBlockMath.build_CblockZone_TopInner_WhenInnerStackEmpty(localGeom);
}

export function build_CblockZone_BottomInner_ForBlock(
  cBlockElement,
  innerTailElement,
  innerTailType,
  cBlockLocalGeom
){
  if (!cBlockElement || !innerTailElement || !cBlockLocalGeom) return null;

  const tailGeom = ZoneModule.Zone.getLocalGeometry(
    { type: innerTailType },
    innerTailElement
  );
  const tailBottomZone = {
    x: tailGeom.ZoneX,
    y: tailGeom.bottomBaseY,
    width: tailGeom.width,
    height: Global.ZONE_HEIGHT,
  };

  const tailBottomZoneClient =
    ZoneClientRectMath.calc_Zone_LocalRect_ToClientAABB(
      innerTailElement,
      tailBottomZone
    );
  if (!tailBottomZoneClient) return null;

  const corners = [
    [tailBottomZoneClient.left, tailBottomZoneClient.top],
    [tailBottomZoneClient.right, tailBottomZoneClient.top],
    [tailBottomZoneClient.right, tailBottomZoneClient.bottom],
    [tailBottomZoneClient.left, tailBottomZoneClient.bottom],
  ];
  let minYLocal = Infinity;
  for (const [clientX, clientY] of corners){
    const localPoint = SvgUtils.clientPointToElementLocal(
      cBlockElement,
      clientX,
      clientY
    );
    if (!localPoint) return null;
    minYLocal = Math.min(minYLocal, localPoint.y);
  }

  return CBlockMath.build_CblockZone_BottomInner(cBlockLocalGeom, minYLocal);
}
