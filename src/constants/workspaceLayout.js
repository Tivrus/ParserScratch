/** When false, block positions round to 1px instead of snapping to the grid cell. */
export const WORKSPACE_BLOCK_GRID_SNAP = {
  enabled: true,
};

/**
 * Camera inertia after empty-workspace grid pan.
 * Uses GrabManager grab-end `duration` (ms) and `deltaX`/`deltaY` (px).
 * `enabled` is toggled at runtime (e.g. workspace toolbar).
 */
export const WORKSPACE_CAMERA_INERTIA = {
  enabled: true,
  /** Do not start coasting for very long drags (px/ms becomes tiny). */
  maxDurationForImpulseMs: 320,
  /** Floor for duration (ms) when computing release speed. */
  minDurationMs: 700,
  /** Minimum release speed (px per ms) to start inertial glide. */
  minImpulsePxPerMs: 0.01,
  /** Scales how much of the release velocity becomes coast velocity (0–1+). */
  impulseGain: 1.0,
  /** Per-ms velocity decay: each frame v *= frictionPerMs ** dt. Lower = quicker stop. */
  frictionPerMs: 0.9978,
  /** End glide when speed (px/ms) falls below this. */
  minVelocityCutoffPxPerMs: 0.016,
};
