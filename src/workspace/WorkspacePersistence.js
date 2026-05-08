import * as Global from '../constants/Global.js';
import * as WorkspaceModeToggles from './workspaceModeToggles.js';
import * as BlockStackConnect from '../stack-connect/commit/BlockStackConnect.js';
import { finiteOrZero } from '../infrastructure/math/MathUtils.js';

function serializeWorkspace(blockRegistry, camera) {
  const blocks = {};
  for (const block of blockRegistry.values()) {
    const inputs = {};
    if (block.type === 'c-block' && block.innerStackHeadUUID) {
      inputs.SUBSTACK = block.innerStackHeadUUID;
    }
    let serializedNextLink = null;
    if (block.nextUUID != null) {
      serializedNextLink = block.nextUUID;
    }
    let serializedParentLink = null;
    if (block.parentUUID != null) {
      serializedParentLink = block.parentUUID;
    }
    blocks[block.blockUUID] = {
      opcode: block.blockKey,
      next: serializedNextLink,
      parent: serializedParentLink,
      inputs,
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
      x: Math.round(finiteOrZero(cameraRawX)),
      y: Math.round(finiteOrZero(cameraRawY)),
    },
    modes: {
      cameraInertia: Boolean(Global.WORKSPACE_CAMERA_INERTIA.enabled),
      blockGridSnap: Boolean(Global.WORKSPACE_BLOCK_GRID_SNAP.enabled),
    },
  };
}

function applyWorkspaceDocument(blockSpawner, doc) {
  let blocksPayloadFromDoc;
  if (doc && doc.blocks) {
    blocksPayloadFromDoc = doc.blocks;
  } else {
    blocksPayloadFromDoc = null;
  }
  if (!blocksPayloadFromDoc || typeof blocksPayloadFromDoc !== 'object') return;

  for (const [id, rec] of Object.entries(blocksPayloadFromDoc)) {
    if (!rec || typeof rec !== 'object') continue;
    if (typeof rec.opcode !== 'string') continue;
    blockSpawner.restoreWorkspaceBlock(
      rec.opcode,
      id,
      Number(rec.x) || 0,
      Number(rec.y) || 0
    );
  }
}

function applyWorkspaceChainLinks(blockRegistry, doc) {
  let blocksPayloadFromDoc;
  if (doc && doc.blocks) {
    blocksPayloadFromDoc = doc.blocks;
  } else {
    blocksPayloadFromDoc = null;
  }
  if (!blocksPayloadFromDoc || typeof blocksPayloadFromDoc !== 'object') return;

  for (const [id, rec] of Object.entries(blocksPayloadFromDoc)) {
    if (!rec || typeof rec !== 'object') continue;
    const block = blockRegistry.get(id);
    if (!block) continue;
    let restoredNextLink = null;
    if (rec.next != null) {
      restoredNextLink = rec.next;
    }
    let restoredParentLink = null;
    if (rec.parent != null) {
      restoredParentLink = rec.parent;
    }
    block.nextUUID = restoredNextLink;
    block.parentUUID = restoredParentLink;
    block.topLevel = rec.topLevel !== false;
    if (block.type === 'c-block') {
      let substackField = null;
      if (rec.inputs && rec.inputs.SUBSTACK !== undefined) {
        substackField = rec.inputs.SUBSTACK;
      }
      let innerStackHeadLink = null;
      if (typeof substackField === 'string' && substackField.length > 0) {
        innerStackHeadLink = substackField;
      }
      block.innerStackHeadUUID = innerStackHeadLink;
    }
  }
}

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
    Global.logError('saveWorkspaceToServer', {
      context: 'WorkspacePersistence',
      error: e,
    });
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
    if (
      mod != null &&
      typeof mod === 'object' &&
      typeof mod.cameraInertia === 'boolean'
    ) {
      cameraInertia = mod.cameraInertia;
    }

    let blockGridSnap = true;
    if (
      mod != null &&
      typeof mod === 'object' &&
      typeof mod.blockGridSnap === 'boolean'
    ) {
      blockGridSnap = mod.blockGridSnap;
    }

    let blocksPayload = {};
    if (blocks && typeof blocks === 'object') {
      blocksPayload = blocks;
    }
    return {
      blocks: blocksPayload,
      camera: {
        x: finiteOrZero(cameraDocumentX),
        y: finiteOrZero(cameraDocumentY),
      },
      modes: { cameraInertia, blockGridSnap },
    };
  } catch (e) {
    Global.logError('loadWorkspaceDocument', {
      context: 'WorkspacePersistence',
      error: e,
    });
    return {
      blocks: {},
      camera: { x: 0, y: 0 },
      modes: { cameraInertia: true, blockGridSnap: true },
    };
  }
}

export function attachWorkspacePersistence(
  workspaceEl,
  getRegistry,
  getCameraOffset
) {
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
    persistDebounceTimer = setTimeout(
      flushPersist,
      Global.WORKSPACE_SAVE_DEBOUNCE_MS
    );
  };

  workspaceEl.addEventListener('block-spawned', schedulePersist);
  workspaceEl.addEventListener('block-removed', schedulePersist);
  workspaceEl.addEventListener(
    Global.WORKSPACE_EVENTS.structureChanged,
    schedulePersist
  );
  workspaceEl.addEventListener(
    Global.WORKSPACE_EVENTS.cameraOffsetChanged,
    schedulePersist
  );
  workspaceEl.addEventListener(
    Global.WORKSPACE_EVENTS.modesChanged,
    schedulePersist
  );
  workspaceEl.addEventListener('block-moved', event => {
    const { blockUUID, x, y } = event.detail || {};
    if (!blockUUID) return;
    const movedBlock = getRegistry().get(blockUUID);
    if (movedBlock && typeof movedBlock.setPosition === 'function') {
      movedBlock.setPosition(x, y);
    }
    schedulePersist();
  });
}

export async function hydrateWorkspaceFromServer(blockSpawner, gridPan) {
  const doc = await loadWorkspaceDocument();
  WorkspaceModeToggles.applyWorkspaceModesFromDoc(doc);
  WorkspaceModeToggles.syncWorkspaceModeToggleButtons();

  let cam = { x: 0, y: 0 };
  let cameraSection = null;
  if (doc && doc.camera != null && typeof doc.camera === 'object') {
    cameraSection = doc.camera;
  }
  if (cameraSection != null) {
    cam = cameraSection;
  }
  if (gridPan && typeof gridPan.setOffset === 'function') {
    gridPan.setOffset(cam.x, cam.y);
  }
  applyWorkspaceDocument(blockSpawner, doc);
  applyWorkspaceChainLinks(blockSpawner.blockRegistry, doc);
  blockSpawner.refreshWorkspaceConnectorZones();
  BlockStackConnect.layoutAllCBlockInnerStacks(blockSpawner.blockRegistry);
  blockSpawner.refreshWorkspaceConnectorZones();
  requestAnimationFrame(() => blockSpawner.refreshWorkspaceConnectorZones());
}
