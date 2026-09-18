import * as CBlockMath from '../../calculations/CBlockMath.js'
import * as Global from '../../constants/Global.js'
import * as ZoneModule from '../../blocks/ZoneModule.js'
import * as ZoneMath from '../../calculations/ZoneMath.js'
import * as SvgUtils from '../../utils/SvgUtils.js'

export function build_TopInnerZone(localGeom, cBlockElement, innerHeadElement){
  const emptyZone = CBlockMath.build_TopInnerZone_Empty(localGeom)
  if (!cBlockElement || !innerHeadElement || !SvgUtils.get_BBox(innerHeadElement)){
    return emptyZone
  }

  const { y: cBlockY } = SvgUtils.read_Transform(cBlockElement)
  const { y: innerHeadY } = SvgUtils.read_Transform(innerHeadElement)
  const zoneY = CBlockMath.calc_TopInnerY(innerHeadY, cBlockY)

  return zoneY === null
    ? emptyZone
    : CBlockMath.build_TopInnerZone(localGeom.ZoneX, localGeom.width, zoneY)
}

export function build_BottomInnerZone(
  cBlockElement,
  innerTailElement,
  innerTailType,
  cBlockLocalGeom
){
  if (!cBlockElement || !innerTailElement || !cBlockLocalGeom) return null

  const tailGeom = ZoneModule.Zone.getLocalGeometry(
    { type: innerTailType },
    innerTailElement
  )
  const tailBottomZone = {
    x: tailGeom.ZoneX,
    y: tailGeom.bottomBaseY,
    width: tailGeom.width,
    height: Global.ZONE_HEIGHT,
  }
  const tailBottomZoneClient = ZoneMath.calc_ZoneClientRect(
    innerTailElement,
    tailBottomZone
  )
  if (!tailBottomZoneClient) return null

  const corners = [
    [tailBottomZoneClient.left, tailBottomZoneClient.top],
    [tailBottomZoneClient.right, tailBottomZoneClient.top],
    [tailBottomZoneClient.right, tailBottomZoneClient.bottom],
    [tailBottomZoneClient.left, tailBottomZoneClient.bottom],
  ]
  let minYLocal = Infinity
  for (const [clientX, clientY] of corners){
    const point = SvgUtils.to_Local(cBlockElement, clientX, clientY)
    if (!point) return null
    minYLocal = Math.min(minYLocal, point.y)
  }

  return CBlockMath.build_BottomInnerZone(cBlockLocalGeom, minYLocal)
}

export function calc_CblockInnerGhostPos(cBlock){
  if (cBlock?.type !== 'c-block' || !cBlock.element) return null

  const localGeom = ZoneModule.Zone.getLocalGeometry(
    { type: 'c-block' },
    cBlock.element
  )
  const slot = CBlockMath.build_TopInnerZone_Empty(localGeom)
  const { x, y } = SvgUtils.read_Transform(cBlock.element)
  return {
    x: x + slot.x,
    y: CBlockMath.calc_InnerGhostY(y, slot.y, slot.height),
  }
}
