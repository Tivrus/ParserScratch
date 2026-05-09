// @ts-check

/**
 * Флаги и API для E2E: до загрузки приложения (через `addInitScript`).
 *
 * @param {import('@playwright/test').Page} page
 */
export async function installScratchE2eDebug(page) {
  await page.addInitScript(() => {
    globalThis.__SCRATCH_E2E_SUPPRESS_CONNECTOR__ = true;
    globalThis.__SCRATCH_CALL_HISTORY__ = [];

    const originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      let requestUrl = '';
      if (typeof input === 'string') {
        requestUrl = input;
      } else if (input && typeof input === 'object' && 'url' in input) {
        requestUrl = String(/** @type {{ url: string }} */ (input).url);
      }
      const isWorkspaceApi =
        requestUrl.includes('/api/save-workspace') ||
        requestUrl.includes('/api/load-workspace');
      if (!isWorkspaceApi) {
        return originalFetch(input, init);
      }
      const baseInit = init && typeof init === 'object' ? init : {};
      const headers = new Headers(
        baseInit.headers != null ? baseInit.headers : undefined
      );
      headers.set('X-Scratch-E2E', '1');
      return originalFetch(input, { ...baseInit, headers });
    };
  });
}

/**
 * После инициализации редактора: включить `__DEBUG__` (журнал вызовов) и очистить историю.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function activateScratchDebugTracing(page) {
  await page.waitForFunction(
    () => typeof window.__SCRATCH_resetCallHistory === 'function',
    { timeout: 30_000 }
  );
  await page.evaluate(() => {
    if (window.__SCRATCH_resetCallHistory) {
      window.__SCRATCH_resetCallHistory();
    }
    window.__DEBUG__ = true;
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function resetScratchCallHistory(page) {
  await page.evaluate(() => {
    if (window.__SCRATCH_resetCallHistory) {
      window.__SCRATCH_resetCallHistory();
    }
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{ t: number; tag: string; detail: unknown }>>}
 */
