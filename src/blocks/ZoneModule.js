import * as CBlockTopInner from '../c-block/topInnerZone.js';
import * as Global from '../../../src/constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import * as ZoneLocalMath from '../calculations/ZoneLocalMath.js';

/** Полосы попадания коннекторов в локальной системе координат группы `<g>` блока. */
export class Zone{
  static zoneByType(zones, type){
    if (!zones || typeof zones.find !== 'function') return null;

    const zoneMatch = zones.find(z => z.type === type);
    if (zoneMatch === undefined) return null;
    return zoneMatch;
  }

  constructor(spec = {}){
    this.type = spec.type;
    this.x = spec.x;
    this.y = spec.y;
    this.width = spec.width;
    this.height = spec.height;
    if (spec.type === 'middle'){
      this.inCBlock = Boolean(spec.inCBlock);
      let linkedChildId = null;
      if (spec.linkedChildUUID != null){
        linkedChildId = spec.linkedChildUUID;
      }
      this.linkedChildUUID = linkedChildId;
    }
  }

  getAbsoluteRect(blockX, blockY){
    return {
      x: blockX + this.x,
      y: blockY + this.y,
      width: this.width,
      height: this.height,
    };
  }

  /** Как во внутреннем чтении для `buildForBlock` (локальный фрейм коннектора под `<g>` блока). */
  static getLocalGeometry(data, blockElement){
    return Zone.#readLocalGeometry(data, blockElement);
  }

  static buildForBlock(data, blockElement){
    const g = Zone.#readLocalGeometry(data, blockElement);
    const { ZoneX, width, topBaseY, bottomBaseY } = g;
    switch (data.type){
      case 'default-block':
        return [
          Zone.#makeTopZone(ZoneX, width, topBaseY),
          Zone.#makeBottomZone(ZoneX, width, bottomBaseY),
        ];
      case 'c-block': {
        const zones = [
          Zone.#makeTopZone(ZoneX, width, topBaseY),
          Zone.#makeBottomZone(ZoneX, width, bottomBaseY),
        ];
        zones.push(
          new Zone(CBlockTopInner.calcCBlockTopInnerWhenIsEmpty(g))
        );
        return zones;
      }
      case 'start-block':
        return [Zone.#makeBottomZone(ZoneX, width, bottomBaseY)];
      case 'stop-block':
        return [Zone.#makeTopZone(ZoneX, width, topBaseY)];
      default:
        return [];
    }
  }

  static #bboxFallback(data){
    let blockHeight = Global.DEFAULT_BLOCK_HEIGHT;
    if (data.height != null){
      blockHeight = data.height;
    }
    let blockWidth = 0;
    if (data.width != null){
      blockWidth = data.width;
    }
    return {
      ZoneX: 0,
      width: blockWidth,
      topBaseY: 0,
      bottomBaseY: blockHeight,
    };
  }

  static #readLocalGeometry(data, blockElement){
    // Safe bbox fallback checks
    const fallback = Zone.#bboxFallback(data);
    if (!blockElement || typeof blockElement.getBBox !== 'function'){
      return fallback;
    }
    let b;
    try{
      b = blockElement.getBBox();
    }
    catch{
      return fallback;
    }
    if (b.width <= 0 || b.height <= 0) return fallback;



    //
    const r = SvgUtils.getBoundingClientRectRounded(blockElement);
    const topLeft = SvgUtils.clientPointToElementLocal(blockElement, r.left, r.top);
    const topRight = SvgUtils.clientPointToElementLocal(blockElement, r.right, r.top);
    const bottomLeft = SvgUtils.clientPointToElementLocal(blockElement, r.left, r.bottom);
    if (!topLeft || !topRight || !bottomLeft) return fallback;
    const widthFromClient = Math.abs(topRight.x - topLeft.x);
    let resolvedZoneWidth;
    if (widthFromClient > 0){
      resolvedZoneWidth = widthFromClient;
    } else {
      resolvedZoneWidth = b.width;
    }
    return {
      ZoneX: topLeft.x,
      width: resolvedZoneWidth,
      topBaseY: ZoneLocalMath.calc_BlockZone_Top_Pos_TopEdgeY(topLeft.y),
      bottomBaseY: bottomLeft.y,
    };
  }

  static #makeTopZone(ZoneX, width, topBaseY){
    return new Zone({
      type: 'top',
      x: ZoneX,
      y: topBaseY,
      width,
      height: Global.ZONE_HEIGHT,
    });
  }

  static #makeBottomZone(ZoneX, width, bottomBaseY){
    return new Zone({
      type: 'bottom',
      x: ZoneX,
      y: ZoneLocalMath.calc_BlockZone_Bottom_Pos_BottomEdgeY(bottomBaseY),
      width,
      height: Global.ZONE_HEIGHT,
    });
  }
}
