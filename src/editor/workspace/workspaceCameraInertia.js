import * as Global from '../../constants/Global.js'

export function create_CameraInertia({ addOffset, settle }){
  let rafId = null

  function abortCoastSilently(){
    if (rafId === null) return
    cancelAnimationFrame(rafId)
    rafId = null
  }

  function stopRunningCoastAndSettle(){
    if (rafId === null) return
    cancelAnimationFrame(rafId)
    rafId = null
    settle()
  }

  function onPanGrabEnd(detail){
    abortCoastSilently()
    const cfg = Global.WORKSPACE_CAMERA_INERTIA

    if (!cfg.enabled){
      settle()
      return
    }

    let rawDuration = 0
    if (detail && detail.duration != null){
      const parsedDuration = Number(detail.duration)
      if (Number.isFinite(parsedDuration)){
        rawDuration = parsedDuration
      }
    }
    const duration = Math.max(rawDuration, cfg.minDurationMs)
    if (rawDuration > cfg.maxDurationForImpulseMs){
      settle()
      return
    }

    let deltaX = 0
    if (detail && detail.deltaX != null){
      const parsedDx = Number(detail.deltaX)
      if (Number.isFinite(parsedDx)){
        deltaX = parsedDx
      }
    }
    let deltaY = 0
    if (detail && detail.deltaY != null){
      const parsedDy = Number(detail.deltaY)
      if (Number.isFinite(parsedDy)){
        deltaY = parsedDy
      }
    }
    let vx = (deltaX / duration) * cfg.impulseGain
    let vy = (deltaY / duration) * cfg.impulseGain
    if (Math.hypot(vx, vy) < cfg.minImpulsePxPerMs){
      settle()
      return
    }

    let last = performance.now()

    const step = now => {
      const live = Global.WORKSPACE_CAMERA_INERTIA
      if (!live.enabled){
        rafId = null
        settle()
        return
      }
      const dt = Math.min(40, now - last)
      last = now
      addOffset(vx * dt, vy * dt)
      const decay = live.frictionPerMs ** dt
      vx *= decay
      vy *= decay
      if (Math.hypot(vx, vy) < live.minVelocityCutoffPxPerMs){
        rafId = null
        settle()
        return
      }
      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)
  }

  return {
    abortCoastSilently,
    stopRunningCoastAndSettle,
    onPanGrabEnd,
  }
}
