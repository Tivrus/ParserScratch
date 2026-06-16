/** Простые скалярные константы. Объекты — в `constantsStructures.js`. */

/** Длительность анимации сжатия при удалении блока (мс). */
export const SHRINK_MS = 260;

/** POST тело → `workspace.json` (см. `server.js`). */
export const WORKSPACE_SAVE_URL = '/api/save-workspace';
/** GET → разобранный документ workspace. */
export const WORKSPACE_LOAD_URL = '/api/load-workspace';
/** Окно debounce (мс) перед сохранением после частых событий на полотне. */
export const WORKSPACE_SAVE_DEBOUNCE_MS = 320;

/** Стандартная заливка блока (в фабрике перекрывается цветом категории). */
export const DEFAULT_BLOCK_COLOR = '#4c97ff';

/** Горизонтальный отступ на уровень вложенности внутри c-block. */
export const CBLOCK_NESTED_X_OFFSET = 16;
/** Минимальный пустой зазор внутри c-block без детей. */
export const C_BLOCK_EMPTY_INNER_SPACE = 24;
/** Толщина (px) полосы попадания зон стекового коннектора. */
export const ZONE_HEIGHT = 32;
/** Визуальная глубина сокета (px). */
export const ZONE_SOCKET_HEIGHT = 8;
/** Шляпа (start-block) при snap сверху/снизу: небольшой сдвиг Y, чтобы швы не наезжали. */
export const EXTRA_Y = 2;
/** Минимальное смещение указателя (px), чтобы считать жест перетаскиванием, а не кликом. */
export const MOVE_THRESHOLD = 3;

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const FALLBACK_DARK = 'rgba(0,0,0,0.7)';
export const UUID_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/%+';

/** Размер ячейки фона рабочей области (px). */
export const WORKSPACE_GRID_CELL_PX = 24;

/**
 * Канонический path c-block: четыре команды `v` по порядку.
 * Индексы — порядковые только среди `v` (0 = первая `v`).
 */
export const C_BLOCK_CANONICAL_PATH_EXPECTED_V_COUNT = 4;
