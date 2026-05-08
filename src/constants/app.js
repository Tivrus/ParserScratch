//window.__DEBUG__ = true;

export function logError(message, options = {}) {
  const { error = null, context = null, throwAfter = false } = options;
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let logPrefix;
  if (context) {
    logPrefix = `[${context}]`;
  } else {
    logPrefix = '[ERROR]';
  }
  const fullMessage = `${logPrefix} ${message}`;
  if (error instanceof Error) {
    console.error(
      `%c${timestamp} %c${fullMessage}`,
      'color: #888; font-style: italic;',
      'color: #f44336; font-weight: bold;',
      '\n',
      error
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

/** Длительность анимации сжатия при удалении блока (мс). */
export const SHRINK_MS = 260;

/** Id элементов DOM (единый источник для селекторов и getElementById). */
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

/** Имена CustomEvent на рабочей области (bubbles: true). */
export const WORKSPACE_EVENTS = {
  structureChanged: 'workspace-structure-changed',
  /** После окончания панорамирования сетки (`detail`: смещение вида `{ x, y }`). */
  cameraOffsetChanged: 'workspace-camera-offset-changed',
  /** Режимы панели (инерция / сетка) изменились — инициирует сохранение workspace. */
  modesChanged: 'workspace-modes-changed',
};

/** POST тело → `workspace.json` (см. `server.js`). */
export const WORKSPACE_SAVE_URL = '/api/save-workspace';
/** GET → разобранный документ workspace. */
export const WORKSPACE_LOAD_URL = '/api/load-workspace';
/** Окно debounce (мс) перед сохранением после частых событий на полотне. */
export const WORKSPACE_SAVE_DEBOUNCE_MS = 320;
