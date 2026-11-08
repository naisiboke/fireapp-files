import { onShow, onUnload } from '@dcloudio/uni-app'
import { accountId } from './account-cache.js'

const active = new Set()
const optionsDrafts = new WeakMap()
const fieldsByRoute = {
  'pages/community/index': ['postDraft','netWorthInput','modal'],
  'pages/ledger/index': ['month','budgetInput','incomeInput','budgetExpanded','draft','editingId','showAdd'],
  'pages/savings-curve/index': ['age','lifeExpectancy','started','profileStep','questionIndex','answers','customAnswers','customEditing','customDraft','customEvents'],
  'pages/wishlist/index': ['form','showAdd'],
  'pages/ai/index': ['question'],
  'pages/ledger/edit': ['draft', 'editing', 'editingId'],
  'pages/profile/edit': ['name'],
  'pages/settings/index': ['redeemCode'],
  'pages/profile/membership': ['redeemCode'],
}
export function currentPageRoute() {
  try {
    const page = getCurrentPages().slice(-1)[0]
    if (!page?.route) return '/pages/index/index'
    const query = Object.entries(page.options || {}).filter(([key,value]) =>
      /^[a-zA-Z0-9_]+$/.test(key) && typeof value !== 'object'
    ).sort(([a],[b]) => a.localeCompare(b)).map(([key,value]) => key+'='+encodeURIComponent(String(value))).join('&')
    return '/' + page.route.replace(/^\//,'') + (query ? '?' + query : '')
  } catch (ignore) { return '/pages/index/index' }
}
function key(uid) { return 'fire_form_drafts_v1:account:' + encodeURIComponent(uid) }
function read(uid) {
  const saved = uni.getStorageSync(key(uid))
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
}
export function registerSessionDraft(getValue, setValue) {
  const uid = accountId(), route = currentPageRoute()
  const entry = { uid, route, getValue }
  if (uid) active.add(entry)
  const draft = uid && read(uid)[route]
  if (draft && draft.version === 1) setValue(JSON.parse(JSON.stringify(draft.value)))
  return {
    clear() {
      if (!uid) return
      try { const saved=read(uid);delete saved[route];uni.setStorageSync(key(uid),saved) }
      catch(ignore) { console.warn('[draft-clear]','LOCAL_STORAGE_FAILED') }
    },
    release() { active.delete(entry) },
  }
}
export function flushSessionDrafts(uid = accountId()) {
  if (!uid) return true
  try {
    const saved = read(uid)
    for (const entry of active) {
      if (entry.uid !== uid) continue
      saved[entry.route] = { version:1, value:JSON.parse(JSON.stringify(entry.getValue())), savedAt:Date.now() }
    }
    uni.setStorageSync(key(uid), saved)
    return true
  } catch (error) { console.warn('[draft-save]', 'LOCAL_STORAGE_FAILED'); return false }
}
export function useSessionDraft(getValue, setValue) {
  let draft = null, restored = false
  onShow(() => { if (!draft) draft = registerSessionDraft(getValue,value=>{restored=true;setValue(value)}) })
  onUnload(() => draft?.release())
  return { clear() { draft?.clear() }, restored() { return restored } }
}
export function attachOptionsDraft(page) {
  if (optionsDrafts.has(page)) return
  const route = currentPageRoute().split('?')[0].slice(1)
  const fields = fieldsByRoute[route]
  if (!fields) return
  const draft = registerSessionDraft(
    () => Object.fromEntries(fields.map(name => [name,page[name]])),
    value => { for (const name of fields) if (Object.prototype.hasOwnProperty.call(value || {},name)) page[name] = value[name] },
  )
  optionsDrafts.set(page,draft)
}
export function detachOptionsDraft(page) { optionsDrafts.get(page)?.release(); optionsDrafts.delete(page) }
export function clearOptionsDraft(page) { optionsDrafts.get(page)?.clear() }
