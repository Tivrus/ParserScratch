// @ts-check

import {
  activateScratchDebugTracing,
  installScratchE2eDebug,
  resetWorkspaceFromPage,
} from '../helpers.js';

/**
 * Первая загрузка приложения (повтор при сетевых сбоях).
 *
 * @param {import('@playwright/test').Page} page
 */
export async function gotoApp(page) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 });
      return;
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, 400));
    }
  }
  throw lastError;
}

/**
 * Один цикл: init-скрипт E2E → загрузка → пустое полотно на сервере → reload → включить `__DEBUG__`.
 * Подключать в каждом spec: `test.beforeEach(editorE2eBeforeEach)`.
 *
 * @param {{ page: import('@playwright/test').Page }} fixtures
 */
export async function editorE2eBeforeEach({ page }) {
  await installScratchE2eDebug(page);
  await gotoApp(page);
  await resetWorkspaceFromPage(page);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.locator('#workspace').waitFor({ state: 'visible' });
  await page.locator('#category-list').waitFor({ state: 'visible' });
  await activateScratchDebugTracing(page);
}
