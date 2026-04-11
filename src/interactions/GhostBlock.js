import * as SvgUtils from '../utils/SvgUtils.js';
import { GHOST_BLOCK } from '../constans/Global.js';

// Semi-transparent SVG preview of a block (e.g. ghost block)
export class GhostBlock {
  constructor() {
    this.element = null;
  }

  #appendGhostPath(group, pathD) {
    group.appendChild(
      SvgUtils.createElement('path', {
        d: pathD,
        fill: GHOST_BLOCK.FILL_COLOR,
        stroke: GHOST_BLOCK.STROKE_COLOR,
        'stroke-width': 2,
        'stroke-linejoin': 'round',
      })
    );
  }

  // Creates a ghost block from block definition data
  createFromData(data, x = 0, y = 0) {
    this.dispose();
    if (!data?.pathData) return this;

    const group = SvgUtils.createElement('g', {
      transform: `translate(${x}, ${y})`,
      class: 'ghost-block',
    });
    this.#appendGhostPath(group, data.pathData);
    this.element = group;
    return this;
  }

  // Creates a ghost block from a live workspace block
  createFromElement(sourceBlockGroup, x = 0, y = 0) {
    this.dispose();
    if (!sourceBlockGroup) return this;

    const pathEl = sourceBlockGroup.querySelector(':scope > path');
    const d = pathEl?.getAttribute('d');
    if (!d) return this;

    const group = SvgUtils.createElement('g', {
      transform: `translate(${x}, ${y})`,
      class: 'ghost-block',
    });
    this.#appendGhostPath(group, d);
    this.element = group;
    return this;
  }

  setPosition(x, y) {
    if (this.element) {
      this.element.setAttribute('transform', `translate(${x}, ${y})`);
    }
  }

  attach(parent) {
    if (!this.element || !parent) return this;
    parent.appendChild(this.element);
    return this;
  }

  detach() {
    this.element?.remove();
  }

  dispose() {
    this.detach();
    this.element = null;
  }
}
