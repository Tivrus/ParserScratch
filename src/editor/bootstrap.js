import * as CategoryFactory from '../Factories/CategoryFactory.js'
import * as BlockModule from '../blocks/BlockModule.js'
import * as GrabManagerModule from './input/GrabManager.js'
import * as BlockDeletionManagerModule from './services/BlockDeletionManager.js'
import * as WorkspacePersistence from './workspace/WorkspacePersistence.js'
import * as Interactions from './interactions.js'
import * as Grid from './workspace/grid.js'
import * as WorkspaceModeToggles from './workspace/workspaceModeToggles.js'
import * as Global from '../constants/Global.js'

function find_EditorDomElements() {
  const ids = Global.DOM_IDS
  return {
    workspaceEl: document.getElementById(ids.workspace),
    blockTemplatesEl: document.getElementById(ids.blockTemplates),
    blockContainerEl: document.getElementById(ids.blockContainer),
    blockWorldRootEl: document.getElementById(ids.blockWorldRoot),
    dragOverlayEl: document.getElementById(ids.dragOverlay),
    gridEl: document.getElementById(ids.grid),
    categoryListEl: document.getElementById(ids.categoryList),
    trashCanEl: document.getElementById(ids.trashCan),
    sidebarEl: document.getElementById(ids.sidebar),
    toggleCameraInertiaEl: document.getElementById(ids.toggleCameraInertia),
    toggleBlockGridSnapEl: document.getElementById(ids.toggleBlockGridSnap),
  }
}

function require_EditorDomElements() {
  const dom = find_EditorDomElements()

  const missing = Object.keys(dom).filter(key => !dom[key])
  if (missing.length) {
    Global.logError('Missing editor DOM elements', {
      context: 'bootstrap',
      missing,
    })
    throw new Error(`Missing editor DOM elements: ${missing.join(', ')}`)
  }
  return dom
}
const dom = require_EditorDomElements()

class ScratchEditor {
  #workspaceEl
  #blockTemplatesEl
  #blockContainerEl
  #blockWorldRootEl
  #dragOverlayEl
  #gridEl
  #categoryListEl
  #trashCanEl
  #sidebarEl
  #toggleCameraInertiaEl
  #toggleBlockGridSnapEl
//↑Всегда присувтвуют, их наличие проверяется первым вверху (все это Element)
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  #gridPan
  #categoryLogic
  #blockLogic
  #blockRenderer
  #grabManager
  #categoryRenderer
  #stackSnapGhostPreview
  #blockSpawner
  #blockWorkspaceDrag

