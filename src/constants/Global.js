/**
 * Aggregated app constants (backward-compatible barrel).
 * Prefer importing from the smaller modules in this folder when adding new code.
 */

export {
  logError,
  SHRINK_MS,
  DOM_IDS,
  WORKSPACE_EVENTS,
  WORKSPACE_SAVE_URL,
  WORKSPACE_LOAD_URL,
  WORKSPACE_SAVE_DEBOUNCE_MS,
} from './app.js';

export { BLOCK_FORMS } from './blockShapes.js';

export {
  DEFAULT_BLOCK_COLOR,
  GHOST_BLOCK,
  DEFAULT_BLOCK_HEIGHT,
  CBLOCK_NESTED_X_OFFSET,
  C_BLOCK_EMPTY_INNER_SPACE,
} from './blockTheme.js';

export {
  CONNECTOR_THRESHOLD,
  CONNECTOR_SOCKET_HEIGHT,
  START_BLOCK_NORMAL_STACK_EXTRA_Y,
  MOVE_THRESHOLD,
  CONNECTOR_OFFSETS,
  CONNECTOR_ZONE_STYLE,
  START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET,
  STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET,
} from './connectors.js';

export { SVG_NS, FALLBACK_DARK, UUID_ALPHABET, WORKSPACE_GRID_CELL_PX } from './svgConstants.js';

export { WORKSPACE_BLOCK_GRID_SNAP, WORKSPACE_CAMERA_INERTIA } from './workspaceLayout.js';
