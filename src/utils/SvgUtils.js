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



//=======================
//   2. Path-утилиты    
//=======================

// Парсит SVG path string в массив команд
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

// Собирает команды обратно в строку
function stringifyPath(commands) {
  return commands
    .map(cmd => cmd.args.length === 0 
      ? cmd.command 
      : `${cmd.command}${cmd.args.join(',')}`)
    .join(' ');
}

// Находит все команды заданного типа (например, 'h', 'v')
function findCommandsByType(commands, type) {
  return commands
    .map((cmd, index) => ({ index, cmd }))
    .filter(({ cmd }) => cmd.command.toLowerCase() === type.toLowerCase());
}

// Корректирует значение с сохранением знака (для ресайза)
function adjustValue(value, delta) {
  if (delta === 0) return value;
  const sign = Math.sign(value) || Math.sign(delta) || 1;
  const magnitude = Math.max(0, Math.abs(value) + delta);
  return sign * magnitude;
}

// Изменяет длину горизонтальных/вертикальных сегментов пути
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

// Возвращает конфигурацию ресайза для типа блока
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



//=======================
//   3. Утилиты высокого уровня (для динамического ресайза)
//=======================

// Создаёт path-элемент с возможностью ресайза
export function createResizablePath(blockType, initialPath, color) {
  const pathEl = createElement('path', {
    d: initialPath,
    fill: color,
    stroke: darkenColor(color),
    'stroke-width': 2,
    'stroke-linejoin': 'round'
  });
  pathEl.dataset.blockType = blockType;
  return pathEl;
}

// Применяет ресайз к уже существующему path-элементу
export function applyResizeToPathElement(pathEl, horizontal = 0, vertical = 0) {
  const blockType = pathEl.dataset.blockType;
  const config = getResizeConfig(blockType);
  const currentD = pathEl.getAttribute('d');
  const newD = resizePath(currentD, { horizontal, vertical, ...config });
  pathEl.setAttribute('d', newD);
}