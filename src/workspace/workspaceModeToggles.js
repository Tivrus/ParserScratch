import * as Global from '../constants/Global.js';

function syncInertiaButton(btn){
  const on = Boolean(Global.WORKSPACE_CAMERA_INERTIA.enabled);
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('workspace-mode-toggle--active', on);
}

function syncSnapButton(btn){
  const on = Boolean(Global.WORKSPACE_BLOCK_GRID_SNAP.enabled);
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('workspace-mode-toggle--active', on);
}

export function applyWorkspaceModesFromDoc(doc){
  let modesSection = null;
  if (doc && doc.modes){
    modesSection = doc.modes;
  }
  if (!modesSection || typeof modesSection !== 'object') return;
  if (typeof modesSection.cameraInertia === 'boolean'){
    Global.WORKSPACE_CAMERA_INERTIA.enabled = modesSection.cameraInertia;
  }
  if (typeof modesSection.blockGridSnap === 'boolean'){
    Global.WORKSPACE_BLOCK_GRID_SNAP.enabled = modesSection.blockGridSnap;
  }
}

export function syncWorkspaceModeToggleButtons(modeToggleButtons){
  if (!modeToggleButtons) return;
  const { inertiaBtn, snapBtn } = modeToggleButtons;
  if (inertiaBtn) syncInertiaButton(inertiaBtn);
  if (snapBtn) syncSnapButton(snapBtn);
}

export function toggleWorkspaceCameraInertia(){
  Global.WORKSPACE_CAMERA_INERTIA.enabled =
    !Global.WORKSPACE_CAMERA_INERTIA.enabled;
  return Global.WORKSPACE_CAMERA_INERTIA.enabled;
}

export function toggleWorkspaceBlockGridSnap(){
  Global.WORKSPACE_BLOCK_GRID_SNAP.enabled =
    !Global.WORKSPACE_BLOCK_GRID_SNAP.enabled;
  return Global.WORKSPACE_BLOCK_GRID_SNAP.enabled;
}

export function attachWorkspaceModeToggles(workspaceEl, modeToggleButtons){
  const { inertiaBtn, snapBtn } = modeToggleButtons || {};
  if (!inertiaBtn || !snapBtn) return;

  const notifyModesPersist = () => {
    if (workspaceEl){
      workspaceEl.dispatchEvent(
        new CustomEvent(Global.WORKSPACE_EVENTS.modesChanged, { bubbles: true })
      );
    }
  };

  inertiaBtn.addEventListener('click', () => {
    toggleWorkspaceCameraInertia();
    syncInertiaButton(inertiaBtn);
    notifyModesPersist();
  });

  snapBtn.addEventListener('click', () => {
    toggleWorkspaceBlockGridSnap();
    syncSnapButton(snapBtn);
    notifyModesPersist();
  });

  syncInertiaButton(inertiaBtn);
  syncSnapButton(snapBtn);
}
