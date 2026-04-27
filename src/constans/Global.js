//window.__DEBUG__ = true;


export function logError(message, options = {}) {
  const { error = null, context = null, throwAfter = false } = options;
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const prefix = context ? `[${context}]` : '[ERROR]';
  const fullMessage = `${prefix} ${message}`;
  if (error instanceof Error) {
    console.error(
      `%c${timestamp} %c${fullMessage}`,
      'color: #888; font-style: italic;',
      'color: #f44336; font-weight: bold;',
      '\n', error
    );
  } else {
    console.error(
      `%c${timestamp} %c${fullMessage}`,
      'color: #888; font-style: italic;',
      'color: #f44336; font-weight: bold;'
    );
  }
  if (throwAfter) {
    throw new Error(message);
  }
}

// Block delete shrink animation duration (ms).
export const SHRINK_MS = 260;

// DOM element ids (single source for selectors vs getElementById)
export const DOM_IDS = {
  workspace: 'workspace',
  blockTemplates: 'block-templates',
  categoryList: 'category-list',
  sidebar: 'sidebar',
  dragOverlay: 'drag-overlay',
  trashCan: 'trash-can',
  blockContainer: 'block-container',
  blockWorldRoot: 'block-world-root',
  grid: 'grid',
  toggleCameraInertia: 'toggle-camera-inertia',
  toggleBlockGridSnap: 'toggle-block-grid-snap',
};

// CustomEvent.type on workspace (bubbles: true)
export const WORKSPACE_EVENTS = {
  structureChanged: 'workspace-structure-changed',
  /** Fired on `workspace` after grid pan ends (`detail`: `{ x, y }` view offset). */
  cameraOffsetChanged: 'workspace-camera-offset-changed',
  /** Toolbar modes (inertia / grid snap) changed — triggers workspace save. */
  modesChanged: 'workspace-modes-changed',
};

