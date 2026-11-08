export const GUIDE_KEY = 'fire_spotlight_guide_v1'
const MIGRATION_KEY = GUIDE_KEY + ':legacy-owner'
const replayRequests = new Set()
const sessionCompleted = new Set()
export const guideKey = uid => GUIDE_KEY + ':account:' + encodeURIComponent(String(uid || ''))
const validUid = uid => typeof uid === 'string' && uid.length > 0
export function guideCompleted(storage, uid) {
  if (!validUid(uid)) return true
  if (sessionCompleted.has(uid)) return true
  try {
    const value = storage.getStorageSync(guideKey(uid))
    return value === true || value?.completed === true
  } catch (error) { return false }
}
export function migrateLegacyGuide(storage, uid) {
  if (!validUid(uid)) return false
  try {
    if (storage.getStorageSync(MIGRATION_KEY) || storage.getStorageSync('fire_app_guide_done') !== true) return false
    if (!guideCompleted(storage, uid)) storage.setStorageSync(guideKey(uid), { completed: true, reason: 'legacy', version: 1 })
    storage.setStorageSync(MIGRATION_KEY, uid)
    return true
  } catch (error) { return false }
}
export function completeGuide(storage, uid, reason = 'completed') {
  if (!validUid(uid)) return false
  sessionCompleted.add(uid)
  replayRequests.delete(uid)
  try {
    storage.setStorageSync(guideKey(uid), { completed: true, version: 1, reason, at: Date.now() })
    return true
  } catch (error) { return false }
}
export function requestGuideReplay(uid) {
  if (!validUid(uid)) return false
  replayRequests.add(uid)
  return true
}
export function guideRequested(uid) { return replayRequests.has(uid) }
export function consumeGuideRequest(uid) { return replayRequests.delete(uid) }
export function needsGuide(storage, uid) { return validUid(uid) && (guideRequested(uid) || !guideCompleted(storage, uid)) }
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)
export function validTarget(rect) {
  return !!rect && ['left','top','width','height'].every(key => Number.isFinite(Number(rect[key]))) && rect.width > 0 && rect.height > 0
}
export function spotlightLayout(rect, viewport, bubbleHeight = 158, round = false) {
  if (!validTarget(rect)) return null
  const width = Number(viewport.width), height = Number(viewport.height)
  if (!(width > 100 && height > 180)) return null
  const safeTop = Math.max(0, Number(viewport.top) || 0), safeBottom = Math.max(0, Number(viewport.bottom) || 0)
  const left = clamp(Number(rect.left) - 8, 4, width - 20)
  const top = clamp(Number(rect.top) - 8, safeTop + 3, height - safeBottom - 20)
  const holeWidth = Math.min(Number(rect.width) + 16, width - left - 4)
  const holeHeight = Math.min(Number(rect.height) + 16, height - safeBottom - top - 3)
  if (holeWidth < 16 || holeHeight < 16) return null
  const radius = round ? Math.min(holeWidth, holeHeight) / 2 : Math.min(16, holeHeight / 2)
  const gap = 14, upper = safeTop + 62, lower = height - safeBottom - 12
  const above = top - gap - upper, below = lower - top - holeHeight - gap
  const preferBelow = viewport.preferBelow === true
  const wanted = Math.max(124, Number(bubbleHeight) || 158)
  const placement = preferBelow ? (below >= wanted || below >= above ? 'below' : 'above') : (above >= wanted || above >= below ? 'above' : 'below')
  const space = placement === 'above' ? above : below
  if (space < 112) return null
  const maxHeight = Math.floor(space), panelHeight = Math.min(wanted, maxHeight)
  const panelWidth = Math.min(320, width - 40)
  const panelLeft = clamp(left + holeWidth / 2 - panelWidth / 2, 20, width - panelWidth - 20)
  const panelTop = placement === 'above' ? top - gap - panelHeight : top + holeHeight + gap
  return {
    hole: { left, top, width: holeWidth, height: holeHeight, radius },
    bubble: { left: panelLeft, top: panelTop, width: panelWidth, maxHeight, placement, arrow: clamp(left + holeWidth / 2 - panelLeft, 23, panelWidth - 23) },
    skipTop: safeTop + 12,
  }
}

export function clearGuideSession() { sessionCompleted.clear(); replayRequests.clear() }
