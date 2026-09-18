export function logError(message, options = {}){
  const { error = null, context = null, throwAfter = false } = options
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  let logPrefix
  if (context){
    logPrefix = `[${context}]`
  } else {
    logPrefix = '[ERROR]'
  }
  const fullMessage = `${logPrefix} ${message}`
  if (error instanceof Error){
    console.error(
      `%c${timestamp} %c${fullMessage}`,
      'color: #888 font-style: italic',
      'color: #f44336 font-weight: bold',
      '\n',
      error
    )
  } else {
    console.error(
      `%c${timestamp} %c${fullMessage}`,
      'color: #888 font-style: italic',
      'color: #f44336 font-weight: bold'
    )
  }
  if (throwAfter){
    throw new Error(message)
  }
}

export function getType(value){ 
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Element) return 'element'
  return typeof value
}

export function log(attribute){
if (getType(attribute) !== 'array'){
  console.log('element:', attribute, 'type:', getType(attribute))
}
if (getType(attribute) == 'array'){
  for (let atr of attribute){
    if (getType(atr) == 'element'){
      console.log('element:', atr, 'type:', getType(atr))
  }
  else {
      console.log('element:', attribute, 'type:', getType(attribute))
    break;
  }
  }
}
}

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
}

export const WORKSPACE_EVENTS = {
  structureChanged: 'workspace-structure-changed',
  cameraOffsetChanged: 'workspace-camera-offset-changed',
  modesChanged: 'workspace-modes-changed',
}

export const GHOST = {
  FILL_COLOR: '#808080',
  STROKE_COLOR: '#606060',
}

export const ZONE_STYLE = {
  fill: 'rgba(0, 255, 170, 0.15)',
  stroke: '#00ff00',
  'stroke-width': '0.5',
  'pointer-events': 'none',
  rx: '2',
  ry: '2',
}

export const START_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET = { x: 48, y: -56 }
export const STOP_BLOCK_MIDDLE_CHAIN_SPLIT_OFFSET = { x: 48, y: 56 }

export const WORKSPACE_BLOCK_GRID_SNAP = {
  enabled: true,
}

export const WORKSPACE_CAMERA_INERTIA = {
  enabled: true,
  maxDurationForImpulseMs: 320,
  minDurationMs: 700,
  minImpulsePxPerMs: 0.01,
  impulseGain: 1.0,
  frictionPerMs: 0.9978,
  minVelocityCutoffPxPerMs: 0.016,
}

export const C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES = Object.freeze([1, 3])
