// @ts-check

import { expect } from '@playwright/test';

/**
 * @param {Record<string, any>} snapshot
 * @param {string} anchorUuid
 * @param {string} childUuid
 */
export function assertStackBelow(snapshot, anchorUuid, childUuid) {
  const a = snapshot[anchorUuid];
  const b = snapshot[childUuid];
  expect(a, `anchor ${anchorUuid}`).toBeTruthy();
  expect(b, `child ${childUuid}`).toBeTruthy();
  expect(a.nextUUID).toBe(childUuid);
  expect(b.parentUUID).toBe(anchorUuid);
}

/**
 * Удерживаемая цепочка (голова `heldHeadUuid`) встает **над** якорем `anchorUuid`.
 *
 * @param {Record<string, any>} snapshot
 * @param {string} anchorUuid нижний блок (якорь на полотне)
 * @param {string} heldHeadUuid голова перетаскиваемой цепочки
 */
export function assertStackAbove(snapshot, anchorUuid, heldHeadUuid) {
  const anchor = snapshot[anchorUuid];
  const head = snapshot[heldHeadUuid];
  expect(anchor).toBeTruthy();
  expect(head).toBeTruthy();
  let tail = head;
  const seen = new Set();
  while (
    tail &&
    tail.nextUUID &&
    tail.nextUUID !== anchorUuid &&
    !seen.has(tail.blockUUID)
  ) {
    seen.add(tail.blockUUID);
    tail = snapshot[tail.nextUUID];
  }
  expect(tail && tail.nextUUID).toBeTruthy();
  expect(tail.nextUUID).toBe(anchorUuid);
  expect(anchor.parentUUID).toBe(tail.blockUUID);
}

/**
 * @param {Array<{ tag: string; detail?: unknown }>} entries
 * @param {string} expectedMode
 */
export function lastOkStackConnectDetail(entries, expectedMode) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.tag !== 'tryCommitStackConnect' || !e.detail || typeof e.detail !== 'object') {
      continue;
    }
    const d = /** @type {{ ok?: boolean; snap?: { mode?: string } }} */ (e.detail);
    if (d.ok === true && d.snap && d.snap.mode === expectedMode) {
      return d;
    }
  }
  return null;
}

/**
 * Последний успешный `tryCommitStackConnect` с любым `snap.mode`.
 *
 * @param {Array<{ tag: string; detail?: unknown }>} entries
 */
export function lastOkStackConnectDetailAnyMode(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.tag !== 'tryCommitStackConnect' || !e.detail || typeof e.detail !== 'object') {
      continue;
    }
    const d = /** @type {{ ok?: boolean; snap?: { mode?: string } }} */ (e.detail);
    if (d.ok === true && d.snap && typeof d.snap.mode === 'string') {
      return d;
    }
  }
  return null;
}

/**
 * Хвост внешнего стека по `nextUUID` от головы.
 *
 * @param {Record<string, any>} snapshot
 * @param {string} headUuid
 */
export function stackTailUuidFromHeadSnapshot(snapshot, headUuid) {
  let current = snapshot[headUuid];
  expect(current, `head ${headUuid}`).toBeTruthy();
  while (current.nextUUID) {
    const nextId = current.nextUUID;
    current = snapshot[nextId];
    expect(current, `next ${nextId}`).toBeTruthy();
  }
  return current.blockUUID;
}

/**
 * @param {Record<string, any>} snapshot
 * @param {string} parentUuid
 * @param {string} childUuid
 */
export function assertParentChildLink(snapshot, parentUuid, childUuid) {
  const parent = snapshot[parentUuid];
  const child = snapshot[childUuid];
  expect(parent).toBeTruthy();
  expect(child).toBeTruthy();
  expect(parent.nextUUID).toBe(childUuid);
  expect(child.parentUUID).toBe(parentUuid);
}
