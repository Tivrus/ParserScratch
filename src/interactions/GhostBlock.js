import * as SvgUtils from '../utils/SvgUtils.js';
import * as Global from '../constans/Global.js';

// Monotone silhouette of a block (labels omitted). Used for snap preview / drag hints.
export class GhostBlock {
  constructor() {
    this.element = null;
  }

  // --- Build ---
  #appendGhostPath(group, pathD) {
    group.appendChild(
      SvgUtils.createElement('path', {
        d: pathD,
        fill: Global.GHOST_BLOCK.FILL_COLOR,
        stroke: Global.GHOST_BLOCK.STROKE_COLOR,
        'stroke-width': 2,
        'stroke-linejoin': 'round',
      })
    );
  }

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

  // --- API ---
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

  dispose() {
    this.element?.remove();
    this.element = null;
  }
}