  constructor(dom) {
    this.#workspaceEl = dom.workspaceEl
    this.#blockTemplatesEl = dom.blockTemplatesEl
    this.#blockContainerEl = dom.blockContainerEl
    this.#blockWorldRootEl = dom.blockWorldRootEl
    this.#dragOverlayEl = dom.dragOverlayEl
    this.#gridEl = dom.gridEl
    this.#categoryListEl = dom.categoryListEl
    this.#trashCanEl = dom.trashCanEl
    this.#sidebarEl = dom.sidebarEl
    this.#toggleCameraInertiaEl = dom.toggleCameraInertiaEl
    this.#toggleBlockGridSnapEl = dom.toggleBlockGridSnapEl
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    this.#gridPan = Grid.attach_GridPan(this.#workspaceEl, this.#gridEl, 
      this.#blockWorldRootEl)//workspace/grid.js

    WorkspaceModeToggles.attach_ModeToggles(
      this.#workspaceEl, 
      {inertiaBtn: this.#toggleCameraInertiaEl, snapBtn: this.#toggleBlockGridSnapEl})

    this.#categoryLogic = new CategoryFactory.CategoryLogic()
    this.#blockLogic = new BlockModule.BlockLogic(this.#categoryLogic.categoriesMap)
    this.#blockRenderer = new BlockModule.BlockRenderer(this.#blockTemplatesEl)

    this.#grabManager = new GrabManagerModule.GrabManager({
      workspace: this.#workspaceEl,
      blockTemplates: this.#blockTemplatesEl,
    })

    this.#categoryRenderer = new CategoryFactory.CategoryRenderer(
      this.#categoryListEl,
      categoryId => {
        if (this.#categoryLogic.setActive(categoryId)){
          this.#categoryRenderer.updateActive(categoryId)
          this.#blockRenderer.renderLibrary(
            this.#prepareBlocksForCategory(categoryId)
          )
        }
      }
    )

    this.#stackSnapGhostPreview = new Interactions.StackSnapPreview({
      dragOverlayEl: this.#dragOverlayEl,
      blockContainerEl: this.#blockContainerEl,
      getWorkspaceGridOffset: () => this.#gridPan.getOffset(),
      refreshZones: () => {
        this.#blockSpawner.rebuildZones(
          this.#stackSnapGhostPreview.getTopInnerStretchCBlockUuid()
        )
      },
    })

    this.#blockSpawner = new BlockModule.BlockSpawner(
      this.#blockLogic,
      this.#grabManager,
      {
        blockTemplates: this.#blockTemplatesEl,
        workspace: this.#workspaceEl,
        dragOverlay: this.#dragOverlayEl,
        blockContainer: this.#blockContainerEl,
        blockMountParent: this.#blockWorldRootEl,
        getWorkspaceGridOffset: () => this.#gridPan.getOffset(),
        onPaletteDragMove: (block, grabManager) => {
          this.#stackSnapGhostPreview.sync(
            block.element,
            this.#blockSpawner.blockRegistry,
            grabManager
          )
        },
        onPaletteDragEnd: () => {
          this.#stackSnapGhostPreview.clear()
        },
        tryPaletteStackConnect: (block, grabManager) => {
          return this.#commitStackConnectAndRefresh(block.element, grabManager)
        },
      }
    )

    this.#blockWorkspaceDrag = new Interactions.BlockWorkspaceDrag(
      this.#blockContainerEl,
      this.#workspaceEl,
      this.#dragOverlayEl,
      this.#grabManager,
      {
        blockMountParentEl: this.#blockWorldRootEl,
        getWorkspaceGridOffset: () => this.#gridPan.getOffset(),
        blockRegistry: this.#blockSpawner.blockRegistry,
        onBlockDragMove: (draggedElement, grabManager) => {
          this.#stackSnapGhostPreview.sync(
            draggedElement,
            this.#blockSpawner.blockRegistry,
            grabManager
          )
        },
        onBlockDragEnd: () => {
          this.#stackSnapGhostPreview.clear()
          this.#blockSpawner.rebuildZones()
        },
        commit_StackSnap: (dragging, grabManager) => {
          return this.#commitStackConnectAndRefresh(
            dragging.headElement,
            grabManager
          )
        },
      }
    )

    this.#workspaceEl.addEventListener(
      Global.WORKSPACE_EVENTS.structureChanged,
      () => this.#onWorkspaceStructureChanged()
    )

    new BlockDeletionManagerModule.BlockDeletionManager({
      blockRegistry: this.#blockSpawner.blockRegistry,
      workspaceEl: this.#workspaceEl,
      trashCanEl: this.#trashCanEl,
      sidebarEl: this.#sidebarEl,
      blockWorkspaceDrag: this.#blockWorkspaceDrag,
      grabManager: this.#grabManager,
    })

    WorkspacePersistence.attach_Persistence(
      this.#workspaceEl,
      () => this.#blockSpawner.blockRegistry,
      () => this.#gridPan.getOffset()
    )

    this.#installZoneDebugToggle()
    this.#bootstrapUi()
    void WorkspacePersistence.hydrateWorkspaceFromServer(
      this.#blockSpawner,
      this.#gridPan,
      {
        inertiaBtn: this.#toggleCameraInertiaEl,
        snapBtn: this.#toggleBlockGridSnapEl,
      }
    )
  }





  #prepareBlocksForCategory(categoryId){
    return this.#blockLogic
      .getBlocksByCategory(categoryId)
      .map(block => this.#blockLogic.prepareBlockData(block.blockKey))
  }

  #onWorkspaceStructureChanged(){
    this.#blockSpawner.rebuildZones(
      this.#stackSnapGhostPreview.getTopInnerStretchCBlockUuid()
    )
  }

  #commitStackConnectAndRefresh(draggedElement, grabManager){
    return Interactions.commit_StackSnap({
      ghostPreview: this.#stackSnapGhostPreview,
      draggedElement,
      blockRegistry: this.#blockSpawner.blockRegistry,
      grabManager,
    })
  }

  #installZoneDebugToggle(){
    const blockRegistry = this.#blockSpawner.blockRegistry
    const blockContainerEl = this.#blockContainerEl
    const dragOverlayEl = this.#dragOverlayEl

    const debugToggleState = { active: false }
    let teardownZoneOverlay = null

    function applyDebugActive(shouldBeActive){
      const nextActive = Boolean(shouldBeActive)
      if (nextActive === debugToggleState.active) return
      debugToggleState.active = nextActive

      if (teardownZoneOverlay){
        teardownZoneOverlay()
        teardownZoneOverlay = null
      }

      if (!nextActive) return

      teardownZoneOverlay = Interactions.apply_ZoneDebug(
        blockRegistry,
        blockContainerEl,
        dragOverlayEl
      )
    }

    /** @type {any} */
    const win = window

    win.apply_ZoneDebug = function(){
      applyDebugActive(true)
    }
    win.disableZoneDebug = function(){
      applyDebugActive(false)
    }

    const hadOwnDebugProperty = Object.prototype.hasOwnProperty.call(
      win,
      '__DEBUG__'
    )
    let restoreDebugAfterDefine = false
    if (hadOwnDebugProperty && win.__DEBUG__ === true){
      restoreDebugAfterDefine = true
    }
    if (hadOwnDebugProperty){
      try {
        delete win.__DEBUG__
      } catch {
        /* non-configurable */
      }
    }

    Object.defineProperty(win, '__DEBUG__', {
      get(){
        return debugToggleState.active
      },
      set(nextValue){
        applyDebugActive(nextValue)
      },
      enumerable: true,
      configurable: true,
    })

    if (restoreDebugAfterDefine){
      applyDebugActive(true)
    }
  }

  #bootstrapUi(){
    const categoriesArray = this.#categoryLogic.categoriesArray
    const firstCategory = categoriesArray[0]
    if (!firstCategory) return

    const defaultCategoryKey = firstCategory.key
    this.#categoryRenderer.renderList(categoriesArray, defaultCategoryKey)
    this.#categoryLogic.setActive(defaultCategoryKey)
    this.#blockRenderer.renderLibrary(
      this.#prepareBlocksForCategory(defaultCategoryKey)
    )
  }
}

new ScratchEditor(dom)