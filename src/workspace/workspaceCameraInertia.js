import * as Global from '../constants/Global.js';
import * as StackWorkspaceMath from '../calculations/StackWorkspaceMath.js';

/**
 * Инерционное скольжение после панорамирования по пустому полотну (grab-end: длительность мс, `deltaX`/`deltaY` пикс).
 * Настройки: {@link Global.WORKSPACE_CAMERA_INERTIA} в `Global.js`.
 *
 * @param {{ addOffset: (dx: number, dy: number) => void, settle: () => void }} hooks
 */
export function createWorkspaceCameraInertia({ addOffset, settle }) {
  let rafId = null;

  /** Остановить скольжение без сохранения (программный `setOffset` / hydrate). */
  function abortCoastSilently() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  /** Остановить скольжение и один раз вызвать `settle` (сохранить камеру). */
  function stopRunningCoastAndSettle() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
    settle();
  }

  /**
   * Окончание жеста панорамирования (grab-end): либо старт coast, либо один вызов `settle()`.
   * @param {object} detail поле `event.detail` у grab-end
   */
  function onPanGrabEnd(detail) {
    abortCoastSilently();
    const cfg = Global.WORKSPACE_CAMERA_INERTIA;

    if (!cfg.enabled) {
      settle();
      return;
    }

    let rawDuration = 0;
    if (detail && detail.duration != null) {
      const parsedDuration = Number(detail.duration);
      if (Number.isFinite(parsedDuration)) {
        rawDuration = parsedDuration;
      }
    }
    const duration = StackWorkspaceMath.coastGestureDurationMs(
      rawDuration,
      cfg.minDurationMs
    );
    if (rawDuration > cfg.maxDurationForImpulseMs) {
      settle();
      return;
    }

    let deltaXPixels = 0;
    if (detail && detail.deltaX != null) {
      const parsedDx = Number(detail.deltaX);
      if (Number.isFinite(parsedDx)) {
        deltaXPixels = parsedDx;
      }
    }
    let deltaYPixels = 0;
    if (detail && detail.deltaY != null) {
      const parsedDy = Number(detail.deltaY);
      if (Number.isFinite(parsedDy)) {
        deltaYPixels = parsedDy;
      }
    }
    const vx = StackWorkspaceMath.impulseVelocityPxPerMs(
      deltaXPixels,
      duration,
      cfg.impulseGain
    );
    const vy = StackWorkspaceMath.impulseVelocityPxPerMs(
      deltaYPixels,
      duration,
      cfg.impulseGain
    );
    if (Math.hypot(vx, vy) < cfg.minImpulsePxPerMs) {
      settle();
      return;
    }

    let vxv = vx;
    let vyv = vy;
    let last = performance.now();

    const step = now => {
      const live = Global.WORKSPACE_CAMERA_INERTIA;
      if (!live.enabled) {
        rafId = null;
        settle();
        return;
      }
      const dt = Math.min(40, now - last);
      last = now;
      addOffset(
        StackWorkspaceMath.offsetDeltaForFrame(vxv, dt),
        StackWorkspaceMath.offsetDeltaForFrame(vyv, dt)
      );
      const decay = StackWorkspaceMath.velocityDecayFactorForFrame(
        live.frictionPerMs,
        dt
      );
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