export async function getScratchCallHistory(page) {
  return page.evaluate(() =>
    Array.isArray(globalThis.__SCRATCH_CALL_HISTORY__)
      ? globalThis.__SCRATCH_CALL_HISTORY__.map(e => ({
          t: e.t,
          tag: e.tag,
          detail: e.detail,
        }))
      : []
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function getBlockLinkSnapshot(page) {
  return page.evaluate(() => {
    const fn = window.__SCRATCH_getBlockLinkSnapshot;
    return fn ? fn() : {};
  });
}

/**
 * Точка клиента для stack-snap относительно уже размещённого блока.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} anchorBlock
 * @param {'below' | 'above'} relation
 */
export async function workspaceStackDropClientPoint(page, anchorBlock, relation) {
  const ws = page.locator('#workspace');
  const wbox = await ws.boundingBox();
  const bb = await anchorBlock.boundingBox();
  if (!wbox || !bb) {
    throw new Error('workspaceStackDropClientPoint: missing bounding box');
  }
  const cx = bb.x + bb.width / 2;
  const wBottom = wbox.y + wbox.height;
  const bbBottom = bb.y + bb.height;
  if (relation === 'below') {
    const y = clampPx(bbBottom + 36, wbox.y + 10, wBottom - 20);
    return { x: cx, y };
  }
  const y = clampPx(bb.y - 36, wbox.y + 20, wBottom - 10);
  return { x: cx, y };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} blockId
 */
export function workspaceBlocksByDataId(page, blockId) {
  return page.locator(`#block-world-root g.workspace-block[data-block-id="${blockId}"]`);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} blockId
 * @param {number} index с нуля (порядок в DOM при нескольких одинаковых `data-block-id`)
 */
export function workspaceBlockByDataIdNth(page, blockId, index) {
  return workspaceBlocksByDataId(page, blockId).nth(index);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} blockId
 */
export function workspaceBlockByDataId(page, blockId) {
  return workspaceBlocksByDataId(page, blockId).first();
}

/**
 * Клиентские координаты в зоне «шва» между двумя вертикально стыкованными блоками (middle / cap snap).
 *
 * @param {import('@playwright/test').Locator} upperBlock
 * @param {import('@playwright/test').Locator} lowerBlock
 */
export async function clientPointStackSeamBetween(upperBlock, lowerBlock) {
  const upperBox = await upperBlock.boundingBox();
  const lowerBox = await lowerBlock.boundingBox();
  if (!upperBox || !lowerBox) {
    throw new Error('clientPointStackSeamBetween: missing bounding box');
  }
  const centerX = upperBox.x + upperBox.width / 2;
  const seamY = (upperBox.y + upperBox.height + lowerBox.y) / 2;
  return { x: centerX, y: seamY };
}

/**
 * Построить вертикальный стек из шаблонов: первый в точке (fraction), дальше каждый «ниже» хвоста.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array<{ blockId: string; category: string }>} segments
 * @param {{ xFraction?: number; yFraction?: number }} [placement]
 * @returns {Promise<import('@playwright/test').Locator>} локатор **последнего** блока (хвост по `blockId`)
 */
export async function spawnWorkspaceTemplateStack(page, segments, placement = {}) {
  const xFraction = placement.xFraction ?? 0.48;
  const yFraction = placement.yFraction ?? 0.34;
  const ws = page.locator('#workspace');
  const wbox = await ws.boundingBox();
  if (!wbox) {
    throw new Error('spawnWorkspaceTemplateStack: workspace box missing');
  }
  const cx0 = wbox.x + wbox.width * xFraction;
  const cy0 = wbox.y + wbox.height * yFraction;
  /** @type {import('@playwright/test').Locator | null} */
  let tailLocator = null;
  for (let index = 0; index < segments.length; index++) {
    const { blockId, category } = segments[index];
    await selectCategory(page, category);
    if (index === 0) {
      await dragBlockTemplateToClientPoint(page, blockId, cx0, cy0);
      tailLocator = workspaceBlocksByDataId(page, blockId).last();
    } else {
      if (!tailLocator) {
        throw new Error('spawnWorkspaceTemplateStack: tail locator missing');
      }
      const drop = await workspaceStackDropClientPoint(page, tailLocator, 'below');
      await dragBlockTemplateToClientPoint(page, blockId, drop.x, drop.y);
      tailLocator = workspaceBlocksByDataId(page, blockId).last();
    }
    await tailLocator.waitFor({ state: 'visible' });
  }
  if (!tailLocator) {
    throw new Error('spawnWorkspaceTemplateStack: empty segments');
  }
  return tailLocator;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clampPx(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * Перетаскивание шаблона с палитры в точку **клиентских** координат (px на экране).
 * Соответствует цепочке mousedown → mousemove → mouseup, которую обрабатывает GrabManager.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} blockId значение `data-block-id` у `svg.block-template`
 * @param {number} clientX
 * @param {number} clientY
 */
export async function dragBlockTemplateToClientPoint(page, blockId, clientX, clientY) {
  const template = page.locator(`#block-templates svg.block-template[data-block-id="${blockId}"]`).first();
  await template.waitFor({ state: 'visible' });
  const tb = await template.boundingBox();
  if (!tb) throw new Error('template bounding box missing');
  const startX = tb.x + tb.width / 2;
  const startY = tb.y + tb.height / 2;
  const viewport = page.viewportSize();
  const vw = viewport ? viewport.width : 1280;
  const vh = viewport ? viewport.height : 720;
  const endX = clampPx(clientX, 0, vw - 1);
  const endY = clampPx(clientY, 0, vh - 1);
  await page.mouse.move(clampPx(startX, 0, vw - 1), clampPx(startY, 0, vh - 1));
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 16 });
  await page.mouse.move(endX, endY);
  await page.mouse.up();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} uuid
 */
export function workspaceBlockByUuid(page, uuid) {
  return page.locator(
    `#block-world-root g.workspace-block[data-block-uuid="${uuid}"]`
  );
}

/**
 * Перетаскивание блока с полотна (`g.workspace-block`) в точку клиента.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} blockLocator
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ moveSteps?: number }} [options]
 */
export async function dragWorkspaceBlockToClientPoint(
  page,
  blockLocator,
  clientX,
  clientY,
  options = {}
) {
  const moveSteps = options.moveSteps ?? 16;
  const bb = await blockLocator.first().boundingBox();
  if (!bb) throw new Error('workspace block bounding box missing');
  const startX = bb.x + bb.width / 2;
  const startY = bb.y + bb.height / 2;
  const viewport = page.viewportSize();
  const vw = viewport ? viewport.width : 1280;
  const vh = viewport ? viewport.height : 720;
  const endX = clampPx(clientX, 0, vw - 1);
  const endY = clampPx(clientY, 0, vh - 1);
  await page.mouse.move(clampPx(startX, 0, vw - 1), clampPx(startY, 0, vh - 1));
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: moveSteps });
  await page.mouse.move(endX, endY);
  await page.mouse.up();
}

/**
 * Активировать категорию по `data-key` у `.category-item`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} categoryKey например `Motion`
 */
export async function selectCategory(page, categoryKey) {
  const row = page.locator(`#category-list .category-item[data-key="${categoryKey}"]`).first();
  await row.click();
}

/**
 * Сохранить на сервере пустое полотно (через fetch в контексте страницы — тот же origin, что и приложение).
 *
 * @param {import('@playwright/test').Page} page
 */
export async function resetWorkspaceFromPage(page) {
  const ok = await page.evaluate(async () => {
    const response = await fetch('/api/save-workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: {},
        camera: { x: 0, y: 0 },
        modes: { cameraInertia: false, blockGridSnap: false },
      }),
    });
    return response.ok;
  });
  if (!ok) {
    throw new Error('reset workspace: POST /api/save-workspace failed');
  }
}

/**
 * Все блоки на полотне (`#block-world-root` → `g.workspace-block`).
 *
 * @param {import('@playwright/test').Page} page
 */
export function workspaceBlocks(page) {
  return page.locator('#block-world-root g.workspace-block');
}
