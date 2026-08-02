import * as Global from '../constants/Global.js';
import * as StackWorkspaceMath from '../calculations/StackWorkspaceMath.js';

export function createWorkspaceCameraInertia({ addOffset, settle }){
  let rafId = null;

  function abortCoastSilently(){
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function stopRunningCoastAndSettle(){
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
    settle();
  }

  function onPanGrabEnd(detail){
    abortCoastSilently();
    const cfg = Global.WORKSPACE_CAMERA_INERTIA;

    if (!cfg.enabled){
      settle();
      return;
    }

    let rawDuration = 0;
    if (detail && detail.duration != null){
      const parsedDuration = Number(detail.duration);
      if (Number.isFinite(parsedDuration)){
        rawDuration = parsedDuration;
      }
    }
    const duration = StackWorkspaceMath.calc_CameraCoast_PanGestureDurationMs(
      rawDuration,
      cfg.minDurationMs
    );
    if (rawDuration > cfg.maxDurationForImpulseMs){
      settle();
      return;
    }

    let deltaXPixels = 0;
    if (detail && detail.deltaX != null){
      const parsedDx = Number(detail.deltaX);
      if (Number.isFinite(parsedDx)){
        deltaXPixels = parsedDx;
      }
    }
    let deltaYPixels = 0;
    if (detail && detail.deltaY != null){
      const parsedDy = Number(detail.deltaY);
      if (Number.isFinite(parsedDy)){
        deltaYPixels = parsedDy;
      }
    }
    const vx = StackWorkspaceMath.calc_CameraCoast_VelocityPxPerMs(
      deltaXPixels,
      duration,
      cfg.impulseGain
    );
    const vy = StackWorkspaceMath.calc_CameraCoast_VelocityPxPerMs(
      deltaYPixels,
      duration,
      cfg.impulseGain
    );
    if (Math.hypot(vx, vy) < cfg.minImpulsePxPerMs){
      settle();
      return;
    }

    let vxv = vx;
    let vyv = vy;
    let last = performance.now();

    const step = now => {
      const live = Global.WORKSPACE_CAMERA_INERTIA;
      if (!live.enabled){
        rafId = null;
        settle();
        return;
      }
      const dt = Math.min(40, now - last);
      last = now;
      addOffset(
        StackWorkspaceMath.calc_CameraCoast_PanOffsetDeltaPx(
          vxv,
          dt
        ),
        StackWorkspaceMath.calc_CameraCoast_PanOffsetDeltaPx(
          vyv,
          dt
        )
      );
      const decay = StackWorkspaceMath.calc_CameraCoast_VelocityDecayMultiplier(
        live.frictionPerMs,
        dt
      );
      vxv *= decay;
      vyv *= decay;
      if (Math.hypot(vxv, vyv) < live.minVelocityCutoffPxPerMs){
        rafId = null;
        settle();
        return;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
  }

  return {
    abortCoastSilently,
    stopRunningCoastAndSettle,
    onPanGrabEnd,
  };
}
