import { WORKSPACE_CAMERA_INERTIA } from '../constans/Global.js';

/**
 * Inertial glide after empty-workspace pan, from grab-end `duration` (ms) and `deltaX`/`deltaY` (px).
 * Tuning: {@link WORKSPACE_CAMERA_INERTIA} in `Global.js`.
 *
 * @param {{ addOffset: (dx: number, dy: number) => void, settle: () => void }} hooks
 */
export function createWorkspaceCameraInertia({ addOffset, settle }) {
  let rafId = null;

  /** Stop glide without persisting (e.g. programmatic `setOffset` / hydrate). */
  function abortCoastSilently() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  /** Stop glide and fire `settle` once (persist camera). */
  function stopRunningCoastAndSettle() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
    settle();
  }

  /**
   * After pan gesture ends (grab-end). Either starts coasting or calls settle() once.
   * @param {object} detail grab-end `event.detail`
   */
  function onPanGrabEnd(detail) {
    abortCoastSilently();
    const cfg = WORKSPACE_CAMERA_INERTIA;

    if (!cfg.enabled) {
      settle();
      return;
    }

    const rawDuration = Number(detail?.duration) || 0;
    const duration = Math.max(rawDuration, cfg.minDurationMs);
    if (rawDuration > cfg.maxDurationForImpulseMs) {
      settle();
      return;
    }

    const dx = Number(detail?.deltaX) || 0;
    const dy = Number(detail?.deltaY) || 0;
    const vx = (dx / duration) * cfg.impulseGain;
    const vy = (dy / duration) * cfg.impulseGain;
    if (Math.hypot(vx, vy) < cfg.minImpulsePxPerMs) {
      settle();
      return;
    }

    let vxv = vx;
    let vyv = vy;
    let last = performance.now();

    const step = (now) => {
      const live = WORKSPACE_CAMERA_INERTIA;
      if (!live.enabled) {
        rafId = null;
        settle();
        return;
      }
      const dt = Math.min(40, now - last);
      last = now;
      addOffset(vxv * dt, vyv * dt);
      const decay = live.frictionPerMs ** dt;
      vxv *= decay;
      vyv *= decay;
      if (Math.hypot(vxv, vyv) < live.minVelocityCutoffPxPerMs) {
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