// === SVG FORMS ===
export const BLOCK_FORMS = [
    {
      type: 'start-block',
      path: 'm48,1 c17.56,0,35.06,5.45,47.34,16.25 l0.28,0.25 h40.13 c0.8,0,1.56,0.32,2.12,0.88 c0.56,0.56,0.88,1.33,0.88,2.12 v40 c0,0.8,-0.32,1.56,-0.88,2.12 c-0.56,0.56,-1.33,0.88,-2.12,0.88 h-87.75 c-2.44,0,-3.7,1.28,-4.71,2.29 l-4,4 c-0.99,0.99,-1.73,1.71,-3.29,1.71 h-12 c-1.56,0,-2.3,-0.72,-3.29,-1.71 l-4,-4 c-1.01,-1.01,-2.27,-2.29,-4.71,-2.29 h-8 c-0.8,0,-1.56,-0.32,-2.12,-0.88 c-0.56,-0.56,-0.88,-1.33,-0.88,-2.12 v-43.54 c12.26,-10.61,29.6,-15.96,47,-15.96 z',
      width: 140,
      height: 73
    },
    {
      type: 'default-block',
      path: 'm4,1 h8 c1.56,0,2.3,0.72,3.29,1.71 l4,4 c1.01,1.01,2.27,2.29,4.71,2.29 h12 c2.44,0,3.7,-1.28,4.71,-2.29 l4,-4 c0.99,-0.99,1.73,-1.71,3.29,-1.71 h99.19 c0.8,0,1.56,0.32,2.12,0.88 c0.56,0.56,0.88,1.33,0.88,2.12 v40 c0,0.8,-0.32,1.56,-0.88,2.12 c-0.56,0.56,-1.33,0.88,-2.12,0.88 h-99.19 c-2.44,0,-3.7,1.28,-4.71,2.29 l-4,4 c-0.99,-0.99,-1.73,-1.71,-3.29,1.71 h-12 c-1.56,0,-2.3,-0.72,-3.29,-1.71 l-4,-4 c-1.01,-1.01,-2.27,-2.29,-4.71,-2.29 h-8 c-0.8,0,-1.56,-0.32,-2.12,-0.88 c-0.56,-0.56,-0.88,-1.33,-0.88,-2.12 v-40 c0,-0.8,0.32,-1.56,0.88,-2.12 c0.56,-0.56,1.33,-0.88,2.12,-0.88 z',
      width: 152,
      height: 56
    },
    
    {
      type: 'c-block',
      path: 'm4,1 h8 c1.56,0,2.3,0.72,3.29,1.71 l4,4 c1.01,1.01,2.27,2.29,4.71,2.29 h12 c2.44,0,3.7,-1.28,4.71,-2.29 l4,-4 c0.99,-0.99,1.73,-1.71,3.29,-1.71 h120.22 c0.79,0,1.56,0.32,2.12,0.88 c0.56,0.56,0.88,1.33,0.88,2.12 v40 c0,0.8,-0.32,1.56,-0.88,2.12 c-0.56,0.56,-1.33,0.88,-2.12,0.88 h-104.22 c-2.44,0,-3.7,1.28,-4.71,2.29 l-4,4 c-0.99,-0.99,-1.73,1.71,-3.29,1.71 h-12 c-1.56,0,-2.3,-0.72,-3.29,-1.71 l-4,-4 c-1.01,-1.01,-2.27,-2.29,-4.71,-2.29 h-8 c-1.33,0,-2.6,0.53,-3.54,1.46 c-0.94,0.94,-1.46,2.21,-1.46,3.54 v16 c0,1.33,0.53,2.6,1.46,3.54 c0.94,0.94,2.21,1.46,3.54,1.46 h8 c1.56,0,2.3,0.72,3.29,1.71 l4,4 c1.01,1.01,2.27,2.29,4.71,2.29 h12 c2.44,0,3.7,-1.28,4.71,-2.29 l4,-4 c0.99,-0.99,1.73,-1.71,3.29,-1.71 h104.22 c0.79,0,1.56,0.32,2.12,0.88 c0.56,0.56,0.88,1.33,0.88,2.12 v24 c0,0.8,-0.32,1.56,-0.88,2.12 c-0.56,0.56,-1.33,0.88,-2.12,0.88 h-120.22 c-2.44,0,-3.7,1.28,-4.71,2.29 l-4,4 c-0.99,-0.99,-1.73,1.71,-3.29,1.71 h-12 c-1.56,0,-2.3,-0.72,-3.29,-1.71 l-4,-4 c-1.01,-1.01,-2.27,-2.29,-4.71,-2.29 h-8 c-0.8,0,-1.56,-0.32,-2.12,-0.88 c-0.56,-0.56,-0.88,-1.32,-0.88,-2.12 v-96 c0,-0.8,0.32,-1.56,0.88,-2.12 c0.56,-0.56,1.33,-0.88,2.12,-0.88 z',
      width: 173,
      height: 112
    },
    {
      type: 'stop-block',
      path: 'm4,1 h8 c1.56,0,2.3,0.72,3.29,1.71 l4,4 c1.01,1.01,2.27,2.29,4.71,2.29 h12 c2.44,0,3.7,-1.28,4.71,-2.29 l4,-4 c0.99,-0.99,1.73,-1.71,3.29,-1.71 h71.94 c0.8,0,1.56,0.32,2.12,0.88 c0.56,0.56,0.88,1.33,0.88,2.12 v40 c0,0.8,-0.32,1.56,-0.88,2.12 c-0.56,0.56,-1.33,0.88,-2.12,0.88 h-115.94 c-0.8,0,-1.56,-0.32,-2.12,-0.88 c-0.56,-0.56,-0.88,-1.33,-0.88,-2.12 v-40 c0,-0.8,0.32,-1.56,0.88,-2.12 c0.56,-0.56,1.33,-0.88,2.12,-0.88 z',
      width: 124,
      height: 48
    },
    {
      type: 'round-block',
      path: 'm20,1 h68.45 c5.04,0,9.87,2,13.43,5.57 c3.56,3.56,5.56,8.4,5.56,13.43 c0,5.04,-2,9.87,-5.56,13.43 c-3.56,-3.56,-8.4,-5.57,-13.43,-5.57 h-68.45 c-5.04,0,-9.87,-2,-13.43,-5.57 c-3.56,-3.56,-5.57,-8.4,-5.57,-13.43 c0,-5.04,2,-9.87,5.57,-13.43 c3.56,-3.56,8.4,-5.57,13.43,-5.57 z',
      width: 109,
      height: 40
    },
    {
      type: 'sharp-block',
      path: 'm81.32,1 l19,19 l-19,19 h-60.9 l-19,-19 l19,-19 h60.9 z',
      width: 102,
      height: 40
    }
  ];

