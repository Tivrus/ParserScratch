import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

/**
 * Экземпляр блока на полотне: `<g>` со стеком `parentUUID` / `nextUUID` (как в workspace.json).
 */
export class Block {
  /**
   * @param {object} data Данные из `prepareBlockData`.
   * @param {{ blockUUID?: string | null; x?: number; y?: number }} [placement]
   */
  constructor(data, placement = {}) {
    const { blockUUID = null, x = 0, y = 0 } = placement;
    this.blockKey = data.blockKey;
    this.type = data.type;
    this.category = data.category;
    this.blockUUID = blockUUID;
    this.x = x;
    this.y = y;

    this.parentUUID = null;
    this.nextUUID = null;
    this.topLevel = true;
    this.innerStackHeadUUID = null;

    /** @type {Array<import('./ConnectorZone.js').ConnectorZone>|null} */
    this.connectorZones = null;

    this.element = this.#buildElement(data);
  }

  #buildElement(data) {
    const group = /** @type {SVGGElement} */ (
      SvgUtils.createElement('g', {
        transform: `translate(${this.x}, ${this.y})`,
        class: 'workspace-block',
      })
    );

    Block.fillContent(group, data);

    group.setAttribute(
      SvgUtils.ATTR_WORKSPACE_BLOCK_UUID,
      String(this.blockUUID)
    );
    group.dataset.blockId = this.blockKey;
    group.dataset.type = this.type;
    group.dataset.category = this.category;

    return group;
  }

  /** Шаблон палитры: `<svg class="block-template">`. */
  static createLibrarySvg(data) {
    const svg = /** @type {SVGSVGElement} */ (
      SvgUtils.createElement('svg', {
        viewBox: data.viewBox,
        width: String(data.width),
        height: String(data.height),
        class: 'block-template',
      })
    );

    Object.assign(svg.style, {
      userSelect: 'none',
      webkitUserSelect: 'none',
      cursor: 'grab',
    });
    svg.setAttribute('unselectable', 'on');

    svg.dataset.blockId = data.blockKey;
    svg.dataset.category = data.category;
    svg.dataset.type = data.type;

    Block.fillContent(svg, data);
    return svg;
  }

  /** Путь и подписи для рабочего `<g>` и шаблона `<svg>`. */
  static fillContent(container, data) {
    container.appendChild(
      SvgUtils.createElement('path', {
        d: data.pathData,
        fill: data.fillColor,
        stroke: data.strokeColor,
        'stroke-width': 2,
        'stroke-linejoin': 'round',
        'data-block-type': data.type,
      })
    );

    if (data.labels && Array.isArray(data.labels)) {
      for (const label of data.labels) {
        let labelX = 0;
        let labelY = 0;
        if (label.pos && Array.isArray(label.pos)) {
          if (label.pos[0] != null) {
            labelX = Number(label.pos[0]);
          }
          if (label.pos[1] != null) {
            labelY = Number(label.pos[1]);
          }
        }
        const text = SvgUtils.createElement('text', {
          x: String(labelX),
          y: String(labelY),
          fill: '#ffffff',
          'font-size': '14',
          'font-weight': '600',
          'font-family': 'Arial, sans-serif',
          'dominant-baseline': 'middle',
          'pointer-events': 'none',
        });
        text.textContent = label.text || '';
        container.appendChild(text);
      }
    }
  }

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
