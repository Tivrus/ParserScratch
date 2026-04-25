import {
  logError,
  WORKSPACE_BLOCK_GRID_SNAP,
  WORKSPACE_CAMERA_INERTIA,
  WORKSPACE_EVENTS,
} from '../constans/Global.js';
import { applyWorkspaceModesFromDoc, syncWorkspaceModeToggleButtons } from '../background/workspaceModeToggles.js';

const SAVE_URL = '/api/save-workspace';
const LOAD_URL = '/api/load-workspace';

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
  const cx = camera && typeof camera === 'object' ? Number(camera.x) : 0;
  const cy = camera && typeof camera === 'object' ? Number(camera.y) : 0;
  return {
    blocks,
    camera: {
      x: Math.round(Number.isFinite(cx) ? cx : 0),
      y: Math.round(Number.isFinite(cy) ? cy : 0),
    },
    modes: {
      cameraInertia: Boolean(WORKSPACE_CAMERA_INERTIA.enabled),
      blockGridSnap: Boolean(WORKSPACE_BLOCK_GRID_SNAP.enabled),
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
    const res = await fetch(SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeWorkspace(blockRegistry, camera)),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      logError('saveWorkspaceToServer failed', {
        context: 'WorkspacePersistence',
        error: new Error(json.error || res.statusText),
      });
    }
  } catch (e) {
    logError('saveWorkspaceToServer', { context: 'WorkspacePersistence', error: e });
  }
}

async function loadWorkspaceDocument() {
  try {
    const res = await fetch(LOAD_URL);
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
    const cx = cam && typeof cam === 'object' ? Number(cam.x) : 0;
    const cy = cam && typeof cam === 'object' ? Number(cam.y) : 0;
    const mod = json.data.modes;
    const cameraInertia =
      mod && typeof mod === 'object' && typeof mod.cameraInertia === 'boolean'
        ? mod.cameraInertia
        : true;
    const blockGridSnap =
      mod && typeof mod === 'object' && typeof mod.blockGridSnap === 'boolean'
        ? mod.blockGridSnap
        : true;
    return {
      blocks: blocks && typeof blocks === 'object' ? blocks : {},
      camera: {
        x: Number.isFinite(cx) ? cx : 0,
        y: Number.isFinite(cy) ? cy : 0,
      },
      modes: { cameraInertia, blockGridSnap },
    };
  } catch (e) {
    logError('loadWorkspaceDocument', { context: 'WorkspacePersistence', error: e });
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
    typeof getCameraOffset === 'function' ? getCameraOffset : () => ({ x: 0, y: 0 });

  const persist = () => saveWorkspaceToServer(getRegistry(), getCam());

  workspaceEl.addEventListener('block-spawned', persist);
  workspaceEl.addEventListener('block-removed', persist);
  workspaceEl.addEventListener(WORKSPACE_EVENTS.structureChanged, persist);
  workspaceEl.addEventListener(WORKSPACE_EVENTS.cameraOffsetChanged, persist);
  workspaceEl.addEventListener(WORKSPACE_EVENTS.modesChanged, persist);
  workspaceEl.addEventListener('block-moved', (event) => {
    const { blockUUID, x, y } = event.detail || {};
    if (!blockUUID) return;
    getRegistry().get(blockUUID)?.setPosition(x, y);
    persist();
  });
}

export async function hydrateWorkspaceFromServer(blockSpawner, gridPan) {
  const doc = await loadWorkspaceDocument();
  applyWorkspaceModesFromDoc(doc);
  syncWorkspaceModeToggleButtons();

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
