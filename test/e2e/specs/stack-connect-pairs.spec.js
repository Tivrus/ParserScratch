// @ts-check
import { test, expect } from '@playwright/test';
import { editorE2eBeforeEach } from '../fixtures/editorLifecycle.js';
import {
  dragBlockTemplateToClientPoint,
  getBlockLinkSnapshot,
  getScratchCallHistory,
  resetScratchCallHistory,
  selectCategory,
  workspaceBlockByDataId,
  workspaceBlocks,
  workspaceStackDropClientPoint,
} from '../helpers.js';
import {
  assertStackAbove,
  assertStackBelow,
  lastOkStackConnectDetail,
} from '../lib/stackGraphAssertions.js';
import { STACK_CONNECT_PAIR_CASES } from '../lib/stackConnectPairCases.js';

test.beforeEach(editorE2eBeforeEach);

test.describe('Стековые пары (якорь на полотне, с палитры — второй блок)', () => {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} category
   * @param {string} blockId
   */
  async function dropAnchorCenter(page, category, blockId) {
    await selectCategory(page, category);
    const ws = page.locator('#workspace');
    const wbox = await ws.boundingBox();
    if (!wbox) throw new Error('workspace box');
    const cx = wbox.x + wbox.width * 0.5;
    const cy = wbox.y + wbox.height * 0.42;
    await dragBlockTemplateToClientPoint(page, blockId, cx, cy);
    return workspaceBlockByDataId(page, blockId);
  }

  for (const p of STACK_CONNECT_PAIR_CASES) {
    test(p.title, async ({ page }) => {
      const anchorLoc = await dropAnchorCenter(page, p.anchorCategory, p.anchorId);
      await expect(anchorLoc).toBeVisible();
      const anchorUuid = await anchorLoc.getAttribute('data-block-uuid');
      if (!anchorUuid) throw new Error('anchor uuid');

      await resetScratchCallHistory(page);
      await selectCategory(page, p.dragCategory);
      const { x, y } = await workspaceStackDropClientPoint(page, anchorLoc, p.relation);
      await dragBlockTemplateToClientPoint(page, p.dragId, x, y);

      await expect(workspaceBlocks(page)).toHaveCount(2);
      await expect.poll(async () => {
        const h = await getScratchCallHistory(page);
        return lastOkStackConnectDetail(h, p.expectedSnapMode) != null;
      }).toBe(true);

      const snap = await getBlockLinkSnapshot(page);
      const dragUuid = await workspaceBlockByDataId(page, p.dragId).getAttribute('data-block-uuid');
      if (!dragUuid) throw new Error('drag uuid');

      if (p.relation === 'below') {
        assertStackBelow(snap, anchorUuid, dragUuid);
      } else {
        assertStackAbove(snap, anchorUuid, dragUuid);
      }
    });
  }
});
