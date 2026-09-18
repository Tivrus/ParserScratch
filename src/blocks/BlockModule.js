import * as Grid from '../editor/workspace/grid.js'
import * as MathUtils from '../utils/MathUtils.js'
import * as Global from '../constants/Global.js'
import * as ChainMiddleZone from './ChainMiddleZone.js'
import * as StackSnap from '../editor/stack-connect/StackSnap.js'
import * as CBlockInnerStack from '../editor/c-block/CBlockInnerStack.js'
import * as CBlockPathStretch from '../editor/c-block/CBlockPathStretch.js'
import * as SvgUtils from '../utils/SvgUtils.js'
import * as BlocksData from '../constants/data/BlocksData.js'

// ---------- Block ----------

export class Block {
  constructor(data, placement = {}) {
    const { blockUUID = null, x = 0, y = 0 } = placement || {}
    this.blockKey = data.blockKey
    this.type = data.type
    this.category = data.category
    this.blockUUID = blockUUID
    this.x = x
    this.y = y
    this.parentUUID = null
    this.nextUUID = null
    this.topLevel = true
    this.innerStackHeadUUID = null
    this.Zones = null

    this.element = this.#buildElement(data)
  }

  #buildElement(data) {
    const group = SvgUtils.createElement('g', {
      transform: `translate(${this.x}, ${this.y})`,
      class: 'workspace-block',
    })

    Block.fillContent(group, data)
    group.setAttribute(SvgUtils.ATTR_WORKSPACE_BLOCK_UUID, String(this.blockUUID))
    group.dataset.blockId = this.blockKey
    group.dataset.type = this.type
    group.dataset.category = this.category

    return group
  }

  static fillContent(container, data) {
    container.appendChild(
      SvgUtils.createElement('path', {
        d: data.pathData,
        fill: data.fillColor,
        stroke: data.strokeColor,
        'stroke-width': 2,
        'stroke-linejoin': 'round',
        'data-block-type': data.type,
      })
    )

    for (const label of data.labels ?? []) {
      const [rawX, rawY] = label.pos ?? [0, 0]
      const labelX = Number(rawX ?? 0)
      const labelY = Number(rawY ?? 0)

      const text = SvgUtils.createElement('text', {
        x: String(labelX),
        y: String(labelY),
        fill: '#ffffff',
        'font-size': '14',
        'font-weight': '600',
        'font-family': 'Arial, sans-serif',
        'dominant-baseline': 'middle',
        'pointer-events': 'none',
      })
      text.textContent = label.text || ''
      container.appendChild(text)
    }
  }

  setPosition(x, y) {
    this.x = x
    this.y = y
    this.element.setAttribute('transform', `translate(${x}, ${y})`)
  }

  mount(svgContainer) {
    svgContainer.appendChild(this.element)
    return this
  }

  remove() {
    this.element.remove()
  }
}

// ---------- BlockLogic ----------

export class BlockLogic {
  constructor(categoriesMap) {
    this.blocksMap = new Map(BlocksData.blocks_list.map(b => [b.blockKey, b]))
    this.blockForms = new Map(Global.BLOCK_FORMS.map(b => [b.type, b]))
    this.categoriesMap = categoriesMap
  }

  getBlocksByCategory(categoryId) {
    return BlocksData.blocks_list.filter(b => b.category === categoryId)
  }

  prepareBlockData(blockKey) {
    const config = this.blocksMap.get(blockKey)
    if (!config) return null
    const form = this.blockForms.get(config.type)
    if (!form) return null

    let { path: pathData, width, height } = form
    const vb = [0, 0, width, height]

    if (Array.isArray(config.size) && config.size.length === 2) {
      const [sign, amountRaw] = config.size
      const amount = Number(amountRaw)
      if (!isNaN(amount) && amount !== 0) {
        const horizontalResizeDelta = sign === '-' ? -amount : amount
        const resizeConfig = SvgUtils.getResizeConfig(config.type)
        pathData = SvgUtils.resizePath(pathData, {
          horizontal: horizontalResizeDelta,
          ...resizeConfig,
        })
        width += horizontalResizeDelta
        if (vb.length === 4) vb[2] += horizontalResizeDelta
      }
    }

    const viewBox = vb.join(' ')
    const categoryRow = this.categoriesMap.get(config.category)
    const fillColor = categoryRow?.color ?? Global.DEFAULT_BLOCK_COLOR

    return {
      ...config,
      pathData,
      width,
      height,
      viewBox,
      fillColor,
      strokeColor: MathUtils.ColorMath.darken(fillColor),
    }
  }
}

