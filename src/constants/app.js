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

/** Block delete shrink animation duration (ms). */
export const SHRINK_MS = 260;

/** DOM element ids (single source for selectors vs getElementById). */
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

/** CustomEvent.type on workspace (bubbles: true). */
export const WORKSPACE_EVENTS = {
  structureChanged: 'workspace-structure-changed',
  /** Fired on `workspace` after grid pan ends (`detail`: `{ x, y }` view offset). */
  cameraOffsetChanged: 'workspace-camera-offset-changed',
  /** Toolbar modes (inertia / grid snap) changed — triggers workspace save. */
  modesChanged: 'workspace-modes-changed',
};

/** POST body → `workspace.json` (see `server.js`). */
export const WORKSPACE_SAVE_URL = '/api/save-workspace';
/** GET → parsed workspace document. */
export const WORKSPACE_LOAD_URL = '/api/load-workspace';
/** Debounce window (ms) before sending a save after rapid workspace events. */
export const WORKSPACE_SAVE_DEBOUNCE_MS = 320;
