// @ts-check
import { test, expect } from '@playwright/test';
import { editorE2eBeforeEach } from '../fixtures/editorLifecycle.js';
import {
  clientPointStackSeamBetween,
  dragBlockTemplateToClientPoint,
  dragWorkspaceBlockToClientPoint,
  getBlockLinkSnapshot,
  getScratchCallHistory,
  resetScratchCallHistory,
  selectCategory,
  spawnWorkspaceTemplateStack,
  workspaceBlockByDataId,
  workspaceBlockByUuid,
  workspaceBlocks,
  workspaceBlocksByDataId,
  workspaceStackDropClientPoint,
} from '../helpers.js';
import {
  assertParentChildLink,
  assertStackBelow,
  lastOkStackConnectDetail,
  lastOkStackConnectDetailAnyMode,
  stackTailUuidFromHeadSnapshot,
} from '../lib/stackGraphAssertions.js';

test.beforeEach(editorE2eBeforeEach);

/** Четыре разных default-block из палитры (Motion + Control). */
const FOUR_DEFAULT_STACK = [
  { blockId: 'motion_move_steps', category: 'Motion' },
  { blockId: 'turn_right_steps', category: 'Motion' },
  { blockId: 'turn_left_steps', category: 'Motion' },
  { blockId: 'motion_smth', category: 'Control' },
];

/**
 * @param {Record<string, any>} snap
 * @param {string} blockKey
 */
function uuidByBlockKey(snap, blockKey) {
  for (const node of Object.values(snap)) {
    if (node && node.blockKey === blockKey) {
      return node.blockUUID;
    }
  }
  return null;
}

test.describe('Цепочки: перемещение и разрезание', () => {
  test('перемещение цепочки за голову: связи A→B→C сохраняются', async ({
    page,
  }) => {
    await spawnWorkspaceTemplateStack(page, [
      { blockId: 'motion_move_steps', category: 'Motion' },
      { blockId: 'turn_right_steps', category: 'Motion' },
      { blockId: 'turn_left_steps', category: 'Motion' },
    ]);
    await expect(workspaceBlocks(page)).toHaveCount(3);

    const headLoc = workspaceBlocksByDataId(page, 'motion_move_steps').first();
    const headBox = await headLoc.boundingBox();
    const ws = page.locator('#workspace');
    const wbox = await ws.boundingBox();
    if (!headBox || !wbox) throw new Error('boxes');
    const targetX = clamp(headBox.x + 200, wbox.x + 24, wbox.x + wbox.width - 24);
    const targetY = clamp(headBox.y + headBox.height / 2, wbox.y + 24, wbox.y + wbox.height - 24);

    await resetScratchCallHistory(page);
    await dragWorkspaceBlockToClientPoint(page, headLoc, targetX, targetY, {
      moveSteps: 24,
    });

    const snap = await getBlockLinkSnapshot(page);
    const moveUuid = (await workspaceBlocksByDataId(page, 'motion_move_steps').first().getAttribute(
      'data-block-uuid'
    ));
    const rightUuid = uuidByBlockKey(snap, 'turn_right_steps');
    const leftUuid = uuidByBlockKey(snap, 'turn_left_steps');
    if (!moveUuid || !rightUuid || !leftUuid) throw new Error('uuid');
    assertParentChildLink(snap, moveUuid, rightUuid);
    assertParentChildLink(snap, rightUuid, leftUuid);
  });

  test('разрезание стека при захвате не с головы: верх остаётся, низ уезжает', async ({
    page,
  }) => {
    await spawnWorkspaceTemplateStack(page, [
      { blockId: 'motion_move_steps', category: 'Motion' },
      { blockId: 'turn_right_steps', category: 'Motion' },
      { blockId: 'turn_left_steps', category: 'Motion' },
    ]);
    const middleBlock = workspaceBlockByDataId(page, 'turn_right_steps');
    const midBox = await middleBlock.boundingBox();
    const ws = page.locator('#workspace');
    const wbox = await ws.boundingBox();
    if (!midBox || !wbox) throw new Error('boxes');
    const targetX = clamp(wbox.x + wbox.width * 0.82, wbox.x + 16, wbox.x + wbox.width - 16);
    const targetY = clamp(midBox.y + midBox.height / 2, wbox.y + 16, wbox.y + wbox.height - 16);

    await dragWorkspaceBlockToClientPoint(page, middleBlock, targetX, targetY, {
      moveSteps: 24,
    });

    await expect(workspaceBlocks(page)).toHaveCount(3);
    const snap = await getBlockLinkSnapshot(page);
    const moveUuid = uuidByBlockKey(snap, 'motion_move_steps');
    const rightUuid = uuidByBlockKey(snap, 'turn_right_steps');
    const leftUuid = uuidByBlockKey(snap, 'turn_left_steps');
    if (!moveUuid || !rightUuid || !leftUuid) throw new Error('uuid');

    expect(snap[moveUuid].nextUUID).toBeNull();
    expect(snap[moveUuid].parentUUID).toBeNull();
    expect(snap[rightUuid].parentUUID).toBeNull();
    expect(snap[rightUuid].nextUUID).toBe(leftUuid);
    expect(snap[leftUuid].parentUUID).toBe(rightUuid);
  });
});

