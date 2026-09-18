import * as Global from '../constants/Global.js'
import * as SvgUtils from '../utils/SvgUtils.js'
import * as ZoneMath from '../calculations/ZoneMath.js'
import * as StackSnap from '../editor/stack-connect/StackSnap.js'

const DEBUG_GROUP_CLASS = 'Zone-debug-Zones'

function draw_Zone(parent, zone, x, y, width, height){
  parent.appendChild(
    SvgUtils.createElement('rect', {
      x: String(x),
      y: String(y),
      width: String(width),
      height: String(height),
      ...Global.ZONE_STYLE,
    })
  )

  const label = SvgUtils.createElement('text', {
    x: String(x + 8),
    y: String(y + 12),
    fill: '#00ff00',
    'font-size': '11',
    'font-weight': 'bold',
    'font-family': 'Arial, sans-serif',
    'pointer-events': 'none',
  })
  label.style.textShadow = '0 0 3px rgba(0,0,0,0.8)'
  
  let zoneLabelText
  if (zone.type === 'middle' && zone.inCBlock){
    zoneLabelText = 'middle(C)'
  } else {
    zoneLabelText = zone.type
  }
  label.textContent = zoneLabelText
  parent.appendChild(label)
}

export function apply_ZoneDebug(
  blockRegistry,
  blockContainerEl,
  overlayEl
){
  const staleDebugGroup = blockContainerEl.querySelector(`g.${DEBUG_GROUP_CLASS}`)
  if (staleDebugGroup) {
    staleDebugGroup.remove()
  }

  const createdGroups = []
  let g = null
  if (overlayEl && typeof overlayEl.querySelector === 'function'){
    g = overlayEl.querySelector(`g.${DEBUG_GROUP_CLASS}`)
  }
  if (!g && overlayEl){
    g = SvgUtils.createElement('g', {
      class: DEBUG_GROUP_CLASS,
      'pointer-events': 'none',
    })
    overlayEl.appendChild(g)
    createdGroups.push(g)
  } else if (g){
    createdGroups.push(g)
  }

  let rafId = requestAnimationFrame(function tick(){
    if (!overlayEl || !g){
      rafId = requestAnimationFrame(tick)
      return
    }

    g.replaceChildren()
    const or = SvgUtils.get_Rect(overlayEl)

    for (const block of blockRegistry.values()){
      const zoneList = block.Zones
      if (!zoneList || !zoneList.length || !block.element) continue
      for (const zone of block.Zones){
        let zc
        if (zone.type === 'middle' && zone.linkedChildUUID){
          const ch = blockRegistry.get(zone.linkedChildUUID)
          zc =
            ch && StackSnap.calc_MiddleHitRect(block, ch, zone)
        } else {
          zc = ZoneMath.calc_ZoneClientRect(block.element, zone)
        }
        if (!zc) continue
        const x = zc.left - or.left
        const y = zc.top - or.top
        const w = zc.right - zc.left
        const h = zc.bottom - zc.top
        draw_Zone(g, zone, x, y, w, h)
      }
    }

    rafId = requestAnimationFrame(tick)
  })

  return () => {
    cancelAnimationFrame(rafId)
    createdGroups.forEach(el => el.remove())
  }
}
