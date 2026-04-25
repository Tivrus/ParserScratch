import {
  DOM_IDS,
  WORKSPACE_BLOCK_GRID_SNAP,
  WORKSPACE_CAMERA_INERTIA,
  WORKSPACE_EVENTS,
} from '../constans/Global.js';

function syncInertiaButton(btn) {
  const on = Boolean(WORKSPACE_CAMERA_INERTIA.enabled);
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('workspace-mode-toggle--active', on);
}

function syncSnapButton(btn) {
  const on = Boolean(WORKSPACE_BLOCK_GRID_SNAP.enabled);
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('workspace-mode-toggle--active', on);
}

/** Apply `doc.modes` from workspace.json / server into runtime flags. */
export function applyWorkspaceModesFromDoc(doc) {
  const m = doc?.modes;
  if (!m || typeof m !== 'object') return;
  if (typeof m.cameraInertia === 'boolean') {
    WORKSPACE_CAMERA_INERTIA.enabled = m.cameraInertia;
  }
  if (typeof m.blockGridSnap === 'boolean') {
    WORKSPACE_BLOCK_GRID_SNAP.enabled = m.blockGridSnap;
  }
}

/** Refresh toolbar toggle visuals from current {@link WORKSPACE_CAMERA_INERTIA} / {@link WORKSPACE_BLOCK_GRID_SNAP}. */
export function syncWorkspaceModeToggleButtons() {
  const inertiaBtn = document.getElementById(DOM_IDS.toggleCameraInertia);
  const snapBtn = document.getElementById(DOM_IDS.toggleBlockGridSnap);
  if (inertiaBtn) syncInertiaButton(inertiaBtn);
  if (snapBtn) syncSnapButton(snapBtn);
}

/** Flip camera inertia; returns new `enabled` state. */
export function toggleWorkspaceCameraInertia() {
  WORKSPACE_CAMERA_INERTIA.enabled = !WORKSPACE_CAMERA_INERTIA.enabled;
  return WORKSPACE_CAMERA_INERTIA.enabled;
}

/** Flip block grid snap; returns new `enabled` state. */
export function toggleWorkspaceBlockGridSnap() {
  WORKSPACE_BLOCK_GRID_SNAP.enabled = !WORKSPACE_BLOCK_GRID_SNAP.enabled;
  return WORKSPACE_BLOCK_GRID_SNAP.enabled;
}

/**
 * Wire toolbar buttons (ids from {@link DOM_IDS}).
 * @param {HTMLElement} workspaceEl — receives {@link WORKSPACE_EVENTS.modesChanged} for persistence.
 */
export function attachWorkspaceModeToggles(workspaceEl) {
  const inertiaBtn = document.getElementById(DOM_IDS.toggleCameraInertia);
  const snapBtn = document.getElementById(DOM_IDS.toggleBlockGridSnap);
  if (!inertiaBtn || !snapBtn) return;

  const notifyModesPersist = () => {
    workspaceEl?.dispatchEvent(
      new CustomEvent(WORKSPACE_EVENTS.modesChanged, { bubbles: true })
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