// === COLOR SCHEME ===
// Standard fill color of blocks
export const DEFAULT_BLOCK_COLOR = '#4c97ff';

// Colors of the ghost block for visual feedback when dragging
export const GHOST_BLOCK = {
  FILL_COLOR: '#808080',   
  STROKE_COLOR: '#606060'
};

// === BLOCK GEOMETRY ===
// Standard height of a regular block
export const DEFAULT_BLOCK_HEIGHT = 56;
// Horizontal offset for each level of nesting inside the c-block
export const CBLOCK_NESTED_X_OFFSET = 16;
// Minimum empty space inside the c-block when there are no child elements
export const C_BLOCK_EMPTY_INNER_SPACE = 24;

// === CONNECTOR ZONES ===
// Threshold distance (in pixels) for activating the connector zone
export const CONNECTOR_THRESHOLD = 32;
// Height of the visual connector socket
export const CONNECTOR_SOCKET_HEIGHT = 8;
// Hat (start-block) on a normal below/above snap: small Y nudge so hat/socket seams do not overlap.
export const START_BLOCK_NORMAL_STACK_EXTRA_Y = 2;
// Minimum delta to count as a drag rather than a click
export const MOVE_THRESHOLD = 3; 

// Offsets of connector positions relative to the block
export const CONNECTOR_OFFSETS = {
  TOP_Y: 0,
  BOTTOM_Y: 0,
};

export const CONNECTOR_ZONE_STYLE = {
  fill:           'rgba(0, 255, 170, 0.15)',
  stroke:         '#00ff00',
  'stroke-width': '0.5',
  'pointer-events': 'none',
  rx: '2', ry: '2',
};

// === SVG CONSTANTS ===
export const SVG_NS = 'http://www.w3.org/2000/svg';
export const FALLBACK_DARK = 'rgba(0,0,0,0.7)';
export const UUID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/%+';
export const WORKSPACE_GRID_CELL_PX = 24;

/** Runtime: when false, block positions round to 1px instead of snapping to the grid cell. */
export const WORKSPACE_BLOCK_GRID_SNAP = {
  enabled: true,
};

/** When a start-block is inserted in the middle of a stack: upper segment (chain above it) shifts by this (px). */
export const START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET = { x: 48, y: -56 };
/** When a stop-block is inserted in the middle: lower segment (chain below it) shifts by this (px). */
export const STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET = { x: 48, y: 56 };

// === WORKSPACE CAMERA INERTIA (after empty-workspace grid pan) ===
// Uses GrabManager grab-end `duration` (ms) and `deltaX`/`deltaY` (px, pointer displacement).
// `enabled` is toggled at runtime (e.g. workspace toolbar).
export const WORKSPACE_CAMERA_INERTIA = {
  enabled: true,
  /** Do not start coasting for very long drags (px/ms becomes tiny). */
  maxDurationForImpulseMs: 320,
  /** Floor for duration (ms) when computing release speed. */
  minDurationMs: 700,
  /** Minimum release speed (px per ms) to start inertial glide. */
  minImpulsePxPerMs: 0.01,
  /** Scales how much of the release velocity becomes coast velocity (0–1+). */
  impulseGain: 1.0,
  /** Per-ms velocity decay: each frame v *= frictionPerMs ** dt. Lower = quicker stop. */
  frictionPerMs: 0.9978,
  /** End glide when speed (px/ms) falls below this. */
  minVelocityCutoffPxPerMs: 0.016,
};