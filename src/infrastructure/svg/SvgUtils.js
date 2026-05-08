import * as Global from '../../constants/Global.js';

/** @param {string} tag */
export function createSVG(tag) {
  return document.createElementNS(Global.SVG_NS, tag);
}

/** @param {Element} el */
export function setAttributes(el, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
}

/**
 * @param {string} tag
 * @param {Record<string, string|number>} [attrs]
 */
export function createElement(tag, attrs = {}) {
  const el = createSVG(tag);
  setAttributes(el, attrs);
  return el;
}

/** Рабочий `<g.workspace-block>`: атрибут + getAttribute (у SVG dataset ненадёжно; UUID может содержать % и /). */
export const ATTR_WORKSPACE_BLOCK_UUID = 'data-block-uuid';

/** @param {Element|null|undefined} element */
export function readWorkspaceBlockUUID(element) {
  if (!element || typeof element.getAttribute !== 'function') return '';
  return element.getAttribute(ATTR_WORKSPACE_BLOCK_UUID) || '';
}

/**
 * Разбор `transform="translate(tx, ty)"` у SVG-элемента.
 * @param {Element} element
 */
export function parseTranslateTransform(element) {
  const match = (element.getAttribute('transform') || '').match(
    /translate\(\s*([+-]?\d*\.?\d+)[,\s]+([+-]?\d*\.?\d+)\s*\)/
  );
  if (match) {
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
  }
  return { x: 0, y: 0 };
}

/**
 * Client rect с целочисленными шириной/высотой (раскладка коннекторов).
 * @param {Element} element
 */
export function getBoundingClientRectRounded(element) {
  const rect = element.getBoundingClientRect();
  const w = Math.floor(rect.width || 0);
  const h = Math.floor(rect.height || 0);
  let left = 0;
  if (rect.left != null) {
    left = rect.left;
  }
  let top = 0;
  if (rect.top != null) {
    top = rect.top;
  }
  return {
    left,
    top,
    right: left + w,
    bottom: top + h,
    width: w,
    height: h,
  };
}

/**
 * Координаты viewport → локальная система элемента (обратное к getScreenCTM).
 * @param {SVGGraphicsElement} element
 * @param {number} clientX
 * @param {number} clientY
 */
export function clientPointToElementLocal(element, clientX, clientY) {
  const svg = element.ownerSVGElement;
  if (
    !svg ||
    typeof svg.createSVGPoint !== 'function' ||
    typeof element.getScreenCTM !== 'function'
  ) {
    return null;
  }
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

/**
 * Разбор строки SVG path в массив команд `{ command, args }[]`.
 * @param {string} pathString
 */
export function parseSvgPath(pathString) {
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

/**
 * @param {Array<{ command: string, args: number[] }>} commands
 */
export function stringifyPath(commands) {
  return commands
    .map(cmd =>
      cmd.args.length === 0
        ? cmd.command
        : `${cmd.command}${cmd.args.join(',')}`
    )
    .join(' ');
}

/** @param {Array<{ command: string, args: number[] }>} commands */
function findCommandsByType(commands, type) {
  return commands
    .map((cmd, index) => ({ index, cmd }))
    .filter(({ cmd }) => cmd.command.toLowerCase() === type.toLowerCase());
}

/**
 * Изменение длины с сохранением знака (масштабирование сегментов path).
 * @param {number} value
 * @param {number} delta
 */
export function adjustValue(value, delta) {
  if (delta === 0) return value;
  const sign = Math.sign(value) || Math.sign(delta) || 1;
  const magnitude = Math.max(0, Math.abs(value) + delta);
  return sign * magnitude;
}

/**
 * Правка горизонтальных/вертикальных сегментов path.
 * @param {string} pathString
 * @param {{ horizontal?: number, vertical?: number, hIndices?: number[], vIndices?: number[] }} [config]
 */
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
          commands[idx].args[0] = adjustValue(
            commands[idx].args[0],
            horizontal
          );
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

/**
 * Индексы команд для `resizePath` по типу блока (библиотека / `config.size`).
 * Вертикальные ноги c-block совпадают с растяжением «рта» — см. `constants/constantsDefaults.js`.
 */
export const PATH_RESIZE_CONFIGS = {
  'start-block': { hIndices: [0, 1] },
  'c-block': {
    hIndices: [2, 3, 8, 10],
    vIndices: [...Global.C_BLOCK_INNER_STACK_VERTICAL_LEG_INDICES],
  },
  'default-block': { hIndices: [2, 3] },
  'stop-block': { hIndices: [2, 3] },
  'round-block': { hIndices: [0, 1] },
  'sharp-block': { hIndices: [0, 1] },
};

/** @param {string} blockType */
export function getResizeConfig(blockType) {
  return PATH_RESIZE_CONFIGS[blockType] || PATH_RESIZE_CONFIGS['default-block'];
}

/**
 * @param {SVGPathElement} pathEl
 * @param {number} [horizontal]
 * @param {number} [vertical]
 */
export function applyResizeToPathElement(pathEl, horizontal = 0, vertical = 0) {
  const blockType = pathEl.dataset.blockType;
  const config = getResizeConfig(blockType);
  const currentD = pathEl.getAttribute('d');
  const newD = resizePath(currentD, { horizontal, vertical, ...config });
  pathEl.setAttribute('d', newD);
}
