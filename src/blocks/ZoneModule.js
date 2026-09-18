import * as CBlockMath from '../calculations/CBlockMath.js'
import * as Global from '../constants/Global.js'
import * as SvgUtils from '../utils/SvgUtils.js'
import * as ZoneMath from '../calculations/ZoneMath.js'

export class Zone{
  static zoneByType(zones, type){
    if (!zones || typeof zones.find !== 'function') return null
    const zoneMatch = zones.find(z => z.type === type)
    if (zoneMatch === undefined) return null
    return zoneMatch
  }

  constructor(spec = {}){
    this.type = spec.type
    this.x = spec.x
    this.y = spec.y
    this.width = spec.width
    this.height = spec.height
    if (spec.type === 'middle'){
      this.inCBlock = Boolean(spec.inCBlock)
      let linkedChildId = null
      if (spec.linkedChildUUID != null){
        linkedChildId = spec.linkedChildUUID
      }
      this.linkedChildUUID = linkedChildId
    }
  }

  getAbsoluteRect(blockX, blockY){
    return {
      x: blockX + this.x,
      y: blockY + this.y,
      width: this.width,
      height: this.height,
    }
  }

  static getLocalGeometry(data, blockElement){
    return Zone.#readLocalGeometry(data, blockElement)
  }

  static buildForBlock(data, blockElement){
    const g = Zone.#readLocalGeometry(data, blockElement)
    const { ZoneX, width, topBaseY, bottomBaseY } = g
    switch (data.type){
      case 'default-block':
        return [
          Zone.#makeTopZone(ZoneX, width, topBaseY),
          Zone.#makeBottomZone(ZoneX, width, bottomBaseY),
        ]
      case 'c-block': {
        const zones = [
          Zone.#makeTopZone(ZoneX, width, topBaseY),
          Zone.#makeBottomZone(ZoneX, width, bottomBaseY),
        ]
        zones.push(
          new Zone(CBlockMath.build_TopInnerZone_Empty(g))
        )
        return zones
      }
      case 'start-block':
        return [Zone.#makeBottomZone(ZoneX, width, bottomBaseY)]
      case 'stop-block':
        return [Zone.#makeTopZone(ZoneX, width, topBaseY)]
      default:
        return []
    }
  }

  static #bboxFallback(data){
    let blockHeight = Global.DEFAULT_BLOCK_HEIGHT
    if (data.height != null){
      blockHeight = data.height
    }
    let blockWidth = 0
    if (data.width != null){
      blockWidth = data.width
    }
    return {
      ZoneX: 0,
      width: blockWidth,
      topBaseY: 0,
      bottomBaseY: blockHeight,
    }
  }

  static #readLocalGeometry(data, blockElement){
    const fallback = Zone.#bboxFallback(data)
    const b = SvgUtils.get_BBox(blockElement)
    if (!b || b.width <= 0 || b.height <= 0) return fallback

    const r = SvgUtils.get_Rect(blockElement)
    const topLeft = SvgUtils.to_Local(blockElement, r.left, r.top)
    const topRight = SvgUtils.to_Local(blockElement, r.right, r.top)
    const bottomLeft = SvgUtils.to_Local(blockElement, r.left, r.bottom)
    if (!topLeft || !topRight || !bottomLeft) return fallback
    const widthFromClient = Math.abs(topRight.x - topLeft.x)
    let resolvedZoneWidth
    if (widthFromClient > 0){
      resolvedZoneWidth = widthFromClient
    } else {
      resolvedZoneWidth = b.width
    }
    return {
      ZoneX: topLeft.x,
      width: resolvedZoneWidth,
      topBaseY: ZoneMath.calc_TopZoneY(topLeft.y),
      bottomBaseY: bottomLeft.y,
    }
  }

  static #makeTopZone(ZoneX, width, topBaseY){
    return new Zone({
      type: 'top',
      x: ZoneX,
      y: topBaseY,
      width,
      height: Global.ZONE_HEIGHT,
    })
  }

  static #makeBottomZone(ZoneX, width, bottomBaseY){
    return new Zone({
      type: 'bottom',
      x: ZoneX,
      y: ZoneMath.calc_BottomZoneY(bottomBaseY),
      width,
      height: Global.ZONE_HEIGHT,
    })
  }
}
