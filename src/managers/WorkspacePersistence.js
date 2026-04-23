import { logError, WORKSPACE_EVENTS } from '../constans/Global.js';

const SAVE_URL = '/api/save-workspace';
const LOAD_URL = '/api/load-workspace';

// --- Serialize / deserialize document ---

function serializeWorkspace(blockRegistry) {
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
  return { blocks };
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

async function saveWorkspaceToServer(blockRegistry) {
  try {
    const res = await fetch(SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeWorkspace(blockRegistry)),
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
    if (!json.success || !json.data) return { blocks: {} };
    const blocks = json.data.blocks;
    return { blocks: blocks && typeof blocks === 'object' ? blocks : {} };
  } catch (e) {
    logError('loadWorkspaceDocument', { context: 'WorkspacePersistence', error: e });
    return { blocks: {} };
  }
}

// --- Wire-up ---

export function attachWorkspacePersistence(workspaceEl, getRegistry) {
  if (!workspaceEl || typeof getRegistry !== 'function') return;

  const persist = () => saveWorkspaceToServer(getRegistry());

  workspaceEl.addEventListener('block-spawned', persist);
  workspaceEl.addEventListener('block-removed', persist);
  workspaceEl.addEventListener(WORKSPACE_EVENTS.structureChanged, persist);
  workspaceEl.addEventListener('block-moved', (event) => {
    const { blockUUID, x, y } = event.detail || {};
    if (!blockUUID) return;
    getRegistry().get(blockUUID)?.setPosition(x, y);
    persist();
  });
}

export async function hydrateWorkspaceFromServer(blockSpawner) {
  const doc = await loadWorkspaceDocument();
  applyWorkspaceDocument(blockSpawner, doc);
  applyWorkspaceChainLinks(blockSpawner.blockRegistry, doc);
  requestAnimationFrame(() => blockSpawner.refreshWorkspaceConnectorZones());
}
