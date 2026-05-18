import * as Global from '../constants/Global.js';


export function snapBlockWorldPositionToWorkspaceGrid(x, y, cellPx = Global.WORKSPACE_GRID_CELL_PX){
  const roundedX = Math.round(Number(x)) || 0;
  const roundedY = Math.round(Number(y)) || 0;
  if (!Global.WORKSPACE_BLOCK_GRID_SNAP.enabled){
    return { x: roundedX, y: roundedY };
  }
  return {
    x: Math.round(roundedX / cellPx) * cellPx,
    y: Math.round(roundedY / cellPx) * cellPx,
  };
}

export function clampPanGestureDurationMsForCameraCoast(rawDurationMs, minDurationMs){
  return Math.max(rawDurationMs, minDurationMs);
}


export function calcCameraCoastVelocityPxPerMsFromPanImpulse(deltaPixels, durationMs, impulseGain){
  return (deltaPixels/durationMs) * impulseGain;
}

export function calcCameraVelocityDecayMultiplierForTimestep(frictionPerMs, dtMs){
  return frictionPerMs ** dtMs;
}

export function calcCameraPanOffsetDeltaPxForFrameFromVelocity(velocityPxPerMs, dtMs){
  return velocityPxPerMs * dtMs;
}
