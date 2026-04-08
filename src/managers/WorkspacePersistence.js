import { logError } from '../constans/Global.js';

const SAVE_URL = '/api/save-workspace';
const LOAD_URL = '/api/load-workspace';

/**
 * Scratch-like workspace document: top-level map of block id → record.
 * @param {Map<string, import('../constans/Block.js').Block>} blockRegistry
 */
export function serializeWorkspace(blockRegistry) {
  const blocks = {};
  for (const block of blockRegistry.values()) {
    blocks[block.blockUUID] = {
      opcode: block.blockKey,
      next: null,
      parent: null,
      inputs: {},
      fields: {},
      topLevel: true,
      x: Math.round(block.x),
      y: Math.round(block.y),
    };
  }
  return { blocks };
}

export async function saveWorkspaceToServer(blockRegistry) {
  try {
    const body = serializeWorkspace(blockRegistry);
    const res = await fetch(SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      logError('saveWorkspaceToServer failed', { context: 'WorkspacePersistence', error: new Error(json.error || res.statusText) });
    }
  } catch (e) {
    logError('saveWorkspaceToServer', { context: 'WorkspacePersistence', error: e });
  }
}

export async function loadWorkspaceDocument() {
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

/**
 * @param {import('./BlockSpawner.js').BlockSpawner} spawner
 * @param {{ blocks?: Record<string, unknown> }} doc
 */
export function applyWorkspaceDocument(spawner, doc) {
  const raw = doc?.blocks;
  if (!raw || typeof raw !== 'object') return;

  for (const [id, rec] of Object.entries(raw)) {
    if (!rec || typeof rec !== 'object') continue;
    const opcode = rec.opcode;
    if (typeof opcode !== 'string') continue;
    const x = Number(rec.x) || 0;
    const y = Number(rec.y) || 0;
    spawner.restoreWorkspaceBlock(opcode, id, x, y);
  }
}

/**
 * Sync model position after drag and persist.
 * @param {HTMLElement} workspaceEl — #workspace
 * @param {() => Map<string, import('../constans/Block.js').Block>} getRegistry
 */
export function attachWorkspacePersistence(workspaceEl, getRegistry) {
  if (!workspaceEl || typeof getRegistry !== 'function') return;

  const persist = () => saveWorkspaceToServer(getRegistry());

  workspaceEl.addEventListener('block-spawned', persist);
  workspaceEl.addEventListener('block-removed', persist);
  workspaceEl.addEventListener('block-moved', (e) => {
    const { blockUUID, x, y } = e.detail || {};
    if (!blockUUID) return;
    getRegistry().get(blockUUID)?.setPosition(x, y);
    persist();
  });
}

export async function hydrateWorkspaceFromServer(spawner) {
  const doc = await loadWorkspaceDocument();
  applyWorkspaceDocument(spawner, doc);
}
