import * as StackChainDrag from '../blocks/StackChainDrag.js';
import * as Global from '../constants/Global.js';
import * as CBlockMath from '../calculations/CBlockMath.js';
import * as InnerStackAcc from '../calculations/innerStackNominalHeightAccumulation.js';
import { clampNonNegative } from '../infrastructure/math/MathUtils.js';
import * as SvgUtils from '../infrastructure/svg/SvgUtils.js';
import {
  buildCBlockInnerStackStretchedPathD,
  buildCBlockInnerStackStretchedPathDWithFixedPerLeg,
} from './cBlockInnerStackPathStretch.js';

/**
 * Высота силуэта как у GhostBlock: bbox первого дочернего `<path>`, иначе bbox группы.
 * @param {SVGGraphicsElement|null|undefined} draggedElement
 * @returns {number}
 */
function silhouetteHeightPx(draggedElement) {
  if (!draggedElement) return 0;
  try {
    let pathEl = null;
    if (typeof draggedElement.querySelector === 'function') {
      pathEl = /** @type {SVGPathElement|null} */ (
        draggedElement.querySelector(':scope > path')
      );
    }
    if (pathEl && typeof pathEl.getBBox === 'function') {
      const { height } = pathEl.getBBox();
      if (Number.isFinite(height) && height > 0) return height;
    }
    if (typeof draggedElement.getBBox === 'function') {
      const { height } = draggedElement.getBBox();
      if (Number.isFinite(height) && height > 0) return height;
    }
  } catch {
    return 0;
  }
  return 0;
}

/**
 * Вертикальный «бюджет» растяжения top-inner превью: совпадает с высотой пути призрака.
 * @param {SVGGraphicsElement|null|undefined} draggedElement
 * @returns {number}
 */
export function cBlockTopInnerStretchDeltaY(draggedElement) {
  return clampNonNegative(silhouetteHeightPx(draggedElement));
}

/**
 * Превью prepend в top-inner: дополнительный сдвиг вниз для **внутренних** блоков относительно
 * слота призрака (`силуэт − CONNECTOR_SOCKET_HEIGHT − START_BLOCK_NORMAL_STACK_EXTRA_Y`).
 * Растяжение пути использует полную высоту призрака через {@link buildStretchedCBlockPathDFromGhostHeight}.
 * @param {SVGGraphicsElement|null|undefined} draggedElement
 * @returns {number}
 */
export function cBlockTopInnerPrependPreviewShiftY(draggedElement) {
  const h = silhouetteHeightPx(draggedElement);
  if (!Number.isFinite(h) || h <= 0) return 0;
  return CBlockMath.prependPreviewShiftClampedPx(h);
}

/**
 * Сдвиг мира для **уже существующей** внутренней цепочки при превью prepend в top-inner
 * (позиция призрака считается отдельно). Для `stop-block` цепочка смещается ещё на
 * `CONNECTOR_SOCKET_HEIGHT` вниз, чтобы очистить «шапку» призрака.
 * @param {SVGGraphicsElement|null|undefined} draggedElement
 * @param {string|undefined} draggedBlockType
 * @returns {number}
 */
export function cBlockTopInnerPrependInnerStackSpreadY(
  draggedElement,
  draggedBlockType
) {
  const base = cBlockTopInnerPrependPreviewShiftY(draggedElement);
  return CBlockMath.prependInnerStackSpreadTotalPx(base, draggedBlockType);
}

/**
 * Превью при snap: растягивает «рот» внутреннего стека; вертикальный бюджет = полная высота
 * силуэта призрака; каждая из двух ног `v` получает `ghostHeightPx / 2`.
 * @param {string|undefined} basePathD
 * @param {number} ghostHeightPx
 * @returns {string|undefined}
 */
export function buildStretchedCBlockPathDFromGhostHeight(basePathD, ghostHeightPx) {
  if (!basePathD || !Number.isFinite(ghostHeightPx) || ghostHeightPx <= 0) {
    return basePathD;
  }
  return buildCBlockInnerStackStretchedPathDWithFixedPerLeg(
    basePathD,
    CBlockMath.ghostHeightPerVerticalLegPx(ghostHeightPx)
  );
}

/**
 * Явное растяжение пути внутреннего стека; `draggedBlockType` выбирает формулу на ногу.
 * @param {string|undefined} basePathD
 * @param {number} ghostPathHeightPx
 * @param {string|undefined} draggedBlockType
 * @returns {string|undefined}
 */
export function buildStretchedCBlockPathD(
  basePathD,
  ghostPathHeightPx,
  draggedBlockType
) {
  if (!basePathD || ghostPathHeightPx <= 0) {
    return basePathD;
  }
  return buildCBlockInnerStackStretchedPathD(
    basePathD,
    ghostPathHeightPx,
    draggedBlockType
  );
}

