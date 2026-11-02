import { currentPageRoute, flushSessionDrafts } from './session-drafts.js'

const ALLOWED_ROUTES = new Set(["/pages/sync-conflict/index","/pages/community/share","/pages/wishlist/detail","/pages/wishlist/add","/pages/assets/index","/pages/index/index","/pages/tools/index","/pages/reading-library/index","/pages/community/index","/pages/community/manage","/pages/profile/index","/pages/ledger/index","/pages/ledger/edit","/pages/privacy/index","/pages/settings/index","/pages/wishlist/index","/pages/hero/index","/pages/calculator/index","/pages/savings-curve/index","/pages/profile/edit","/pages/profile/membership","/pages/personality/index","/pages/ai/index","/pages/music/index"])
const PENDING_KEY = 'fire_reauth_pending_v1'
let handlers = null, redirecting = false
export function safeReturnRoute(value) {
  let route = String(value || '')
  if (!route.startsWith('/')) { try { route = decodeURIComponent(route) } catch (ignore) { return '/pages/index/index' } }
  if (route.length > 1600 || /[\r\n#\\]/.test(route) || !ALLOWED_ROUTES.has(route.split('?')[0])) return '/pages/index/index'
  return route
}
export function isSessionExpired(error) {
  const code = String(error?.code || error?.errorCode || error?.error || '').toLowerCase()
  return ['invalid_grant','invalid_refresh_token','refresh_token_expired','auth_required','login_state_expired','access_token_expired'].includes(code)
}
export function configureSessionRecovery(value) { handlers = value }
export function reportSessionExpiry(error, uid = '') {
  if (!isSessionExpired(error) || !handlers) return false
  const owner = String(uni.getStorageSync('fire_account_uid') || '')
  if (!owner || (uid && String(uid) !== owner)) return false
  if (redirecting || uni.getStorageSync('fire_login_status') !== true) return true
  handlers.suspend()
  const draftsSaved = flushSessionDrafts(owner)
  const recordsSaved = handlers.preserve()
  if (!draftsSaved || !recordsSaved) {
    handlers.failed?.()
    return false
  }
  const redirect = safeReturnRoute(currentPageRoute())
  uni.setStorageSync(PENDING_KEY,{uid:owner,redirect})
  uni.setStorageSync('fire_login_status',false)
  uni.removeStorageSync('fire_access_token')
  handlers.expired?.()
  redirecting = true
  uni.reLaunch({
    url:'/pages/login/login?expired=1&redirect='+encodeURIComponent(redirect),
    complete() { redirecting = false },
  })
  return true
}
export function finishSessionRecovery(uid, requested) {
  const pending = uni.getStorageSync(PENDING_KEY)
  const target = pending ? (pending.uid === String(uid) ? pending.redirect : '/pages/index/index') : requested
  uni.removeStorageSync(PENDING_KEY)
  redirecting = false
  return safeReturnRoute(target)
}
