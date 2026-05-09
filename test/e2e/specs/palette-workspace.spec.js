// @ts-check
import { test, expect } from '@playwright/test';
import { editorE2eBeforeEach } from '../fixtures/editorLifecycle.js';
import {
  dragBlockTemplateToClientPoint,
  dragWorkspaceBlockToClientPoint,
  getScratchCallHistory,
  resetScratchCallHistory,
  selectCategory,
  workspaceBlocks,
} from '../helpers.js';

test.beforeEach(editorE2eBeforeEach);

test.describe('Палитра и полотно', () => {
  test('спавн категорий: список категорий отрисован с ожидаемыми ключами', async ({
    page,
  }) => {
    const items = page.locator('#category-list .category-item');
    await expect(items).toHaveCount(5);
    const keys = await items.evaluateAll(nodes =>
      nodes.map(n => n.getAttribute('data-key'))
    );
    expect(keys.sort()).toEqual(
      ['Control', 'Events', 'Looks', 'Motion', 'Sound'].sort()
    );
  });

  test('спавн блоков: после выбора Motion в палитре появляются шаблоны блоков', async ({
    page,
  }) => {
    await selectCategory(page, 'Motion');
    const templates = page.locator('#block-templates svg.block-template');
    await expect(templates.first()).toBeVisible();
    const count = await templates.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(
      page.locator('#block-templates svg.block-template[data-block-id="motion_start"]')
    ).toBeVisible();
  });

  test('перетаскивание шаблона в рабочую область создаёт workspace-блок', async ({
    page,
  }) => {
    await selectCategory(page, 'Motion');
    const ws = page.locator('#workspace');
    const box = await ws.boundingBox();
    if (!box) throw new Error('workspace box');
    const before = await workspaceBlocks(page).count();
    await dragBlockTemplateToClientPoint(
      page,
      'motion_start',
      box.x + box.width * 0.55,
      box.y + box.height * 0.45
    );
    await expect(workspaceBlocks(page)).toHaveCount(before + 1);
    await expect(
      page.locator(
        '#block-world-root g.workspace-block[data-block-id="motion_start"]'
      )
    ).toHaveCount(1);
  });

  test('удаление блока перетаскиванием на корзину вызывает deleteWorkspaceChain', async ({
    page,
  }) => {
    await selectCategory(page, 'Motion');
    const ws = page.locator('#workspace');
    const wbox = await ws.boundingBox();
    if (!wbox) throw new Error('workspace box');
    await dragBlockTemplateToClientPoint(
      page,
      'motion_start',
      wbox.x + wbox.width * 0.5,
      wbox.y + wbox.height * 0.4
    );
    const block = workspaceBlocks(page).first();
    await expect(block).toBeVisible();
    await resetScratchCallHistory(page);
    const trash = page.locator('#trash-can');
    const tbox = await trash.boundingBox();
    if (!tbox) throw new Error('trash box');
    await dragWorkspaceBlockToClientPoint(
      page,
      block,
      tbox.x + tbox.width / 2,
      tbox.y + tbox.height / 2
    );
    await expect(workspaceBlocks(page)).toHaveCount(0, { timeout: 5000 });
    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      return h.some(e => e.tag === 'deleteWorkspaceChain');
    }).toBe(true);
    const del = (await getScratchCallHistory(page)).find(e => e.tag === 'deleteWorkspaceChain');
    expect(del && del.detail && typeof del.detail === 'object').toBeTruthy();
    const detail = /** @type {{ headKeys?: string[]; removedCount?: number }} */ (
      del.detail
    );
    expect(detail.headKeys).toContain('motion_start');
    expect(detail.removedCount).toBeGreaterThanOrEqual(1);
  });

  test('удаление блока на sidebar вызывает deleteWorkspaceChain', async ({ page }) => {
    await selectCategory(page, 'Motion');
    const ws = page.locator('#workspace');
    const wbox = await ws.boundingBox();
    if (!wbox) throw new Error('workspace box');
    await dragBlockTemplateToClientPoint(
      page,
      'motion_move_steps',
      wbox.x + wbox.width * 0.52,
      wbox.y + wbox.height * 0.42
    );
    const block = workspaceBlocks(page).first();
    await expect(block).toBeVisible();
    await resetScratchCallHistory(page);
    const sidebar = page.locator('#sidebar');
    const sbox = await sidebar.boundingBox();
    if (!sbox) throw new Error('sidebar box');
    await dragWorkspaceBlockToClientPoint(
      page,
      block,
      sbox.x + sbox.width / 2,
      sbox.y + sbox.height / 2
    );
    await expect(workspaceBlocks(page)).toHaveCount(0, { timeout: 5000 });
    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      return h.some(e => e.tag === 'deleteWorkspaceChain');
    }).toBe(true);
  });
});