/**
 * @param {import('../blocks/Block.js').Block|{ element?: SVGElement }} block
 * @returns {SVGPathElement|null}
 */
export function getWorkspaceBlockPathElement(block) {
  if (!block || !block.element || typeof block.element.querySelector !== 'function') {
    return null;
  }
  const pathNode = block.element.querySelector(':scope > path');
  if (!(pathNode instanceof SVGPathElement)) {
    return null;
  }
  return pathNode;
}

/**
 * Номинальная высота внутреннего стека по подготовленным высотам блоков и перекрытию стека
 * (стабильно до раскладки в DOM).
 * @param {Map<string, import('../blocks/Block.js').Block>} blockRegistry
 * @param {import('../blocks/Block.js').Block|null|undefined} innerHead
 * @param {(blockKey: string) => object|null|undefined} prepareBlockData
 * @returns {number}
 */
export function measureInnerStackNominalHeightPx(
  blockRegistry,
  innerHead,
  prepareBlockData
) {
  if (!innerHead || typeof prepareBlockData !== 'function') {
    return 0;
  }
  const chain = StackChainDrag.collectChainBlocksFromHead(
    blockRegistry,
    innerHead
  );
  if (!chain.length) {
    return 0;
  }
  const orderedHeightsPx = [];
  for (let i = 0; i < chain.length; i++) {
    const blockData = prepareBlockData(chain[i].blockKey);
    let blockHeight = Global.DEFAULT_BLOCK_HEIGHT;
    if (
      blockData &&
      blockData.height != null &&
      Number.isFinite(Number(blockData.height)) &&
      Number(blockData.height) > 0
    ) {
      blockHeight = Number(blockData.height);
    }
    orderedHeightsPx.push(blockHeight);
  }
  return clampNonNegative(
    InnerStackAcc.accumulateStackedBlockHeightsPx(orderedHeightsPx)
  );
}

/**
 * Вертикальный охват внутреннего стека в мировых координатах (голова … хвост),
 * по bbox каждого блока и translate.
 * @param {Map<string, import('../blocks/Block.js').Block>} blockRegistry
 * @param {import('../blocks/Block.js').Block|null|undefined} innerHead
 * @returns {number}
 */
export function measureInnerStackWorldHeightPx(blockRegistry, innerHead) {
  if (!innerHead || !innerHead.element || typeof innerHead.element.getBBox !== 'function') {
    return 0;
  }
  let minY = Infinity;
  let maxY = -Infinity;
  for (const b of StackChainDrag.collectChainBlocksFromHead(
    blockRegistry,
    innerHead
  )) {
    if (!b || !b.element || typeof b.element.getBBox !== 'function') {
      continue;
    }
    try {
      const bb = b.element.getBBox();
      const { y: ty } = SvgUtils.parseTranslateTransform(b.element);
      const top = ty + bb.y;
      const bottom = ty + bb.y + bb.height;
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    } catch {
      return 0;
    }
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return 0;
  }
  return clampNonNegative(maxY - minY);
}

/**
 * Рабочая c-block: выставить `<path d>` в базовую форму или растянуть «рот» под внутренний стек.
 * Вызывать до пересборки коннекторов, чтобы зоны совпадали с путём.
 * @param {Map<string, import('../blocks/Block.js').Block>} blockRegistry
 * @param {import('../blocks/Block.js').Block} cBlock
 * @param {(blockKey: string) => object|null|undefined} prepareBlockData
 */
export function applyWorkspaceCBlockInnerStretch(
  blockRegistry,
  cBlock,
  prepareBlockData
) {
  const pathEl = getWorkspaceBlockPathElement(cBlock);
  if (!pathEl || typeof prepareBlockData !== 'function') {
    return;
  }
  const data = prepareBlockData(cBlock.blockKey);
  let basePathD = null;
  if (data && data.pathData !== undefined) {
    basePathD = data.pathData;
  }
  if (typeof basePathD !== 'string' || !basePathD) {
    return;
  }

  let innerHeightPx = 0;
  let headType;
  if (cBlock.innerStackHeadUUID) {
    const innerHead = blockRegistry.get(cBlock.innerStackHeadUUID);
    if (innerHead) {
      headType = innerHead.type;
      innerHeightPx = measureInnerStackNominalHeightPx(
        blockRegistry,
        innerHead,
        prepareBlockData
      );
    }
  }

  if (innerHeightPx <= 0) {
    pathEl.setAttribute('d', basePathD);
    return;
  }
  pathEl.setAttribute(
    'd',
    buildCBlockInnerStackStretchedPathD(basePathD, innerHeightPx, headType)
  );
}
