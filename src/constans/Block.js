import * as SvgUtils from '../utils/SvgUtils.js';

export class Block {

  constructor(data, { blockUUID = null, x = 0, y = 0 } = {}) {
    this.blockKey  = data.blockKey;
    this.type      = data.type;
    this.category  = data.category;
    this.blockUUID = blockUUID;
    this.x = x;
    this.y = y;

    // Script stack (mirrors workspace.json next / parent / topLevel)
    this.parentUUID = null;
    this.nextUUID = null;
    this.topLevel = true;

    this.element = this.#buildElement(data);
  }

  // --- Build ---
  #buildElement(data) {
    const group = SvgUtils.createElement('g', {
      transform: `translate(${this.x}, ${this.y})`,
      class: 'workspace-block',
    });

    Block.fillContent(group, data);

    group.setAttribute(SvgUtils.ATTR_WORKSPACE_BLOCK_UUID, String(this.blockUUID));
    group.dataset.blockId   = this.blockKey;
    group.dataset.type      = this.type;
    group.dataset.category  = this.category;

    return group;
  }

  // Sidebar template: <svg class="block-template"> with drag-friendly styles
  static createLibrarySvg(data) {
    const svg = SvgUtils.createElement('svg', {
      viewBox: data.viewBox,
      width: String(data.width),
      height: String(data.height),
      class: 'block-template',
    });

    Object.assign(svg.style, {
      userSelect: 'none',
      webkitUserSelect: 'none',
      cursor: 'grab',
    });
    svg.setAttribute('unselectable', 'on');

    svg.dataset.blockId  = data.blockKey;
    svg.dataset.category = data.category;
    svg.dataset.type     = data.type;

    Block.fillContent(svg, data);
    return svg;
  }

  /**
   * Appends path + label text nodes to any SVG container.
   * Used by both workspace Block and library template <svg>.
   */
  static fillContent(container, data) {
    container.appendChild(SvgUtils.createElement('path', {
      d: data.pathData,
      fill: data.fillColor,
      stroke: data.strokeColor,
      'stroke-width': 2,
      'stroke-linejoin': 'round',
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
        'pointer-events': 'none',
      });
      text.textContent = label.text || '';
      container.appendChild(text);
    });
  }

  // --- API ---
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.element.setAttribute('transform', `translate(${x}, ${y})`);
  }

  mount(svgContainer) {
    svgContainer.appendChild(this.element);
    return this;
  }

  remove() {
    this.element.remove();
  }
}
