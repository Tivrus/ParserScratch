/** Hit band thickness (px) for stack connector zones. */
export const CONNECTOR_THRESHOLD = 32;

/** Visual connector socket depth (px). */
export const CONNECTOR_SOCKET_HEIGHT = 8;

/** Hat (start-block) on a normal below/above snap: small Y nudge so hat/socket seams do not overlap. */
export const START_BLOCK_NORMAL_STACK_EXTRA_Y = 2;

/** Minimum pointer delta (px) to count as a drag rather than a click. */
export const MOVE_THRESHOLD = 3;

export const CONNECTOR_OFFSETS = {
  TOP_Y: 0,
  BOTTOM_Y: 0,
};

export const CONNECTOR_ZONE_STYLE = {
  fill: 'rgba(0, 255, 170, 0.15)',
  stroke: '#00ff00',
  'stroke-width': '0.5',
  'pointer-events': 'none',
  rx: '2',
  ry: '2',
};

/** When a start-block is inserted in the middle of a stack: upper segment shifts by this (px). */
export const START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET = { x: 48, y: -56 };

/** When a stop-block is inserted in the middle: lower segment shifts by this (px). */
export const STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET = { x: 48, y: 56 };