test.describe('Вставка в середину стека', () => {
  test('default-block в middle между двумя звеньями', async ({ page }) => {
    await spawnWorkspaceTemplateStack(page, [
      { blockId: 'motion_move_steps', category: 'Motion' },
      { blockId: 'turn_right_steps', category: 'Motion' },
    ]);
    const upper = workspaceBlockByDataId(page, 'motion_move_steps');
    const lower = workspaceBlockByDataId(page, 'turn_right_steps');
    const { x, y } = await clientPointStackSeamBetween(upper, lower);

    await resetScratchCallHistory(page);
    await selectCategory(page, 'Motion');
    await dragBlockTemplateToClientPoint(page, 'turn_left_steps', x, y);

    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      return lastOkStackConnectDetail(h, 'middle') != null;
    }).toBe(true);
    await expect(workspaceBlocks(page)).toHaveCount(3);

    const snap = await getBlockLinkSnapshot(page);
    const moveUuid = uuidByBlockKey(snap, 'motion_move_steps');
    const insertedUuid = uuidByBlockKey(snap, 'turn_left_steps');
    const rightUuid = uuidByBlockKey(snap, 'turn_right_steps');
    if (!moveUuid || !insertedUuid || !rightUuid) throw new Error('uuid');
    assertParentChildLink(snap, moveUuid, insertedUuid);
    assertParentChildLink(snap, insertedUuid, rightUuid);
  });

  test('start-block в middle: шляпа между родителем и ребёнком', async ({
    page,
  }) => {
    await spawnWorkspaceTemplateStack(page, [
      { blockId: 'motion_move_steps', category: 'Motion' },
      { blockId: 'turn_right_steps', category: 'Motion' },
      { blockId: 'turn_left_steps', category: 'Motion' },
    ]);
    const upper = workspaceBlockByDataId(page, 'motion_move_steps');
    const lower = workspaceBlockByDataId(page, 'turn_right_steps');
    const { x, y } = await clientPointStackSeamBetween(upper, lower);

    await resetScratchCallHistory(page);
    await selectCategory(page, 'Motion');
    await dragBlockTemplateToClientPoint(page, 'motion_start', x, y);

    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      return lastOkStackConnectDetail(h, 'middle') != null;
    }).toBe(true);
    await expect(workspaceBlocks(page)).toHaveCount(4);

    const snap = await getBlockLinkSnapshot(page);
    const startUuid = uuidByBlockKey(snap, 'motion_start');
    const moveUuid = uuidByBlockKey(snap, 'motion_move_steps');
    const rightUuid = uuidByBlockKey(snap, 'turn_right_steps');
    const leftUuid = uuidByBlockKey(snap, 'turn_left_steps');
    if (!startUuid || !moveUuid || !rightUuid || !leftUuid) throw new Error('uuid');

    expect(snap[moveUuid].nextUUID).toBeNull();
    expect(snap[moveUuid].parentUUID).toBeNull();
    expect(snap[startUuid].parentUUID).toBeNull();
    expect(snap[startUuid].nextUUID).toBe(rightUuid);
    expect(snap[rightUuid].parentUUID).toBe(startUuid);
    assertParentChildLink(snap, rightUuid, leftUuid);
  });

  test('stop-block в middle: крышка под родителем, хвост отрывается', async ({
    page,
  }) => {
    await spawnWorkspaceTemplateStack(page, [
      { blockId: 'motion_move_steps', category: 'Motion' },
      { blockId: 'turn_right_steps', category: 'Motion' },
      { blockId: 'turn_left_steps', category: 'Motion' },
    ]);
    const upper = workspaceBlockByDataId(page, 'motion_move_steps');
    const lower = workspaceBlockByDataId(page, 'turn_right_steps');
    const { x, y } = await clientPointStackSeamBetween(upper, lower);

    await resetScratchCallHistory(page);
    await selectCategory(page, 'Control');
    await dragBlockTemplateToClientPoint(page, 'control_stop', x, y);

    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      return lastOkStackConnectDetail(h, 'middle') != null;
    }).toBe(true);
    await expect(workspaceBlocks(page)).toHaveCount(4);

    const snap = await getBlockLinkSnapshot(page);
    const stopUuid = uuidByBlockKey(snap, 'control_stop');
    const moveUuid = uuidByBlockKey(snap, 'motion_move_steps');
    const rightUuid = uuidByBlockKey(snap, 'turn_right_steps');
    const leftUuid = uuidByBlockKey(snap, 'turn_left_steps');
    if (!stopUuid || !moveUuid || !rightUuid || !leftUuid) throw new Error('uuid');

    assertParentChildLink(snap, moveUuid, stopUuid);
    expect(snap[stopUuid].nextUUID).toBeNull();
    expect(snap[rightUuid].parentUUID).toBeNull();
    expect(snap[rightUuid].nextUUID).toBe(leftUuid);
    expect(snap[leftUuid].parentUUID).toBe(rightUuid);
  });
});

