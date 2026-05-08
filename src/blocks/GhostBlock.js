import * as Global from '../constants/Global.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';

/** Силуэт блока без текста: превью при snap / перетаскивании. */
export class GhostBlock {
  constructor() {
    /** @type {SVGGElement | null} */
    this.element = null;
  }

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
    let pathDataAttribute = null;
    if (pathEl && typeof pathEl.getAttribute === 'function') {
      pathDataAttribute = pathEl.getAttribute('d');
    }
    if (!pathDataAttribute) return this;

    const group = /** @type {SVGGElement} */ (
      SvgUtils.createElement('g', {
        transform: `translate(${x}, ${y})`,
        class: 'ghost-block',
      })
    );
    this.#appendGhostPath(group, pathDataAttribute);
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

  dispose() {
    if (this.element) {
      this.element.remove();
    }
    this.element = null;
  }
}
