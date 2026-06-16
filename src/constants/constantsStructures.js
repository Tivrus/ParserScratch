//window.__DEBUG__ = true;

export function logError(message, options = {}){
  const { error = null, context = null, throwAfter = false } = options;
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let logPrefix;
  if (context){
    logPrefix = `[${context}]`;
  } else {
    logPrefix = '[ERROR]';
  }
  const fullMessage = `${logPrefix} ${message}`;
  if (error instanceof Error){
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
  if (throwAfter){
    throw new Error(message);
  }
}

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

/** Цвета призрака при перетаскивании / превью. */
export const GHOST = {
  FILL_COLOR: '#808080',
  STROKE_COLOR: '#606060',
};

export const ZONE_STYLE = {
  fill: 'rgba(0, 255, 170, 0.15)',
  stroke: '#00ff00',
  'stroke-width': '0.5',
  'pointer-events': 'none',
  rx: '2',
  ry: '2',
};

/** Вставка start-block в середину стека: сдвиг верхнего сегмента (px). */
export const START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET = { x: 48, y: -56 };
/** Вставка stop-block в середину: сдвиг нижнего сегмента (px). */
export const STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET = { x: 48, y: 56 };

/** Если выключено, позиции блоков округляются к 1px, без привязки к сетке. */
export const WORKSPACE_BLOCK_GRID_SNAP = {
  enabled: true,
};

/**
 * Инерция камеры после панорамирования по пустому полотну.
 * Берёт из grab-end длительность (мс) и `deltaX`/`deltaY` (px).
 * `enabled` переключается в рантайме (панель рабочей области).
 */
export const WORKSPACE_CAMERA_INERTIA = {
  enabled: true,
  maxDurationForImpulseMs: 320,
  minDurationMs: 700,
  minImpulsePxPerMs: 0.01,
  impulseGain: 1.0,
  frictionPerMs: 0.9978,
  minVelocityCutoffPxPerMs: 0.016,
};

/** Две ноги `v`, которые удлиняются вместе при внутреннем стеке / вертикальном resize. */
export const C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES = Object.freeze([1, 3]);
