//window.__DEBUG__ = true;

import { CONSTANTS } from './constantsDefaults.js';

export {
  logError,
  SHRINK_MS, //260
  DOM_IDS, //{ canvas: 'canvas', workspace: 'workspace', camera: 'camera', grid: 'grid', blocks: 'blocks', Zones: 'Zones', innerGhost: 'inner-ghost', inputBlocks: 'input-blocks', Ghost: 'ghost-block' }
  WORKSPACE_EVENTS, //{ structureChanged: 'workspace-structure-changed', cameraOffsetChanged: 'workspace-camera-offset-changed', modesChanged: 'workspace-modes-changed' }
  WORKSPACE_SAVE_URL, //'/api/save-workspace'
  WORKSPACE_LOAD_URL, //'/api/load-workspace'
  WORKSPACE_SAVE_DEBOUNCE_MS, //320
} from './app.js';

export { BLOCK_FORMS } from './blockShapes.js';

export const {
  DEFAULT_BLOCK_COLOR, //'#4c97ff'
  GHOST, //{ FILL_COLOR: '#808080', STROKE_COLOR: '#606060' }
  DEFAULT_BLOCK_HEIGHT, //56
  CBLOCK_NESTED_X_OFFSET, //16
  C_BLOCK_EMPTY_INNER_SPACE,
  ZONE_HEIGHT, //32
  ZONE_SOCKET_HEIGHT, //8
  EXTRA_Y, //2
  MOVE_THRESHOLD, //3
  ZONE_STYLE, //{ fill: 'rgba(0, 255, 170, 0.15)', stroke: '#00ff00', 'stroke-width': '0.5', 'pointer-events': 'none', rx: '2', ry: '2' }
  START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET, //{ x: 48, y: -56 }
  STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET, //{ x: 48, y: 56 }
  SVG_NS, //'http://www.w3.org/2000/svg'
  FALLBACK_DARK, //'rgba(0,0,0,0.7)'
  UUID_ALPHABET, //'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/%+'
  WORKSPACE_GRID_CELL_PX, //24
  WORKSPACE_BLOCK_GRID_SNAP, //{ enabled: true }
  WORKSPACE_CAMERA_INERTIA, //{ enabled: true, maxDurationForImpulseMs: 320, minDurationMs: 700, minImpulsePxPerMs: 0.01, impulseGain: 1.0, frictionPerMs: 0.9978, minVelocityCutoffPxPerMs: 0.016 }
  C_BLOCK_CANONICAL_PATH_EXPECTED_V_COUNT, //4
  C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES, //[1, 3]
} = CONSTANTS;