// ---------- BlockRenderer ----------

export class BlockRenderer {
  constructor(blockTemplatesEl) {
    this.blockTemplatesEl = blockTemplatesEl
  }

  #createLibraryTemplate(data) {
    const svg = SvgUtils.createElement('svg', {
      viewBox: data.viewBox,
      width: String(data.width),
      height: String(data.height),
      class: 'block-template',
    })

    Object.assign(svg.style, {
      userSelect: 'none',
      webkitUserSelect: 'none',
      cursor: 'grab',
    })
    svg.setAttribute('unselectable', 'on')
    svg.dataset.blockId = data.blockKey
    svg.dataset.category = data.category
    svg.dataset.type = data.type

    Block.fillContent(svg, data)
    return svg
  }

  renderLibrary(blocksPreparedData) {

    if (!this.blockTemplatesEl) return
    this.blockTemplatesEl.innerHTML = ''
    for (const data of blocksPreparedData) {
      if (data) this.blockTemplatesEl.appendChild(this.#createLibraryTemplate(data))
    }
  }
}

// ---------- BlockSpawner ----------

export class BlockSpawner {
  constructor(blockLogic, grabManager, config = {}) {
    this.blockLogic = blockLogic
    this.grabManager = grabManager

    const {
      blockTemplates,
      workspace,
      dragOverlay,
      blockContainer,
      blockMountParent,
      getWorkspaceGridOffset,
      onPaletteDragMove,
      onPaletteDragEnd,
      tryPaletteStackConnect,
    } = config

    this.containerEls = { blockTemplates, workspace, dragOverlay, blockContainer }
    this.blockRegistry = new Map()
    this.dragOffset = { x: 0, y: 0 }
    this.paletteDragBlock = null

    this.blockMountParent =
      blockMountParent instanceof Element ? blockMountParent : this.containerEls.blockContainer

    this.getWorkspaceGridOffset =
      typeof getWorkspaceGridOffset === 'function' ? getWorkspaceGridOffset : () => ({ x: 0, y: 0 })

    this.onPaletteDragMove = onPaletteDragMove ?? null
    this.onPaletteDragEnd = onPaletteDragEnd ?? null
    this.tryPaletteStackConnect = tryPaletteStackConnect ?? null

    if (
      !this.containerEls.blockTemplates ||
      !this.containerEls.workspace ||
      !this.containerEls.blockContainer ||
      !this.containerEls.dragOverlay
    ) {
      Global.logError('Required containers not found', {
        context: 'BlockSpawner',
        containerEls: this.containerEls,
      })
      return
    }

    this.#initListeners()
  }

  #initListeners() {
    this.containerEls.blockTemplates.addEventListener(
      'grab-start',
      /** @param {CustomEvent} e */ e => {
        if (this.grabManager.isBlockGrabbed()) return
        if (this.grabManager.isTemplateGrabbed() && e.detail.grabKey) {
          this.#onTemplateGrab(e.detail)
        }
      }
    )

    document.addEventListener('grab-end', /** @param {CustomEvent} e */ e => {
      if (this.paletteDragBlock) this.#onPaletteDragEnd(e.detail)
    })

    document.addEventListener('mousemove', e => {
      if (this.paletteDragBlock) this.#positionDraggedBlock(e.clientX, e.clientY)
    })

    window.addEventListener('blur', () => this.#cleanupPaletteDrag())
  }

  #onTemplateGrab(grabDetail) {
    const template = this.containerEls.blockTemplates.querySelector(
      `svg.block-template[data-block-id="${grabDetail.grabKey}"]`
    )
    if (!template) {
      Global.logError(`Template SVG not found for blockId: ${grabDetail.grabKey}`, {
        context: 'BlockSpawner',
      })
      return
    }

    const data = this.blockLogic.prepareBlockData(grabDetail.grabKey)
    if (!data) return

    const block = new Block(data, {
      blockUUID: MathUtils.BlockIdentity.generateUUID(),
      x: 0,
      y: 0,
    })
    this.#mountRegisteredBlock(block)

    this.containerEls.dragOverlay.appendChild(block.element)
    this.paletteDragBlock = block

    const templateRect = SvgUtils.get_Rect(template)
    this.dragOffset.x = grabDetail.clientX - templateRect.left
    this.dragOffset.y = grabDetail.clientY - templateRect.top

