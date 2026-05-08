/**
 * Сводные константы: тема, коннекторы, SVG, сетка, path c-block.
 * Именованные привязки реэкспортируются из `Global.js`.
 */
export const CONSTANTS = {
  /** Стандартная заливка блока (в фабрике перекрывается цветом категории). */
  DEFAULT_BLOCK_COLOR: '#4c97ff',

  /** Цвета призрака при перетаскивании / превью. */
  GHOST_BLOCK: {
    FILL_COLOR: '#808080',
    STROKE_COLOR: '#606060',
  },

  /** Номинальная высота обычного блока (px), запасной layout. */
  DEFAULT_BLOCK_HEIGHT: 56,
  /** Горизонтальный отступ на уровень вложенности внутри c-block. */
  CBLOCK_NESTED_X_OFFSET: 16,
  /** Минимальный пустой зазор внутри c-block без детей. */
  C_BLOCK_EMPTY_INNER_SPACE: 24,
  /** Толщина (px) полосы попадания зон стекового коннектора. */
  CONNECTOR_THRESHOLD: 32,
  /** Визуальная глубина сокета (px). */
  CONNECTOR_SOCKET_HEIGHT: 8,
  /** Шляпа (start-block) при snap сверху/снизу: небольшой сдвиг Y, чтобы швы не наезжали. */
  START_BLOCK_NORMAL_STACK_EXTRA_Y: 2,
  /** Минимальное смещение указателя (px), чтобы считать жест перетаскиванием, а не кликом. */
  MOVE_THRESHOLD: 3,

  CONNECTOR_OFFSETS: {
    TOP_Y: 0,
    BOTTOM_Y: 0,
  },

  CONNECTOR_ZONE_STYLE: {
    fill: 'rgba(0, 255, 170, 0.15)',
    stroke: '#00ff00',
    'stroke-width': '0.5',
    'pointer-events': 'none',
    rx: '2',
    ry: '2',
  },

  /** Вставка start-block в середину стека: сдвиг верхнего сегмента (px). */
  START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET: { x: 48, y: -56 },
  /** Вставка stop-block в середину: сдвиг нижнего сегмента (px). */
  STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET: { x: 48, y: 56 },

  SVG_NS: 'http://www.w3.org/2000/svg',
  FALLBACK_DARK: 'rgba(0,0,0,0.7)',
  UUID_ALPHABET:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/%+',

  /** Размер ячейки фона рабочей области (px). */
  WORKSPACE_GRID_CELL_PX: 24,

  /** Если выключено, позиции блоков округляются к 1px, без привязки к сетке. */
  WORKSPACE_BLOCK_GRID_SNAP: {
    enabled: true,
  },

  /**
   * Инерция камеры после панорамирования по пустому полотну.
   * Берёт из grab-end длительность (мс) и `deltaX`/`deltaY` (px).
   * `enabled` переключается в рантайме (панель рабочей области).
   */
  WORKSPACE_CAMERA_INERTIA: {
    enabled: true,
    maxDurationForImpulseMs: 320,
    minDurationMs: 700,
    minImpulsePxPerMs: 0.01,
    impulseGain: 1.0,
    frictionPerMs: 0.9978,
    minVelocityCutoffPxPerMs: 0.016,
  },

  /**
   * Канонический path c-block: четыре команды `v` по порядку.
   * Индексы — порядковые только среди `v` (0 = первая `v`).
   */
  C_BLOCK_CANONICAL_PATH_EXPECTED_V_COUNT: 4,
  /** Две ноги `v`, которые удлиняются вместе при внутреннем стеке / вертикальном resize. */
  C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES: Object.freeze([1, 3]),
};
