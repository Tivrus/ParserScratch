import * as SvgUtils from '../utils/SvgUtils.js';

/**
 * Appends <path> and <text> children into any SVG container element.
 * Shared between Block (workspace <g>) and BlockRenderer library <svg>.
 */
export function buildBlockContent(container, data) {
  container.appendChild(SvgUtils.createElement('path', {
    d: data.pathData,
    fill: data.fillColor,
    stroke: data.strokeColor,
    'stroke-width': 2,
    'stroke-linejoin': 'round'
  }));

  data.labels?.forEach(label => {
    const text = SvgUtils.createElement('text', {
      x: String(label.pos?.[0] ?? 0),
      y: String(label.pos?.[1] ?? 0),
      fill: '#ffffff',
      'font-size': '14',
      'font-weight': '600',
      'font-family': 'Arial, sans-serif',
      'dominant-baseline': 'middle',
      'pointer-events': 'none'
    });
    text.textContent = label.text || '';
    container.appendChild(text);
  });
}

export class Block {

  constructor(data, { blockUUID, x = 0, y = 0 } = {}) {
    this.blockUUID = blockUUID;
    this.blockId   = data.blockKey;
    this.type      = data.type;
    this.category  = data.category;

    this.el = this.#build(data, x, y);
  }

  // --- DOM ---

  #build(data, x, y) {
    const g = SvgUtils.createElement('g', {
      transform: `translate(${x}, ${y})`,
      class: 'workspace-block'
    });

    buildBlockContent(g, data);

    g.dataset.blockUUID = this.blockUUID;
    g.dataset.blockId   = this.blockId;
    g.dataset.type      = this.type;
    g.dataset.category  = this.category;

    return g;
  }

  // --- Public API ---

  moveTo(x, y) {
    this.el.setAttribute('transform', `translate(${x}, ${y})`);
  }

  attach(container) {
    container.appendChild(this.el);
    return this;
  }

  detach() {
    this.el.remove();
    return this;
  }
}