    this.#positionDraggedBlock(grabDetail.clientX, grabDetail.clientY)
    template.classList.add('block-template--dragging')
  }

  #onPaletteDragEnd(grabDetail) {
    const block = this.paletteDragBlock
    if (!block) {
      this.#cleanupPaletteDrag()
      return
    }

    if (grabDetail.endArea === 'workspace') {
      const stackPlace = this.tryPaletteStackConnect?.(block, this.grabManager)

      let finalX, finalY
      if (stackPlace) {
        finalX = Math.round(stackPlace.x)
        finalY = Math.round(stackPlace.y)
      } else {
        const wr = SvgUtils.get_Rect(this.containerEls.workspace)
        const { x: vx, y: vy } = this.getWorkspaceGridOffset()
        const rawX = Math.round(grabDetail.clientX - wr.left - this.dragOffset.x - vx)
        const rawY = Math.round(grabDetail.clientY - wr.top - this.dragOffset.y - vy)
        const snapped = Grid.calc_GridSnap(rawX, rawY)
        finalX = snapped.x
        finalY = snapped.y
      }

      this.blockMountParent.appendChild(block.element)
      block.setPosition(finalX, finalY)

      if (stackPlace) {
        StackSnap.layout_StackFromHead(block, this.blockRegistry)
        this.#rebuildZones()
        CBlockInnerStack.layout_AllCblockStacks(this.blockRegistry)
      }

      this.#rebuildZones()
      requestAnimationFrame(() => {
        if (this.blockRegistry.get(block.blockUUID) !== block) return
        this.#rebuildZones()
      })

      this.containerEls.workspace.dispatchEvent(
        new CustomEvent('block-spawned', {
          detail: { block, blockId: block.blockKey, x: finalX, y: finalY },
          bubbles: true,
        })
      )
    } else {
      this.#discardPaletteBlock()
    }

    this.onPaletteDragEnd?.()
    this.paletteDragBlock = null
    this.#clearTemplateDraggingClass()
  }

  #discardPaletteBlock() {
    const block = this.paletteDragBlock
    if (!block) return
    this.blockRegistry.delete(block.blockUUID)
    block.Zones = null
    block.element.remove()
  }

  #positionDraggedBlock(clientX, clientY) {
    const el = this.paletteDragBlock?.element
    if (!el) return

    const overlayRect = SvgUtils.get_Rect(this.containerEls.dragOverlay)
    const x = clientX - overlayRect.left - this.dragOffset.x
    const y = clientY - overlayRect.top - this.dragOffset.y
    el.setAttribute('transform', `translate(${x}, ${y})`)

    this.onPaletteDragMove?.(this.paletteDragBlock, this.grabManager)
  }

  restoreWorkspaceBlock(blockKey, blockUUID, x, y) {
    const data = this.blockLogic.prepareBlockData(blockKey)
    if (!data) return null
    const block = new Block(data, { blockUUID, x, y })
    this.#mountRegisteredBlock(block)
    return block
  }

  #mountRegisteredBlock(block) {
    block.mount(this.blockMountParent)
    this.blockRegistry.set(block.blockUUID, block)
    this.#rebuildZones()
  }

  #rebuildZones(skipCBlockWorkspaceStretchUuid = null) {
    for (const block of this.blockRegistry.values()) {
      if (block.type === 'c-block' && block.blockUUID !== skipCBlockWorkspaceStretchUuid) {
        CBlockPathStretch.apply_CblockInnerStack_PathStretch(
          this.blockRegistry,
          block,
          this.blockLogic.prepareBlockData.bind(this.blockLogic)
        )
      }
    }
    ChainMiddleZone.apply_ChainMiddles(this.blockRegistry, b =>
      this.blockLogic.prepareBlockData(b.blockKey)
    )
  }

  rebuildZones(skipCBlockWorkspaceStretchUuid = null) {
    this.#rebuildZones(skipCBlockWorkspaceStretchUuid)
  }

  #clearTemplateDraggingClass() {
    this.containerEls.blockTemplates
      .querySelectorAll('.block-template--dragging')
      .forEach(el => el.classList.remove('block-template--dragging'))
  }

  #cleanupPaletteDrag() {
    if (this.paletteDragBlock) {
      this.#discardPaletteBlock()
      this.paletteDragBlock = null
    }
    this.onPaletteDragEnd?.()
    this.#clearTemplateDraggingClass()
  }
}