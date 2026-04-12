import * as Global from '../constans/Global.js';

export function createSVG(tag) {
  return document.createElementNS(Global.SVG_NS, tag);
}

export function setAttributes(el, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
}

export function createElement(tag, attrs = {}) {
  const el = createSVG(tag);
  setAttributes(el, attrs);
  return el;
}

// Workspace <g.workspace-block>: use attribute + getAttribute (SVG dataset is unreliable; UUID may contain % + /).
export const ATTR_WORKSPACE_BLOCK_UUID = 'data-block-uuid';

export function readWorkspaceBlockUUID(element) {
  if (!element?.getAttribute) return '';
  return element.getAttribute(ATTR_WORKSPACE_BLOCK_UUID) || '';
}

// Parse translate transform from SVG element
export function parseTranslateTransform(element) {
  const match = (element.getAttribute('transform') || '').match(
    /translate\(\s*([+-]?\d*\.?\d+)[,\s]+([+-]?\d*\.?\d+)\s*\)/
  );
  return match
    ? { x: parseFloat(match[1]), y: parseFloat(match[2]) }
    : { x: 0, y: 0 };
}

// Rounded client rect (legacy helper for connector layout).
export function getBoundingClientRectRounded(element) {
  const rect = element.getBoundingClientRect();
  const w = Math.floor(rect.width || 0);
  const h = Math.floor(rect.height || 0);
  const left = rect.left ?? 0;
  const top = rect.top ?? 0;
  return {
    left,
    top,
    right: left + w,
    bottom: top + h,
    width: w,
    height: h,
  };
}

// Client (viewport) coordinates → this element's local user space (inverse of getScreenCTM).
export function clientPointToElementLocal(element, clientX, clientY) {
  const svg = element.ownerSVGElement;
  if (!svg?.createSVGPoint || typeof element.getScreenCTM !== 'function') return null;
  const m = element.getScreenCTM();
  if (!m) return null;
  try {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const local = pt.matrixTransform(m.inverse());
    return { x: local.x, y: local.y };
  } catch {
    return null;
  }
}

// Parse SVG path string to array of commands
function parseSvgPath(pathString) {
  const commands = [];
  const regex = /([a-zA-Z])([^a-zA-Z]*)/g;
  let match;
  while ((match = regex.exec(pathString)) !== null) {
    const command = match[1];
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(parseFloat);
    commands.push({ command, args });
  }
  return commands;
}

// Stringify array of commands to SVG path string
function stringifyPath(commands) {
  return commands
    .map(cmd => cmd.args.length === 0 
      ? cmd.command 
      : `${cmd.command}${cmd.args.join(',')}`)
    .join(' ');
}

// Find all commands of given type (e.g. 'h', 'v')
function findCommandsByType(commands, type) {
  return commands
    .map((cmd, index) => ({ index, cmd }))
    .filter(({ cmd }) => cmd.command.toLowerCase() === type.toLowerCase());
}

// Adjust value with sign preservation (for resize)
function adjustValue(value, delta) {
  if (delta === 0) return value;
  const sign = Math.sign(value) || Math.sign(delta) || 1;
  const magnitude = Math.max(0, Math.abs(value) + delta);
  return sign * magnitude;
}

// Change length of horizontal/vertical path segments
export function resizePath(pathString, config = {}) {
  const { horizontal = 0, vertical = 0, hIndices = [], vIndices = [] } = config;
  if (horizontal === 0 && vertical === 0) return pathString;
  const commands = parseSvgPath(pathString);
  const hCmds = findCommandsByType(commands, 'h');
  const vCmds = findCommandsByType(commands, 'v');
  if (horizontal !== 0) {
    hIndices.forEach(i => {
      if (i < hCmds.length) {
        const idx = hCmds[i].index;
        if (commands[idx].args.length > 0) {
          commands[idx].args[0] = adjustValue(commands[idx].args[0], horizontal);
        }
      }
    });
  }
  if (vertical !== 0) {
    vIndices.forEach(i => {
      if (i < vCmds.length) {
        const idx = vCmds[i].index;
        if (commands[idx].args.length > 0) {
          commands[idx].args[0] = adjustValue(commands[idx].args[0], vertical);
        }
      }
    });
  }
  return stringifyPath(commands);
}

export const PATH_RESIZE_CONFIGS = {
  'start-block': { hIndices: [0, 1] },
  'c-block': { hIndices: [2, 3, 8, 10], vIndices: [1, 3] },
  'default-block': { hIndices: [2, 3] },
  'stop-block': { hIndices: [2, 3] },
  'round-block': { hIndices: [0, 1] },
  'sharp-block': { hIndices: [0, 1] }
};

export function getResizeConfig(blockType) {
  return PATH_RESIZE_CONFIGS[blockType] || PATH_RESIZE_CONFIGS['default-block'];
}


export function applyResizeToPathElement(pathEl, horizontal = 0, vertical = 0) {
  const blockType = pathEl.dataset.blockType;
  const config = getResizeConfig(blockType);
  const currentD = pathEl.getAttribute('d');
  const newD = resizePath(currentD, { horizontal, vertical, ...config });
  pathEl.setAttribute('d', newD);
}