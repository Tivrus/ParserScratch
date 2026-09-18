import * as Global from '../../constants/Global.js'
import * as WorkspaceModeToggles from './workspaceModeToggles.js'
import * as CBlockInnerStack from '../c-block/CBlockInnerStack.js'
import * as MathUtils from '../../utils/MathUtils.js'

function serialize_Doc(blockRegistry, camera){
  const blocks = {}
  
  for (const block of blockRegistry.values()){
    const inputs = {}
    if (block.type === 'c-block' && block.innerStackHeadUUID){
      inputs.SUBSTACK = block.innerStackHeadUUID
    }
    
    blocks[block.blockUUID] = {
      opcode: block.blockKey,
      next: block.nextUUID ?? null,
      parent: block.parentUUID ?? null,
      inputs,
      fields: {},
      topLevel: block.topLevel !== false,
      x: Math.round(block.x),
      y: Math.round(block.y),
    }
  }

  return {
    blocks,
    camera: {
      x: Math.round(MathUtils.finiteOrZero(Number(camera.x))),
      y: Math.round(MathUtils.finiteOrZero(Number(camera.y))),
    },
    modes: {
      cameraInertia: Boolean(Global.WORKSPACE_CAMERA_INERTIA.enabled),
      blockGridSnap: Boolean(Global.WORKSPACE_BLOCK_GRID_SNAP.enabled),
    },
  }
}

function apply_Doc(blockSpawner, doc){
  for (const [id, rec] of Object.entries(doc.blocks)){
    if (!rec || typeof rec.opcode !== 'string') continue
    
    blockSpawner.restoreWorkspaceBlock(
      rec.opcode,
      id,
      Number(rec.x) || 0,
      Number(rec.y) || 0
    )
  }
}

function apply_ChainLinks(blockRegistry, doc){
  for (const [id, rec] of Object.entries(doc.blocks)){
    if (!rec) continue
    
    const block = blockRegistry.get(id)
    if (!block) continue
    
    block.nextUUID = rec.next ?? null
    block.parentUUID = rec.parent ?? null
    block.topLevel = rec.topLevel !== false
    
    if (block.type === 'c-block'){
      const substack = rec.inputs?.SUBSTACK
      block.innerStackHeadUUID = (typeof substack === 'string' && substack.length > 0) 
        ? substack 
        : null
    }
  }
}

async function saveWorkspaceToServer(blockRegistry, camera){
  try {
    const res = await fetch(Global.WORKSPACE_SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serialize_Doc(blockRegistry, camera)),
    })
    
    const json = await res.json().catch(() => ({}))
    
    if (!res.ok || json.success === false){
      Global.logError('saveWorkspaceToServer failed', {
        context: 'WorkspacePersistence',
        error: new Error(json.error || res.statusText),
      })
    }
  } catch (e){
    Global.logError('saveWorkspaceToServer', {
      context: 'WorkspacePersistence',
      error: e,
    })
  }
}

async function loadWorkspaceDocument(){
  const fallbackDoc = {
    blocks: {},
    camera: { x: 0, y: 0 },
    modes: { cameraInertia: true, blockGridSnap: true },
  }

  try {
    const res = await fetch(Global.WORKSPACE_LOAD_URL)
    const json = await res.json()
    
    if (!json.success || !json.data) return fallbackDoc

    const { blocks, camera: cam, modes: mod } = json.data

    const cameraDocumentX = cam && typeof cam === 'object' ? Number(cam.x) : 0
    const cameraDocumentY = cam && typeof cam === 'object' ? Number(cam.y) : 0

    const cameraInertia = mod && typeof mod.cameraInertia === 'boolean' ? mod.cameraInertia : true
    const blockGridSnap = mod && typeof mod.blockGridSnap === 'boolean' ? mod.blockGridSnap : true

    const blocksPayload = blocks && typeof blocks === 'object' ? blocks : {}

    return {
      blocks: blocksPayload,
      camera: {
        x: MathUtils.finiteOrZero(cameraDocumentX),
        y: MathUtils.finiteOrZero(cameraDocumentY),
      },
      modes: { cameraInertia, blockGridSnap },
    }
  } catch (e){
    Global.logError('loadWorkspaceDocument', {
      context: 'WorkspacePersistence',
      error: e,
    })
    return fallbackDoc
  }
}

export function attach_Persistence(workspaceEl, getRegistry, getCameraOffset){
  const getCam = typeof getCameraOffset === 'function' 
    ? getCameraOffset 
    : () => ({ x: 0, y: 0 })

  let persistDebounceTimer = null
  
  function flushPersist(){
    persistDebounceTimer = null
    void saveWorkspaceToServer(getRegistry(), getCam())
  }
  
  function schedulePersist(){
    if (persistDebounceTimer !== null){
      clearTimeout(persistDebounceTimer)
    }
    persistDebounceTimer = setTimeout(flushPersist, Global.WORKSPACE_SAVE_DEBOUNCE_MS)
  }

  workspaceEl.addEventListener('block-spawned', schedulePersist)
  workspaceEl.addEventListener('block-removed', schedulePersist)
  workspaceEl.addEventListener(Global.WORKSPACE_EVENTS.structureChanged, schedulePersist)
  workspaceEl.addEventListener(Global.WORKSPACE_EVENTS.cameraOffsetChanged, schedulePersist)
  workspaceEl.addEventListener(Global.WORKSPACE_EVENTS.modesChanged, schedulePersist)
  
  workspaceEl.addEventListener('block-moved', function(event){
    const { blockUUID, x, y } = event.detail || {}
    if (!blockUUID) return
    
    const movedBlock = getRegistry().get(blockUUID)
    if (movedBlock) {
      movedBlock.setPosition(x, y)
    }
    schedulePersist()
  })
}

export async function hydrateWorkspaceFromServer(blockSpawner, gridPan, modeToggleButtons){
  const doc = await loadWorkspaceDocument()
  
  WorkspaceModeToggles.apply_ModesFromDoc(doc)
  WorkspaceModeToggles.sync_ModeButtons(modeToggleButtons)
  
  gridPan.setOffset(doc.camera.x, doc.camera.y)
  
  apply_Doc(blockSpawner, doc)
  apply_ChainLinks(blockSpawner.blockRegistry, doc)
  CBlockInnerStack.layout_AllCblockStacks(blockSpawner.blockRegistry)
  blockSpawner.rebuildZones()
}
