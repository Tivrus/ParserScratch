import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3001;
console.log(`[Server] http://localhost:${PORT}`);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(__dirname));

const workspaceJsonPath = path.join(__dirname, 'workspace.json');

/** Заголовок: клиент E2E — не трогаем `workspace.json`, держим снимок в памяти процесса. */
const SCRATCH_E2E_WORKSPACE_HEADER = 'x-scratch-e2e';

/** Если `1` / `true` — весь процесс сервера не пишет workspace на диск (удобно для webServer в CI). */
function isScratchSkipWorkspaceDiskSaveEnv() {
  const flag = process.env.SCRATCH_SKIP_WORKSPACE_DISK_SAVE;
  return flag === '1' || flag === 'true';
}

function shouldUseVolatileWorkspaceStore(req) {
  return (
    isScratchSkipWorkspaceDiskSaveEnv() ||
    req.get(SCRATCH_E2E_WORKSPACE_HEADER) === '1'
  );
}

/** Последнее состояние для E2E / volatile-режима (`null` — ещё не было POST). */
let volatileScratchWorkspace = null;

const EMPTY_WORKSPACE_DEFAULTS = {
  blocks: {},
  camera: { x: 0, y: 0 },
  modes: { cameraInertia: true, blockGridSnap: true },
};

/** Очередь сохранений на диск: параллельные POST не пишут один файл одновременно. */
let saveWorkspaceWriteChain = Promise.resolve();

/**
 * Запись JSON во временный файл и замена `workspace.json` (без «рваных» чтений).
 * В Windows `rename` поверх существующего файла может падать — fallback: copyFile + unlink.
 */
async function atomicWriteWorkspaceJson(filePath, workspaceData) {
  const json = `${JSON.stringify(workspaceData, null, 2)}\n`;
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, json, 'utf-8');
  try {
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    if (
      err &&
      (err.code === 'EPERM' || err.code === 'EEXIST') &&
      process.platform === 'win32'
    ) {
      await fs.copyFile(tmpPath, filePath);
      await fs.unlink(tmpPath);
    } else {
      await fs.unlink(tmpPath).catch(() => {});
      throw err;
    }
  }
}

/**
 * @param {unknown} rawBody
 * @returns {{
 *   blocks: Record<string, unknown>;
 *   camera: { x: number; y: number };
 *   modes: { cameraInertia: boolean; blockGridSnap: boolean };
 * }}
 */
function normalizeWorkspacePayloadFromRequestBody(rawBody) {
  let requestBody = {};
  if (rawBody && typeof rawBody === 'object') {
    requestBody = rawBody;
  }
  let cameraSection = {};
  if (requestBody.camera && typeof requestBody.camera === 'object') {
    cameraSection = requestBody.camera;
  }
  let modesSection = {};
  if (requestBody.modes && typeof requestBody.modes === 'object') {
    modesSection = requestBody.modes;
  }
  let blocksPayload = {};
  if (requestBody.blocks && typeof requestBody.blocks === 'object') {
    blocksPayload = requestBody.blocks;
  }
  let cameraInertiaEnabled = true;
  if (typeof modesSection.cameraInertia === 'boolean') {
    cameraInertiaEnabled = modesSection.cameraInertia;
  }
  let blockGridSnapEnabled = true;
  if (typeof modesSection.blockGridSnap === 'boolean') {
    blockGridSnapEnabled = modesSection.blockGridSnap;
  }
  return {
    blocks: blocksPayload,
    camera: {
      x: Math.round(Number(cameraSection.x) || 0),
      y: Math.round(Number(cameraSection.y) || 0),
    },
    modes: {
      cameraInertia: cameraInertiaEnabled,
      blockGridSnap: blockGridSnapEnabled,
    },
  };
}

app.post('/api/save-workspace', async (req, res) => {
  try {
    const workspaceData = normalizeWorkspacePayloadFromRequestBody(req.body);

    if (shouldUseVolatileWorkspaceStore(req)) {
      volatileScratchWorkspace = workspaceData;
      console.log('[Server] Workspace saved (volatile, tests — workspace.json unchanged)');
      res.json({ success: true, message: 'Workspace saved (volatile)' });
      return;
    }

    const writeFinished = saveWorkspaceWriteChain.then(() =>
      atomicWriteWorkspaceJson(workspaceJsonPath, workspaceData)
    );
    saveWorkspaceWriteChain = writeFinished.catch(err => {
      console.error('[Server] save-workspace queued write failed:', err);
    });
    await writeFinished;
    console.log('[Server] Workspace saved to workspace.json');
    res.json({ success: true, message: 'Workspace saved successfully' });
  } catch (error) {
    console.error('[Server] Error saving workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/load-workspace', async (req, res) => {
  try {
    if (shouldUseVolatileWorkspaceStore(req)) {
      const payload =
        volatileScratchWorkspace != null
          ? volatileScratchWorkspace
          : EMPTY_WORKSPACE_DEFAULTS;
      console.log('[Server] Workspace loaded (volatile, tests — not from workspace.json)');
      res.json({ success: true, data: payload });
      return;
    }

    try {
      const data = await fs.readFile(workspaceJsonPath, 'utf-8');
      const parsed = JSON.parse(data);
      let cameraSection = {};
      if (parsed.camera && typeof parsed.camera === 'object') {
        cameraSection = parsed.camera;
      }
      let modesSection = {};
      if (parsed.modes && typeof parsed.modes === 'object') {
        modesSection = parsed.modes;
      }
      let blocksPayload = {};
      if (parsed.blocks && typeof parsed.blocks === 'object') {
        blocksPayload = parsed.blocks;
      }
      let cameraDocumentX = 0;
      if (Number.isFinite(Number(cameraSection.x))) {
        cameraDocumentX = Number(cameraSection.x);
      }
      let cameraDocumentY = 0;
      if (Number.isFinite(Number(cameraSection.y))) {
        cameraDocumentY = Number(cameraSection.y);
      }
      let cameraInertiaEnabled = true;
      if (typeof modesSection.cameraInertia === 'boolean') {
        cameraInertiaEnabled = modesSection.cameraInertia;
      }
      let blockGridSnapEnabled = true;
      if (typeof modesSection.blockGridSnap === 'boolean') {
        blockGridSnapEnabled = modesSection.blockGridSnap;
      }
      const workspaceData = {
        blocks: blocksPayload,
        camera: {
          x: cameraDocumentX,
          y: cameraDocumentY,
        },
        modes: {
          cameraInertia: cameraInertiaEnabled,
          blockGridSnap: blockGridSnapEnabled,
        },
      };
      console.log('[Server] Workspace loaded from workspace.json');
      res.json({ success: true, data: workspaceData });
    } catch (error) {
      console.error(
        '[Server] workspace.json missing or invalid JSON — using defaults:',
        error.message
      );
      res.json({
        success: true,
        data: { ...EMPTY_WORKSPACE_DEFAULTS },
      });
    }
  } catch (error) {
    console.error('[Server] Error loading workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {});