test.describe('Коннект цепи из 4 default-block', () => {
  test('цепь из 4 блоков снизу от одиночного start-block', async ({
    page,
  }) => {
    const ws = page.locator('#workspace');
    const wbox = await ws.boundingBox();
    if (!wbox) throw new Error('wbox');
    await selectCategory(page, 'Motion');
    await dragBlockTemplateToClientPoint(
      page,
      'motion_start',
      wbox.x + wbox.width * 0.42,
      wbox.y + wbox.height * 0.28
    );

    await spawnWorkspaceTemplateStack(page, FOUR_DEFAULT_STACK, {
      xFraction: 0.72,
      yFraction: 0.28,
    });

    const startLoc = workspaceBlockByDataId(page, 'motion_start');
    const drop = await workspaceStackDropClientPoint(page, startLoc, 'below');
    const chainHeadLoc = workspaceBlocksByDataId(page, 'motion_move_steps').last();

    await resetScratchCallHistory(page);
    await dragWorkspaceBlockToClientPoint(page, chainHeadLoc, drop.x, drop.y, {
      moveSteps: 24,
    });

    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      return lastOkStackConnectDetail(h, 'below') != null;
    }).toBe(true);

    const snap = await getBlockLinkSnapshot(page);
    const startUuid = uuidByBlockKey(snap, 'motion_start');
    const chainHeadUuid = (await workspaceBlocksByDataId(page, 'motion_move_steps')
      .last()
      .getAttribute('data-block-uuid'));
    if (!startUuid || !chainHeadUuid) throw new Error('uuid');
    assertStackBelow(snap, startUuid, chainHeadUuid);
    const tailUuid = stackTailUuidFromHeadSnapshot(snap, chainHeadUuid);
    expect(snap[tailUuid].blockKey).toBe('motion_smth');
  });

  test('цепь из 4 блоков сверху от одиночного stop-block', async ({
    page,
  }) => {
    const ws = page.locator('#workspace');
    const wbox = await ws.boundingBox();
    if (!wbox) throw new Error('wbox');
    await selectCategory(page, 'Control');
    await dragBlockTemplateToClientPoint(
      page,
      'control_stop',
      wbox.x + wbox.width * 0.48,
      wbox.y + wbox.height * 0.72
    );

    await spawnWorkspaceTemplateStack(page, FOUR_DEFAULT_STACK, {
      xFraction: 0.48,
      yFraction: 0.22,
    });

    const stopLoc = workspaceBlockByDataId(page, 'control_stop');
    const drop = await workspaceStackDropClientPoint(page, stopLoc, 'above');
    const chainHeadLoc = workspaceBlocksByDataId(page, 'motion_move_steps').last();

    await resetScratchCallHistory(page);
    await dragWorkspaceBlockToClientPoint(page, chainHeadLoc, drop.x, drop.y, {
      moveSteps: 24,
    });

    /** У цепи ≥2 блоков над «шляпой» stop чаще срабатывает `prefixOnHead`, реже `above` — оба дают хвост→stop. */
    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      const d = lastOkStackConnectDetailAnyMode(h);
      return (
        d != null &&
        (d.snap.mode === 'above' || d.snap.mode === 'prefixOnHead')
      );
    }).toBe(true);

    const snap = await getBlockLinkSnapshot(page);
    const stopUuid = uuidByBlockKey(snap, 'control_stop');
    const chainHeadUuid = (await workspaceBlocksByDataId(page, 'motion_move_steps')
      .last()
      .getAttribute('data-block-uuid'));
    if (!stopUuid || !chainHeadUuid) throw new Error('uuid');
    const stopNode = snap[stopUuid];
    expect(stopNode && stopNode.parentUUID).toBeTruthy();
    const stopParentUuid = stopNode.parentUUID;
    const stopParent = snap[stopParentUuid];
    expect(stopParent).toBeTruthy();
    expect(stopParent.nextUUID).toBe(stopUuid);
    expect(stopParent.blockKey).toBe('motion_smth');
  });

  test('цепь из 4 блоков снизу от хвоста другой цепи (2 default)', async ({
    page,
  }) => {
    await spawnWorkspaceTemplateStack(
      page,
      [
        { blockId: 'motion_move_steps', category: 'Motion' },
        { blockId: 'turn_right_steps', category: 'Motion' },
      ],
      { xFraction: 0.28, yFraction: 0.32 }
    );
    await spawnWorkspaceTemplateStack(page, FOUR_DEFAULT_STACK, {
      xFraction: 0.72,
      yFraction: 0.32,
    });

    const snapBefore = await getBlockLinkSnapshot(page);
    const anchorHeadUuid = (await workspaceBlocksByDataId(page, 'motion_move_steps')
      .first()
      .getAttribute('data-block-uuid'));
    if (!anchorHeadUuid) throw new Error('anchor head');
    const anchorTailUuid = stackTailUuidFromHeadSnapshot(snapBefore, anchorHeadUuid);
    const anchorTailLoc = workspaceBlockByUuid(page, anchorTailUuid);
    const drop = await workspaceStackDropClientPoint(page, anchorTailLoc, 'below');
    const longChainHeadLoc = workspaceBlocksByDataId(page, 'motion_move_steps').last();

    await resetScratchCallHistory(page);
    await dragWorkspaceBlockToClientPoint(page, longChainHeadLoc, drop.x, drop.y, {
      moveSteps: 24,
    });

    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      return lastOkStackConnectDetail(h, 'below') != null;
    }).toBe(true);

    const snap = await getBlockLinkSnapshot(page);
    const longHeadUuid = (await workspaceBlocksByDataId(page, 'motion_move_steps')
      .last()
      .getAttribute('data-block-uuid'));
    if (!longHeadUuid) throw new Error('long head');
    assertStackBelow(snap, anchorTailUuid, longHeadUuid);
  });

  test('цепь из 4 блоков сверху от головы якорной цепи (один default как «голова»)', async ({
    page,
  }) => {
    await spawnWorkspaceTemplateStack(
      page,
      [{ blockId: 'motion_move_steps', category: 'Motion' }],
      { xFraction: 0.48, yFraction: 0.58 }
    );
    await spawnWorkspaceTemplateStack(page, FOUR_DEFAULT_STACK, {
      xFraction: 0.48,
      yFraction: 0.12,
    });

    const anchorHeadLoc = workspaceBlockByDataId(page, 'motion_move_steps').first();
    const anchorBox = await anchorHeadLoc.boundingBox();
    const ws = page.locator('#workspace');
    const wbox = await ws.boundingBox();
    if (!anchorBox || !wbox) throw new Error('boxes');
    const dropX = clamp(anchorBox.x + anchorBox.width / 2, wbox.x + 8, wbox.x + wbox.width - 8);
    const dropY = clamp(anchorBox.y - 6, wbox.y + 8, wbox.y + wbox.height - 8);
    const longChainHeadLoc = workspaceBlocksByDataId(page, 'motion_move_steps').last();

    await resetScratchCallHistory(page);
    await dragWorkspaceBlockToClientPoint(page, longChainHeadLoc, dropX, dropY, {
      moveSteps: 28,
    });

    await expect.poll(async () => {
      const h = await getScratchCallHistory(page);
      const d = lastOkStackConnectDetailAnyMode(h);
      return (
        d != null &&
        (d.snap.mode === 'above' || d.snap.mode === 'prefixOnHead')
      );
    }).toBe(true);

    const snap = await getBlockLinkSnapshot(page);
    const anchorHeadUuid = (await workspaceBlocksByDataId(page, 'motion_move_steps')
      .first()
      .getAttribute('data-block-uuid'));
    const longHeadUuid = (await workspaceBlocksByDataId(page, 'motion_move_steps')
      .last()
      .getAttribute('data-block-uuid'));
    if (!anchorHeadUuid || !longHeadUuid) throw new Error('uuid');
    const anchorNode = snap[anchorHeadUuid];
    expect(anchorNode && anchorNode.parentUUID).toBeTruthy();
    const parentOfAnchor = snap[anchorNode.parentUUID];
    expect(parentOfAnchor).toBeTruthy();
    expect(parentOfAnchor.nextUUID).toBe(anchorHeadUuid);
    expect(parentOfAnchor.blockKey).toBe('motion_smth');
  });
});

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
