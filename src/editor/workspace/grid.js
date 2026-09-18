import * as Global from '../../constants/Global.js'
import * as WorkspaceCameraInertia from './workspaceCameraInertia.js'
import * as WorkspaceMath from '../../calculations/WorkspaceMath.js'

export const calc_GridSnap = WorkspaceMath.calc_GridSnap

export function attach_GridPan(workspaceEl, gridEl, blockWorldRootEl){
  const cellPx = Global.WORKSPACE_GRID_CELL_PX
  gridEl.style.backgroundSize = `${cellPx}px ${cellPx}px`

  let offsetX = 0
  let offsetY = 0
  let isPanning = false
  let panPointerStartX = 0
  let panPointerStartY = 0
  let panOffsetStartX = 0
  let panOffsetStartY = 0

  function applyViewOffset(){
    gridEl.style.backgroundPosition = `${offsetX}px ${offsetY}px`
    blockWorldRootEl.setAttribute('transform', `translate(${offsetX},${offsetY})`)
  }

  function notifyCameraPersist(){
    workspaceEl.dispatchEvent(
      new CustomEvent(Global.WORKSPACE_EVENTS.cameraOffsetChanged, {
        bubbles: true,
        detail: { x: offsetX, y: offsetY },
      })
    )
  }

  const inertia = WorkspaceCameraInertia.create_CameraInertia({
    addOffset(dx, dy){
      offsetX += dx
      offsetY += dy
      applyViewOffset()
    },
    settle: notifyCameraPersist,
  })

  function finishPanUi() {
    if (!isPanning) return false
    isPanning = false
    workspaceEl.classList.remove('workspace--grid-panning')
    return true
  }

  function onGrabEndPan(event) {
    if (finishPanUi()) {
      inertia.onPanGrabEnd(event.detail)
    }
  }

  function onGrabCancelPan() {
    inertia.stopRunningCoastAndSettle()
    if (finishPanUi()) {
      notifyCameraPersist()
    }
  }

  workspaceEl.addEventListener('grab-start', function(event){
    const grabDetail = event.detail
    if (grabDetail.area !== 'workspace' || grabDetail.target !== 'empty') return
    
    inertia.stopRunningCoastAndSettle()
    isPanning = true
    panPointerStartX = grabDetail.clientX
    panPointerStartY = grabDetail.clientY
    panOffsetStartX = offsetX
    panOffsetStartY = offsetY
    workspaceEl.classList.add('workspace--grid-panning')
  })

  document.addEventListener('mousemove', function(event){
    if (!isPanning) return
    offsetX = panOffsetStartX + (event.clientX - panPointerStartX)
    offsetY = panOffsetStartY + (event.clientY - panPointerStartY)
    applyViewOffset()
  })

  document.addEventListener('grab-end', onGrabEndPan)
  document.addEventListener('grab-cancel', onGrabCancelPan)

  function setOffset(x, y) {
    inertia.abortCoastSilently()
    offsetX = x
    offsetY = y
    applyViewOffset()
  }

  applyViewOffset()

  return {
    getOffset(){
      return { x: offsetX, y: offsetY }
    },
    setOffset,
  }
}