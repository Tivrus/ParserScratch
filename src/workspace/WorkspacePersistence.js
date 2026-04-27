import * as Global from '../constants/Global.js';
import * as WorkspaceModeToggles from './workspaceModeToggles.js';

// --- Serialize / deserialize document ---

function serializeWorkspace(blockRegistry, camera) {
  const blocks = {};
  for (const block of blockRegistry.values()) {
    blocks[block.blockUUID] = {
      opcode: block.blockKey,
      next: block.nextUUID ?? null,
      parent: block.parentUUID ?? null,
      inputs: {},
      fields: {},
      topLevel: block.topLevel !== false,
      x: Math.round(block.x),
      y: Math.round(block.y),
    };
  }

  let cameraRawX = 0;
  let cameraRawY = 0;
  if (camera != null && typeof camera === 'object') {
    cameraRawX = Number(camera.x);
    cameraRawY = Number(camera.y);
  }

  return {
    blocks,
    camera: {
      x: Math.round(Number.isFinite(cameraRawX) ? cameraRawX : 0),
      y: Math.round(Number.isFinite(cameraRawY) ? cameraRawY : 0),
    },
    modes: {
      cameraInertia: Boolean(Global.WORKSPACE_CAMERA_INERTIA.enabled),
      blockGridSnap: Boolean(Global.WORKSPACE_BLOCK_GRID_SNAP.enabled),
    },
  };
}

function applyWorkspaceDocument(blockSpawner, doc) {
  const raw = doc?.blocks;
  if (!raw || typeof raw !== 'object') return;

  for (const [id, rec] of Object.entries(raw)) {
    if (!rec || typeof rec !== 'object') continue;
    if (typeof rec.opcode !== 'string') continue;
    blockSpawner.restoreWorkspaceBlock(rec.opcode, id, Number(rec.x) || 0, Number(rec.y) || 0);
  }
}

// Run after every block exists (restoreWorkspaceBlock).
function applyWorkspaceChainLinks(blockRegistry, doc) {
  const raw = doc?.blocks;
  if (!raw || typeof raw !== 'object') return;

  for (const [id, rec] of Object.entries(raw)) {
    if (!rec || typeof rec !== 'object') continue;
    const block = blockRegistry.get(id);
    if (!block) continue;
    block.nextUUID = rec.next ?? null;
    block.parentUUID = rec.parent ?? null;
    block.topLevel = rec.topLevel !== false;
  }
}

// --- Network ---

async function saveWorkspaceToServer(blockRegistry, camera) {
  try {
    const res = await fetch(Global.WORKSPACE_SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeWorkspace(blockRegistry, camera)),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      Global.logError('saveWorkspaceToServer failed', {
        context: 'WorkspacePersistence',
        error: new Error(json.error || res.statusText),
      });
    }
  } catch (e) {
    Global.logError('saveWorkspaceToServer', { context: 'WorkspacePersistence', error: e });
  }
}

async function loadWorkspaceDocument() {
  try {
    const res = await fetch(Global.WORKSPACE_LOAD_URL);
    const json = await res.json();
    if (!json.success || !json.data) {
      return {
        blocks: {},
        camera: { x: 0, y: 0 },
        modes: { cameraInertia: true, blockGridSnap: true },
      };
    }
    const blocks = json.data.blocks;
    const cam = json.data.camera;

    let cameraDocumentX = 0;
    let cameraDocumentY = 0;
    if (cam != null && typeof cam === 'object') {
      cameraDocumentX = Number(cam.x);
      cameraDocumentY = Number(cam.y);
    }

    const mod = json.data.modes;

    let cameraInertia = true;
    if (mod != null && typeof mod === 'object' && typeof mod.cameraInertia === 'boolean') {
      cameraInertia = mod.cameraInertia;
    }

    let blockGridSnap = true;
    if (mod != null && typeof mod === 'object' && typeof mod.blockGridSnap === 'boolean') {
      blockGridSnap = mod.blockGridSnap;
    }

    return {
      blocks: blocks && typeof blocks === 'object' ? blocks : {},
      camera: {
        x: Number.isFinite(cameraDocumentX) ? cameraDocumentX : 0,
        y: Number.isFinite(cameraDocumentY) ? cameraDocumentY : 0,
      },
      modes: { cameraInertia, blockGridSnap },
    };
  } catch (e) {
    Global.logError('loadWorkspaceDocument', { context: 'WorkspacePersistence', error: e });
    return {
      blocks: {},
      camera: { x: 0, y: 0 },
      modes: { cameraInertia: true, blockGridSnap: true },
    };
  }
}

// --- Wire-up ---

export function attachWorkspacePersistence(workspaceEl, getRegistry, getCameraOffset) {
  if (!workspaceEl || typeof getRegistry !== 'function') return;

  const getCam =
    typeof getCameraOffset === 'function'
      ? getCameraOffset
      : () => ({ x: 0, y: 0 });

  let persistDebounceTimer = null;
  const flushPersist = () => {
    persistDebounceTimer = null;
    void saveWorkspaceToServer(getRegistry(), getCam());
  };
  const schedulePersist = () => {
    if (persistDebounceTimer !== null) {
      clearTimeout(persistDebounceTimer);
    }
    persistDebounceTimer = setTimeout(flushPersist, Global.WORKSPACE_SAVE_DEBOUNCE_MS);
  };

  workspaceEl.addEventListener('block-spawned', schedulePersist);
  workspaceEl.addEventListener('block-removed', schedulePersist);
  workspaceEl.addEventListener(Global.WORKSPACE_EVENTS.structureChanged, schedulePersist);
  workspaceEl.addEventListener(Global.WORKSPACE_EVENTS.cameraOffsetChanged, schedulePersist);
  workspaceEl.addEventListener(Global.WORKSPACE_EVENTS.modesChanged, schedulePersist);
  workspaceEl.addEventListener('block-moved', (event) => {
    const { blockUUID, x, y } = event.detail || {};
    if (!blockUUID) return;
    getRegistry().get(blockUUID)?.setPosition(x, y);
    schedulePersist();
  });
}

export async function hydrateWorkspaceFromServer(blockSpawner, gridPan) {
  const doc = await loadWorkspaceDocument();
  WorkspaceModeToggles.applyWorkspaceModesFromDoc(doc);
  WorkspaceModeToggles.syncWorkspaceModeToggleButtons();

  let cam = { x: 0, y: 0 };
  const camera = doc?.camera;
  if (camera != null && typeof camera === 'object') {
    cam = camera;
  }
  if (gridPan?.setOffset) {
    gridPan.setOffset(cam.x, cam.y);
  }
  applyWorkspaceDocument(blockSpawner, doc);
  applyWorkspaceChainLinks(blockSpawner.blockRegistry, doc);
  requestAnimationFrame(() => blockSpawner.refreshWorkspaceConnectorZones());
}
