
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
app.post('/api/save-workspace', async (req, res) => {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const workspaceData = {
            blocks: body.blocks && typeof body.blocks === 'object' ? body.blocks : {},
        };
        const filePath = path.join(__dirname, 'workspace.json');
        await fs.writeFile(filePath, JSON.stringify(workspaceData, null, 2), 'utf-8');
        console.log('[Server] Workspace saved to workspace.json');
        res.json({ success: true, message: 'Workspace saved successfully' });
    } catch (error) {
        console.error('[Server] Error saving workspace:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/load-workspace', async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'workspace.json');
        
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            const workspaceData = {
                blocks: parsed.blocks && typeof parsed.blocks === 'object' ? parsed.blocks : {},
            };
            console.log('[Server] Workspace loaded from workspace.json');
            res.json({ success: true, data: workspaceData });
        } catch (error) {
            res.json({ success: true, data: { blocks: {} } });
        }
    } catch (error) {
        console.error('[Server] Error loading workspace:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {

});
