export function accountId() {
  try { return String(uni.getStorageSync('fire_account_uid') || '') } catch (error) { return '' }
}
export function accountKey(key, uid = accountId()) {
  return key + ':account:' + encodeURIComponent(uid || 'signed-out')
}
export function activateAccount(uid) {
  if (!uid) throw new Error('无法确认登录账号，已暂停同步')
  uni.setStorageSync('fire_account_uid', String(uid))
}
const legacyKeys = ['fire_forge_state','firelife_ugc_v1','firelife_favorites_v1','firelife_assets_v1','firelife_applied_models_v1','firelife_post_draft_v1','fire_ai_chats_v1','fire_personality_history_v1','fire_wishlist_v1']
export function preserveLegacyCache() {
  try {
    if (uni.getStorageSync('fire_legacy_cache_backup_v1')) return
    const values = {}
    for (const key of legacyKeys) {
      const value = uni.getStorageSync(key)
      if (value !== '' && value !== null && value !== undefined) values[key] = value
    }
    if (Object.keys(values).length) uni.setStorageSync('fire_legacy_cache_backup_v1', {
      createdAt:Date.now(),email:String(uni.getStorageSync('fire_account_email')||'').toLowerCase(),values,
    })
  } catch(error) { console.warn('[legacy-backup]',error) }
}
export function adoptVerifiedLegacyCache(uid, verifiedEmail) {
  preserveLegacyCache()
  const backup = uni.getStorageSync('fire_legacy_cache_backup_v1')
  if (!backup || backup.adoptedBy || !verifiedEmail) return false
  let state = backup.values?.fire_forge_state
  try { if(typeof state==='string')state=JSON.parse(state) } catch(error){state=null}
  const email = String(backup.email || state?.profile?.email || '').toLowerCase()
  if (!email || email !== String(verifiedEmail).toLowerCase()) return false
  for (const [key,value] of Object.entries(backup.values || {})) {
    if (!uni.getStorageSync(accountKey(key,uid))) uni.setStorageSync(accountKey(key,uid),value)
  }
  uni.setStorageSync('fire_legacy_cache_backup_v1',{...backup,adoptedBy:uid})
  return true
}
export function readAccountCache(key, fallback = null, uid = accountId()) {
  try {
    const raw=uni.getStorageSync(accountKey(key,uid))
    if(raw===''||raw===null||raw===undefined)return fallback
    return typeof raw==='string'?JSON.parse(raw):raw
  } catch(error){return fallback}
}
export function writeAccountCache(key,value,uid = accountId()) {
  try { uni.setStorageSync(accountKey(key,uid),JSON.stringify(value));return true }
  catch(error){return false}
}
