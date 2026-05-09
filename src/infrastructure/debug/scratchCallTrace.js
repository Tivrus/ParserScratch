/**
 * Журнал вызовов для отладки и E2E: записи добавляются **только** при `window.__DEBUG__ === true`
 * (см. `bootstrap.js`: в автотестах `__DEBUG__` включается с флагом `__SCRATCH_E2E_SUPPRESS_CONNECTOR__`,
 * чтобы не поднимать оверлей коннекторов).
 */

/**
 * @param {string} tag короткий идентификатор события
 * @param {Record<string, unknown>|null} [detail]
 */
export function scratchCallRecord(tag, detail) {
  if (globalThis.__DEBUG__ !== true) {
    return;
  }
  let historyArray = globalThis.__SCRATCH_CALL_HISTORY__;
  if (!Array.isArray(historyArray)) {
    historyArray = [];
    globalThis.__SCRATCH_CALL_HISTORY__ = historyArray;
  }
  if (historyArray.length > 800) {
    historyArray.splice(0, historyArray.length - 400);
  }
  let safeDetail = detail;
  if (detail && typeof detail === 'object') {
    try {
      safeDetail = JSON.parse(JSON.stringify(detail));
    } catch {
      safeDetail = { note: 'detail not serializable' };
    }
  }
  historyArray.push({
    t: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    tag,
    detail: safeDetail,
  });
}
