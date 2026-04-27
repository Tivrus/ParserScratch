
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3001;
console.log(`[Server] http://localhost:${PORT}`)

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(__dirname));

const workspaceJsonPath = path.join(__dirname, 'workspace.json');

/** Serialize concurrent saves: parallel POSTs must not write the same file at once. */
let saveWorkspaceWriteChain = Promise.resolve();

/**
 * Write full JSON to a temp file, then replace `workspace.json` (avoids torn reads / mixed writes).
 * On Windows, `rename` over an existing file can fail — fall back to `copyFile` + unlink.
 */
async function atomicWriteWorkspaceJson(filePath, workspaceData) {
    const json = `${JSON.stringify(workspaceData, null, 2)}\n`;
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, json, 'utf-8');
    try {
        await fs.rename(tmpPath, filePath);
    } catch (err) {
        if (err && (err.code === 'EPERM' || err.code === 'EEXIST') && process.platform === 'win32') {
            await fs.copyFile(tmpPath, filePath);
            await fs.unlink(tmpPath);
        } else {
            await fs.unlink(tmpPath).catch(() => {});
            throw err;
        }
    }
}

app.post('/api/save-workspace', async (req, res) => {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const cam = body.camera && typeof body.camera === 'object' ? body.camera : {};
        const mod = body.modes && typeof body.modes === 'object' ? body.modes : {};
        const workspaceData = {
            blocks: body.blocks && typeof body.blocks === 'object' ? body.blocks : {},
            camera: {
                x: Math.round(Number(cam.x) || 0),
                y: Math.round(Number(cam.y) || 0),
            },
            modes: {
                cameraInertia: typeof mod.cameraInertia === 'boolean' ? mod.cameraInertia : true,
                blockGridSnap: typeof mod.blockGridSnap === 'boolean' ? mod.blockGridSnap : true,
            },
        };
        const writeFinished = saveWorkspaceWriteChain.then(() =>
            atomicWriteWorkspaceJson(workspaceJsonPath, workspaceData)
        );
        saveWorkspaceWriteChain = writeFinished.catch((err) => {
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
        try {
            const data = await fs.readFile(workspaceJsonPath, 'utf-8');
            const parsed = JSON.parse(data);
            const cam = parsed.camera && typeof parsed.camera === 'object' ? parsed.camera : {};
            const mod = parsed.modes && typeof parsed.modes === 'object' ? parsed.modes : {};
            const workspaceData = {
                blocks: parsed.blocks && typeof parsed.blocks === 'object' ? parsed.blocks : {},
                camera: {
                    x: Number.isFinite(Number(cam.x)) ? Number(cam.x) : 0,
                    y: Number.isFinite(Number(cam.y)) ? Number(cam.y) : 0,
                },
                modes: {
                    cameraInertia: typeof mod.cameraInertia === 'boolean' ? mod.cameraInertia : true,
                    blockGridSnap: typeof mod.blockGridSnap === 'boolean' ? mod.blockGridSnap : true,
                },
            };
            console.log('[Server] Workspace loaded from workspace.json');
            res.json({ success: true, data: workspaceData });
        } catch (error) {
            console.error('[Server] workspace.json missing or invalid JSON — using defaults:', error.message);
            res.json({
                success: true,
                data: {
                    blocks: {},
                    camera: { x: 0, y: 0 },
                    modes: { cameraInertia: true, blockGridSnap: true },
                },
            });
        }
    } catch (error) {
        console.error('[Server] Error loading workspace:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {

});
