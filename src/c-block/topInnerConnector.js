import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as CBlockMath from '../calculations/CBlockMath.js';

/**
 * Локальная полоса `top-inner` для `<g>` c-block при пустом «рту» (номинальный корпус).
 * @param {{ connectorX: number, width: number }} localGeom из геометрии ConnectorZone
 */
export function computeCBlockTopInnerRect(localGeom) {
  const { connectorX, width } = localGeom;
  const inset = Global.CBLOCK_NESTED_X_OFFSET;
  const threshold = Global.CONNECTOR_THRESHOLD;
  const y = CBlockMath.topInnerEmptyMouthSlotLocalY();
  return {
    type: 'top-inner',
    x: connectorX + inset,
    y,
    width: width - inset,
    height: threshold,
  };
}

/**
 * Если внутри c-block уже есть блоки: `top-inner` сдвигается так, чтобы полоса была на пол-высоты
 * выше шва — `y = (верх первого внутреннего блока в локальных Y c-block) - CONNECTOR_THRESHOLD/2`.
 * Иначе {@link computeCBlockTopInnerRect}, если геометрию прочитать нельзя.
 */
export function computeCBlockTopInnerRectWithInnerStack(
  localGeom,
  cBlockElement,
  innerHeadElement
) {
  const { connectorX, width } = localGeom;
  const inset = Global.CBLOCK_NESTED_X_OFFSET;
  const threshold = Global.CONNECTOR_THRESHOLD;

  let y;
  if (cBlockElement && innerHeadElement && typeof innerHeadElement.getBBox === 'function') {
    try {
      const cTy = SvgUtils.parseTranslateTransform(cBlockElement).y;
      const hTy = SvgUtils.parseTranslateTransform(innerHeadElement).y;
      const hBb = innerHeadElement.getBBox();
      const innerTopWorldY = hTy + hBb.y;
      const innerTopLocalY = innerTopWorldY - cTy;
      if (Number.isFinite(innerTopLocalY)) {
        y = CBlockMath.topInnerSlotLocalYWhenInnerStackPresent(
          innerTopLocalY
        );
      }
    } catch {
      /* fall through */
    }
  }
  if (y === undefined) {
    return computeCBlockTopInnerRect(localGeom);
  }

  return {
    type: 'top-inner',
    x: connectorX + inset,
    y,
    width: width - inset,
    height: threshold,
  };
}
