import * as Global from '../../../src/constants/Global.js';
import * as WorkspaceCameraInertia from './workspaceCameraInertia.js';
import * as StackWorkspaceMath from '../calculations/StackWorkspaceMath.js';

export const snapBlockWorldPositionToWorkspaceGrid = StackWorkspaceMath.snapBlockWorldPositionToWorkspaceGrid;

export function attachWorkspaceGridPan(workspaceEl, gridEl, options = {}){
  const noop = {
    getOffset: function(){
      return { x: 0, y: 0 };
    },
    setOffset(){},
  };

  if (!workspaceEl || !gridEl){
    Global.logError('workspaceEl and gridEl are required', {
      context: 'attachWorkspaceGridPan',
    });
    return noop;
  }

  const { blockWorldRootEl = null } = options;
  const cellPx = Global.WORKSPACE_GRID_CELL_PX; // default 24px
  gridEl.style.backgroundSize = `${cellPx}px ${cellPx}px`;

  let offsetX = 0;
  let offsetY = 0;
  let isPanning = false;
  let panPointerStartX = 0;
  let panPointerStartY = 0;
  let panOffsetStartX = 0;
  let panOffsetStartY = 0;

  function applyViewOffset(){
    gridEl.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
    if (blockWorldRootEl){
      blockWorldRootEl.setAttribute(
        'transform',
        `translate(${offsetX},${offsetY})`
      );
    }
  }

  function notifyCameraPersist(){
    workspaceEl.dispatchEvent(
      new CustomEvent(Global.WORKSPACE_EVENTS.cameraOffsetChanged, {
        bubbles: true,
        detail: { x: offsetX, y: offsetY },
      })
    );
  }

  const inertia = WorkspaceCameraInertia.createWorkspaceCameraInertia({
    addOffset(dx, dy){
      offsetX += dx;
      offsetY += dy;
      applyViewOffset();
    },
    settle: notifyCameraPersist,
  });

  function finishPanUi(){
    if (!isPanning) return;
    isPanning = false;
    workspaceEl.classList.remove('workspace--grid-panning');
  }

  function onGrabEndPan(event){
    if (!isPanning) return;
    finishPanUi();
    inertia.onPanGrabEnd(event.detail);
  }

  function onGrabCancelPan(){
    inertia.stopRunningCoastAndSettle();
    if (!isPanning) return;
    finishPanUi();
    notifyCameraPersist();
  }

  workspaceEl.addEventListener('grab-start', function(event){
    const grabDetail = event.detail;
    if (grabDetail.area !== 'workspace' || grabDetail.target !== 'empty') return;
    inertia.stopRunningCoastAndSettle();
    isPanning = true;
    panPointerStartX = grabDetail.clientX;
    panPointerStartY = grabDetail.clientY;
    panOffsetStartX = offsetX;
    panOffsetStartY = offsetY;
    workspaceEl.classList.add('workspace--grid-panning');
  });

  document.addEventListener('mousemove', function(event){
    if (!isPanning) return;
    offsetX = panOffsetStartX + (event.clientX - panPointerStartX);
    offsetY = panOffsetStartY + (event.clientY - panPointerStartY);
    applyViewOffset();
  });

  document.addEventListener('grab-end', onGrabEndPan);
  document.addEventListener('grab-cancel', onGrabCancelPan);

  function setOffset(x, y){
    inertia.abortCoastSilently();
    offsetX = Number(x) || 0;
    offsetY = Number(y) || 0;
    applyViewOffset();
  }

  applyViewOffset();

  return {
    getOffset(){
      return { x: offsetX, y: offsetY };
    },
    setOffset,
  };
}
