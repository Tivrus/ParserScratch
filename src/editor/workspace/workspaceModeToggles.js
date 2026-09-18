import * as Global from '../../constants/Global.js'

function syncToggleButton(btn, on){
  btn.setAttribute('aria-pressed', String(on))
  btn.classList.toggle('workspace-mode-toggle--active', on)
}

function syncInertiaButton(btn){
  syncToggleButton(btn, Boolean(Global.WORKSPACE_CAMERA_INERTIA.enabled))
}

function syncSnapButton(btn){
  syncToggleButton(btn, Boolean(Global.WORKSPACE_BLOCK_GRID_SNAP.enabled))
}

export function apply_ModesFromDoc(doc){
  const {cameraInertia, blockGridSnap} = doc.modes

  Global.WORKSPACE_CAMERA_INERTIA.enabled = cameraInertia
  Global.WORKSPACE_BLOCK_GRID_SNAP.enabled = blockGridSnap
}

export function sync_ModeButtons({inertiaBtn, snapBtn}){
  syncInertiaButton(inertiaBtn)
  syncSnapButton(snapBtn)
}

export function toggle_CameraInertia(){
  Global.WORKSPACE_CAMERA_INERTIA.enabled =
    !Global.WORKSPACE_CAMERA_INERTIA.enabled
  return Global.WORKSPACE_CAMERA_INERTIA.enabled
}

export function toggle_GridSnap(){
  Global.WORKSPACE_BLOCK_GRID_SNAP.enabled =
    !Global.WORKSPACE_BLOCK_GRID_SNAP.enabled
  return Global.WORKSPACE_BLOCK_GRID_SNAP.enabled
}

export function attach_ModeToggles(workspaceEl,{inertiaBtn, snapBtn}){
  const notifyModesPersist = () => {
    workspaceEl.dispatchEvent(
      new CustomEvent(Global.WORKSPACE_EVENTS.modesChanged, {
        bubbles: true,
      })
    )
  }

  inertiaBtn.addEventListener('click', () => {
    toggle_CameraInertia()
    syncInertiaButton(inertiaBtn)
    notifyModesPersist()
  })

  snapBtn.addEventListener('click', () => {
    toggle_GridSnap()
    syncSnapButton(snapBtn)
    notifyModesPersist()
  })

  syncInertiaButton(inertiaBtn)
  syncSnapButton(snapBtn)
}
