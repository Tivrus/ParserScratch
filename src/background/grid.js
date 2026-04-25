import {
  logError,
  WORKSPACE_GRID_CELL_PX,
  WORKSPACE_EVENTS,
  WORKSPACE_BLOCK_GRID_SNAP,
} from '../constans/Global.js';
import { createWorkspaceCameraInertia } from './workspaceCameraInertia.js';

/** Snap world-space coordinates to the workspace grid (or 1px when {@link WORKSPACE_BLOCK_GRID_SNAP} is off). */
export function snapWorldCoordsToGrid(x, y, cellPx = WORKSPACE_GRID_CELL_PX) {
  const rx = Math.round(Number(x)) || 0;
  const ry = Math.round(Number(y)) || 0;
  if (!WORKSPACE_BLOCK_GRID_SNAP.enabled) {
    return { x: rx, y: ry };
  }
  return {
    x: Math.round(rx / cellPx) * cellPx,
    y: Math.round(ry / cellPx) * cellPx,
  };
}

/**
 * Pans the background grid on empty-workspace grab; keeps block-world `<g>` in sync via the same offset.
 * Block `x`/`y` stay in world space; view offset is applied only on `#block-world-root`.
 */
export function attachWorkspaceGridPan(workspaceEl, gridEl, options = {}) {
  const noop = {
    getOffset: () => ({ x: 0, y: 0 }),
    setOffset() {},
  };

  if (!workspaceEl || !gridEl) {
    logError('workspaceEl and gridEl are required', { context: 'attachWorkspaceGridPan' });
    return noop;
  }

  const { blockWorldRootEl = null } = options;
  const cellPx = WORKSPACE_GRID_CELL_PX;
  gridEl.style.backgroundSize = `${cellPx}px ${cellPx}px`;

  let offsetX = 0;
  let offsetY = 0;
  let isPanning = false;
  let panPointerStartX = 0;
  let panPointerStartY = 0;
  let panOffsetStartX = 0;
  let panOffsetStartY = 0;

  const applyViewOffset = () => {
    gridEl.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
    if (blockWorldRootEl) {
      blockWorldRootEl.setAttribute('transform', `translate(${offsetX},${offsetY})`);
    }
  };

  const notifyCameraPersist = () => {
    workspaceEl.dispatchEvent(
      new CustomEvent(WORKSPACE_EVENTS.cameraOffsetChanged, {
        bubbles: true,
        detail: { x: offsetX, y: offsetY },
      })
    );
  };

  const inertia = createWorkspaceCameraInertia({
    addOffset(dx, dy) {
      offsetX += dx;
      offsetY += dy;
      applyViewOffset();
    },
    settle: notifyCameraPersist,
  });

  const finishPanUi = () => {
    if (!isPanning) return;
    isPanning = false;
    workspaceEl.classList.remove('workspace--grid-panning');
  };

  const onGrabEndPan = (event) => {
    if (!isPanning) return;
    finishPanUi();
    inertia.onPanGrabEnd(event.detail);
  };

  const onGrabCancelPan = () => {
    inertia.stopRunningCoastAndSettle();
    if (!isPanning) return;
    finishPanUi();
    notifyCameraPersist();
  };

  workspaceEl.addEventListener('grab-start', (event) => {
    const d = event.detail;
    if (d.area !== 'workspace' || d.target !== 'empty') return;
    inertia.stopRunningCoastAndSettle();
    isPanning = true;
    panPointerStartX = d.clientX;
    panPointerStartY = d.clientY;
    panOffsetStartX = offsetX;
    panOffsetStartY = offsetY;
    workspaceEl.classList.add('workspace--grid-panning');
  });

  document.addEventListener('mousemove', (event) => {
    if (!isPanning) return;
    offsetX = panOffsetStartX + (event.clientX - panPointerStartX);
    offsetY = panOffsetStartY + (event.clientY - panPointerStartY);
    applyViewOffset();
  });

  document.addEventListener('grab-end', onGrabEndPan);
  document.addEventListener('grab-cancel', onGrabCancelPan);

  const setOffset = (x, y) => {
    inertia.abortCoastSilently();
    offsetX = Number(x) || 0;
    offsetY = Number(y) || 0;
    applyViewOffset();
  };

  applyViewOffset();

  return {
    getOffset() {
      return { x: offsetX, y: offsetY };
    },
    setOffset,
  };
}
