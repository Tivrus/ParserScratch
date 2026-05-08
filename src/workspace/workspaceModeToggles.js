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

/** Применить `doc.modes` из workspace.json / сервера к флагам рантайма. */
export function applyWorkspaceModesFromDoc(doc) {
  let modesSection = null;
  if (doc && doc.modes) {
    modesSection = doc.modes;
  }
  if (!modesSection || typeof modesSection !== 'object') return;
  if (typeof modesSection.cameraInertia === 'boolean') {
    Global.WORKSPACE_CAMERA_INERTIA.enabled = modesSection.cameraInertia;
  }
  if (typeof modesSection.blockGridSnap === 'boolean') {
    Global.WORKSPACE_BLOCK_GRID_SNAP.enabled = modesSection.blockGridSnap;
  }
}

/** Обновить вид кнопок панели по текущим флагам инерции и привязки к сетке. */
export function syncWorkspaceModeToggleButtons() {
  const inertiaBtn = document.getElementById(
    Global.DOM_IDS.toggleCameraInertia
  );
  const snapBtn = document.getElementById(Global.DOM_IDS.toggleBlockGridSnap);
  if (inertiaBtn) syncInertiaButton(inertiaBtn);
  if (snapBtn) syncSnapButton(snapBtn);
}

/** Переключить инерцию камеры; возвращает новое значение `enabled`. */
export function toggleWorkspaceCameraInertia() {
  Global.WORKSPACE_CAMERA_INERTIA.enabled =
    !Global.WORKSPACE_CAMERA_INERTIA.enabled;
  return Global.WORKSPACE_CAMERA_INERTIA.enabled;
}

/** Переключить привязку блоков к сетке; возвращает новое `enabled`. */
export function toggleWorkspaceBlockGridSnap() {
  Global.WORKSPACE_BLOCK_GRID_SNAP.enabled =
    !Global.WORKSPACE_BLOCK_GRID_SNAP.enabled;
  return Global.WORKSPACE_BLOCK_GRID_SNAP.enabled;
}

/**
 * Подключить кнопки панели (id из {@link Global.DOM_IDS}).
 * @param {HTMLElement} workspaceEl — получает {@link Global.WORKSPACE_EVENTS.modesChanged} для сохранения.
 */
export function attachWorkspaceModeToggles(workspaceEl) {
  const inertiaBtn = document.getElementById(
    Global.DOM_IDS.toggleCameraInertia
  );
  const snapBtn = document.getElementById(Global.DOM_IDS.toggleBlockGridSnap);
  if (!inertiaBtn || !snapBtn) return;

  const notifyModesPersist = () => {
    if (workspaceEl) {
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
