import * as Global from '../../../src/constants/Global.js';
import * as CBlockMath from '../calculations/CBlockMath.js';
import * as ZoneModule from '../blocks/ZoneModule.js';
import * as ZoneClientGeometry from '../stack-connect/hit-test/ZoneClientGeometry.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';


/*
* Полоса **`bottom-inner`** на `<g>` **c-block**: тот же горизонтальный коридор, что у **`top-inner`**;
* по вертикали — по синтетическому нижнему сокету **хвоста inner stack** (шов «продолжить стек вниз»
* внутри полости c-block под inner stack).
*/

export function calcCBlockBottomInnerRect(
  cBlockElement,
  innerTailElement,
  innerTailType,
  cBlockLocalGeom
  ){
  if (!cBlockElement || !innerTailElement || !cBlockLocalGeom) return null;

  const g = ZoneModule.Zone.getLocalGeometry({ type: innerTailType }, innerTailElement);
  const zone = {
    x: g.ZoneX,
    y: g.bottomBaseY,
    width: g.width,
    height: Global.ZONE_HEIGHT,
  };
  
  const client = ZoneClientGeometry.zoneToClientRect(innerTailElement, zone);
  if (!client) return null;

  const corners = [
    [client.left, client.top],
    [client.right, client.top],
    [client.right, client.bottom],
    [client.left, client.bottom],
  ];
  let minY = Infinity;
  for (const [cx, cy] of corners){
    const p = SvgUtils.clientPointToElementLocal(cBlockElement, cx, cy);
    if (!p) return null;

    minY = Math.min(minY, p.y);
  }

  
  const { ZoneX, width } = cBlockLocalGeom;  
  return {
    type: 'bottom-inner',
    x: ZoneX + Global.CBLOCK_NESTED_X_OFFSET,
    y: CBlockMath.calc_CblockZone_BottomInner_Pos(minY),
    width: width - Global.CBLOCK_NESTED_X_OFFSET,
    height: Global.ZONE_HEIGHT,
  };
}
