import * as Global from '../../constants/Global.js'
import * as SvgUtils from '../../utils/SvgUtils.js'

export class GrabManager {
  constructor(containersConfig = {}){
    this.state = {
      isGrabbed: false,
      area: null,
      target: null,
      element: null,
      grabKey: null,
      start: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 },
      end: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 },
    }

    this.moveThreshold = Global.MOVE_THRESHOLD
    this.containerEls = this.#resolveContainerElements(containersConfig)

    this.#initListeners()
  }

  #resolveContainerElements(config){
    return {
      workspace: config.workspace,
      blockTemplates: config.blockTemplates,
    }
  }

  #initListeners(){
    Object.entries(this.containerEls).forEach(([areaName, container]) => {
      container.addEventListener('mousedown', e => {
        if (
          !(e instanceof MouseEvent) ||
          e.button !== 0 ||
          this.state.isGrabbed
        ){
          return
        }
        this.#handleGrabStart(e, areaName, container)
      })
    })

    document.addEventListener('mouseup', e => {
      if (!this.state.isGrabbed || !(e instanceof MouseEvent)) return
      this.#handleGrabEnd(e)
    })

    window.addEventListener('blur', () => {
      if (this.state.isGrabbed) this.#handleGrabCancel()
    })
  }

  #resolveGrabTarget(event, areaName, container){
    if (areaName === 'workspace'){
      const block = event.target.closest('.workspace-block')
      return block
        ? {
            target: 'block',
            element: block,
            grabKey: SvgUtils.read_UUID(block),
          }
        : { target: 'empty', element: container, grabKey: null }
    }

    if (areaName === 'blockTemplates'){
      const template = event.target.closest('.block-template')
      return template
        ? {
            target: 'template',
            element: template,
            grabKey: template.dataset.blockId,
          }
        : { target: 'empty', element: container, grabKey: null }
    }

    return { target: 'empty', element: container, grabKey: null }
  }

  #handleGrabStart(event, areaName, container){
    const { target, element, grabKey } = this.#resolveGrabTarget(
      event,
      areaName,
      container
    )

    const rect = SvgUtils.get_Rect(container)
    this.state = {
      isGrabbed: true,
      area: areaName,
      target,
      element,
      grabKey,
      start: {
        x: Math.round(event.clientX - rect.left),
        y: Math.round(event.clientY - rect.top),
        clientX: event.clientX,
        clientY: event.clientY,
        timestamp: Date.now(),
      },
      end: { x: 0, y: 0, clientX: 0, clientY: 0, timestamp: 0 },
    }

    this.#emit(container, 'grab-start', {
      ...this.state.start,
      area: this.state.area,
      target: this.state.target,
      grabKey: this.state.grabKey,
      element: this.state.element,
    })

    event.stopPropagation()
  }

  #handleGrabEnd(event){
    const startArea = this.state.area
    const startContainer = this.#getContainerByArea(startArea)
    if (!startContainer) return

    let endArea = this.#getAreaByPoint(event.clientX, event.clientY)
    if (endArea == null){
      endArea = startArea
    }
    const areaChanged = endArea !== startArea
    const endContainer = areaChanged
      ? this.#getContainerByArea(endArea)
      : startContainer

    const startRect = SvgUtils.get_Rect(startContainer)
    const endRect = SvgUtils.get_Rect(endContainer)

    const endX = Math.round(event.clientX - endRect.left)
    const endY = Math.round(event.clientY - endRect.top)

    this.state.end = {
      x: endX,
      y: endY,
      clientX: endX,
      clientY: endY,
      timestamp: Date.now(),
    }

    const deltaX = event.clientX - startRect.left - this.state.start.x
    const deltaY = event.clientY - startRect.top - this.state.start.y
    const duration = this.state.end.timestamp - this.state.start.timestamp
    const moved =
      Math.abs(deltaX) > this.moveThreshold ||
      Math.abs(deltaY) > this.moveThreshold

    this.#emit(startContainer, 'grab-end', {
      ...this.state,
      clientX: event.clientX,
      clientY: event.clientY,
      endArea,
      areaChanged,
      deltaX,
      deltaY,
      duration,
      moved,
    })

    this.state.isGrabbed = false
  }

  #handleGrabCancel(){
    const container = this.#getContainerByArea(this.state.area)
    if (container){
      this.#emit(container, 'grab-cancel', { ...this.state })
    }
    this.state.isGrabbed = false
  }

  #getAreaByPoint(clientX, clientY){
    for (const [areaName, container] of Object.entries(this.containerEls)){
      if (!container) continue
      const rect = SvgUtils.get_Rect(container)
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ){
        return areaName
      }
    }
    return null
  }

  #getContainerByArea(areaName){
    let containerForArea = this.containerEls[areaName]
    if (containerForArea == null){
      containerForArea = this.containerEls.workspace
    }
    return containerForArea
  }

  #emit(targetElement, eventName, detail){
    targetElement.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: true,
      })
    )
  }

  isBlockGrabbed(){
    return this.state.isGrabbed && this.state.target === 'block'
  }

  isTemplateGrabbed(){
    return this.state.isGrabbed && this.state.target === 'template'
  }

  getWorkspaceBlockGrabUUID(){
    if (this.isBlockGrabbed()){
      return this.state.grabKey
    }
    return null
  }

  isWorkspaceBlockGrabDetail(detail){
    return Boolean(
      detail &&
        detail.target === 'block' &&
        detail.area === 'workspace'
    )
  }
}
