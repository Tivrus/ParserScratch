import * as Global from '../../constants/Global.js'
import * as ScratchCallTrace from '../../utils/scratchCallTrace.js'
import * as SvgUtils from '../../utils/SvgUtils.js'
import * as StackChainDrag from '../../blocks/StackChainDrag.js'
import * as ZoneMath from '../../calculations/ZoneMath.js'

function calc_UnionRect(elements){
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const element of elements){
    if (!element) continue
    const bounds = SvgUtils.get_Rect(element)
    left = Math.min(left, bounds.left)
    top = Math.min(top, bounds.top)
    right = Math.max(right, bounds.right)
    bottom = Math.max(bottom, bounds.bottom)
  }
  if (!Number.isFinite(left)) return null
  return { left, top, right, bottom }
}

function apply_ShrinkToCenter(element, durationMs = Global.SHRINK_MS){
  return new Promise(resolve => {
    const bbox = SvgUtils.get_BBox(element)
    if (!bbox) {
      resolve()
      return
    }
    const centerX = bbox.x + bbox.width / 2
    const centerY = bbox.y + bbox.height / 2
    const { x, y } = SvgUtils.read_Transform(element)
    const startTime = performance.now()

    function frame(now){
      const t = Math.min(1, (now - startTime) / durationMs)
      const ease = 1 - (1 - t) ** 3
      const scale = 1 - ease
      element.setAttribute(
        'transform',
        `translate(${x},${y}) translate(${centerX},${centerY}) scale(${scale}) translate(${-centerX},${-centerY})`
      )
      if (t < 1){
        requestAnimationFrame(frame)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(frame)
  })
}

function clear_ChainEndLinks(chainBlocks, blockRegistry){
  if (!chainBlocks.length){
    return
  }
  const headBlock = chainBlocks[0]
  const tailBlock = chainBlocks[chainBlocks.length - 1]

  if (headBlock.parentUUID){
    const parentBlock = blockRegistry.get(headBlock.parentUUID)
    if (parentBlock && parentBlock.nextUUID === headBlock.blockUUID){
      parentBlock.nextUUID = null
    }
    if (
      parentBlock &&
      parentBlock.type === 'c-block' &&
      parentBlock.innerStackHeadUUID === headBlock.blockUUID
    ){
      parentBlock.innerStackHeadUUID = null
    }
  }

  if (tailBlock.nextUUID){
    const nextBlock = blockRegistry.get(tailBlock.nextUUID)
    if (nextBlock && nextBlock.parentUUID === tailBlock.blockUUID){
      nextBlock.parentUUID = null
    }
  }
}

export class BlockDeletionManager {
  constructor({
    blockRegistry,
    workspaceEl,
    trashCanEl,
    sidebarEl,
    blockWorkspaceDrag,
    grabManager,
  }){
  
    this.blockRegistry = blockRegistry
    this.workspaceEl = workspaceEl
    this.trashCanEl = trashCanEl
    this.sidebarEl = sidebarEl
    this.blockWorkspaceDrag = blockWorkspaceDrag
    this.grabManager = grabManager

    if (!this.blockRegistry || !this.blockWorkspaceDrag){
      Global.logError(
        'BlockDeletionManager: blockRegistry, workspaceEl, blockWorkspaceDrag are required',
        {
          context: 'BlockDeletionManager',
        }
      )
      return
    }
    document.addEventListener(
      'grab-end',
      event => this.#onGrabEnd(event),
      true
    )
  }

  #onGrabEnd(event){
    const grabDetail = event.detail
    if (
      !this.grabManager ||
      typeof this.grabManager.isWorkspaceBlockGrabDetail !== 'function' ||
      !this.grabManager.isWorkspaceBlockGrabDetail(grabDetail)
    ){
      return
    }

    const stackHeadBlock = this.blockRegistry.get(grabDetail.grabKey)
    if (!stackHeadBlock || !stackHeadBlock.element){
      return
    }

    const outerChain = StackChainDrag.collect_Chain(
      this.blockRegistry,
      stackHeadBlock
    )
    const chainBlocks = StackChainDrag.collect_ChainTree(
      this.blockRegistry,
      stackHeadBlock
    )
    if (chainBlocks.length === 0){
      return
    }

    const chainElements = chainBlocks.map(block => block.element)
    const unionRect = calc_UnionRect(chainElements)
    if (!unionRect){
      return
    }

    const paletteRect = SvgUtils.get_Rect(this.sidebarEl);
    const trashRect = SvgUtils.get_Rect(this.trashCanEl)
    
    const overPalette = ZoneMath.is_RectsOverlap(unionRect, paletteRect)
    const overTrash = ZoneMath.is_RectsOverlap(unionRect, trashRect)

    if (!overPalette && !overTrash){
      return
    }

    this.blockWorkspaceDrag.armSkipGrabEndOnce()
    void this.#removeChain(outerChain, chainBlocks)
  }

  async #removeChain(outerChain, chainBlocks){
    ScratchCallTrace.record_Trace('deleteWorkspaceChain', {
      headKeys: outerChain.map(b => b.blockKey),
      removedCount: chainBlocks.length,
    })
    clear_ChainEndLinks(outerChain, this.blockRegistry)

    const deleteIds = new Set(chainBlocks.map(b => b.blockUUID))
    for (const block of chainBlocks){
      if (block.type === 'c-block'){
        block.innerStackHeadUUID = null
      }
    }
    for (const block of chainBlocks){
      if (block.parentUUID && deleteIds.has(block.parentUUID)){
        block.parentUUID = null
      }
    }

    await Promise.all(
      chainBlocks.map(async block => {
        const element = block.element
        try {
          block.Zones = null
          await apply_ShrinkToCenter(element, Global.SHRINK_MS)
        } finally {
          this.blockRegistry.delete(block.blockUUID)
          element.remove()
          this.workspaceEl.dispatchEvent(
            new CustomEvent('block-removed', {
              detail: { blockUUID: block.blockUUID, blockKey: block.blockKey },
              bubbles: true,
            })
          )
        }
      })
    )
  }
}
