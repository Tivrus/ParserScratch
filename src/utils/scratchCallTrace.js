export function record_Trace(tag, detail){
  if (globalThis.__DEBUG__ !== true){
    return
  }
  let historyArray = globalThis.__SCRATCH_CALL_HISTORY__
  if (!Array.isArray(historyArray)){
    historyArray = []
    globalThis.__SCRATCH_CALL_HISTORY__ = historyArray
  }
  if (historyArray.length > 800){
    historyArray.splice(0, historyArray.length - 400)
  }
  let safeDetail = detail
  if (detail && typeof detail === 'object'){
    try {
      safeDetail = JSON.parse(JSON.stringify(detail))
    } catch {
      safeDetail = { note: 'detail not serializable' }
    }
  }
  historyArray.push({
    t: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    tag,
    detail: safeDetail,
  })
}
