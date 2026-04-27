import * as Global from '../constants/Global.js';

function syncInertiaButton(btn) {
  const on = Boolean(Global.WORKSPACE_CAMERA_INERTIA.enabled);
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('workspace-mode-toggle--active', on);
}

function syncSnapButton(btn) {
  const on = Boolean(Global.WORKSPACE_BLOCK_GRID_SNAP.enabled);
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('workspace-mode-toggle--active', on);
}

/** Apply `doc.modes` from workspace.json / server into runtime flags. */
export function applyWorkspaceModesFromDoc(doc) {
  const m = doc?.modes;
  if (!m || typeof m !== 'object') return;
  if (typeof m.cameraInertia === 'boolean') {
    Global.WORKSPACE_CAMERA_INERTIA.enabled = m.cameraInertia;
  }
  if (typeof m.blockGridSnap === 'boolean') {
    Global.WORKSPACE_BLOCK_GRID_SNAP.enabled = m.blockGridSnap;
  }
}

/** Refresh toolbar toggle visuals from current inertia / grid snap flags. */
export function syncWorkspaceModeToggleButtons() {
  const inertiaBtn = document.getElementById(Global.DOM_IDS.toggleCameraInertia);
  const snapBtn = document.getElementById(Global.DOM_IDS.toggleBlockGridSnap);
  if (inertiaBtn) syncInertiaButton(inertiaBtn);
  if (snapBtn) syncSnapButton(snapBtn);
}

/** Flip camera inertia; returns new `enabled` state. */
export function toggleWorkspaceCameraInertia() {
  Global.WORKSPACE_CAMERA_INERTIA.enabled = !Global.WORKSPACE_CAMERA_INERTIA.enabled;
  return Global.WORKSPACE_CAMERA_INERTIA.enabled;
}

/** Flip block grid snap; returns new `enabled` state. */
export function toggleWorkspaceBlockGridSnap() {
  Global.WORKSPACE_BLOCK_GRID_SNAP.enabled = !Global.WORKSPACE_BLOCK_GRID_SNAP.enabled;
  return Global.WORKSPACE_BLOCK_GRID_SNAP.enabled;
}

/**
 * Wire toolbar buttons (ids from {@link Global.DOM_IDS}).
 * @param {HTMLElement} workspaceEl — receives {@link Global.WORKSPACE_EVENTS.modesChanged} for persistence.
 */
export function attachWorkspaceModeToggles(workspaceEl) {
  const inertiaBtn = document.getElementById(Global.DOM_IDS.toggleCameraInertia);
  const snapBtn = document.getElementById(Global.DOM_IDS.toggleBlockGridSnap);
  if (!inertiaBtn || !snapBtn) return;

  const notifyModesPersist = () => {
    workspaceEl?.dispatchEvent(
      new CustomEvent(Global.WORKSPACE_EVENTS.modesChanged, { bubbles: true })
    );
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
