import { isApiConfigured, fetchUserCollection, saveUserCollection, deleteUserCollection } from './api-service.js'
import { isApiConfigured, saveUserCollection } from './api-service.js'
const K_FAV = 'firelife_favorites_v1'
const K_UGC = 'firelife_ugc_v1'
const K_ASSETS = 'firelife_assets_v1'
const K_APPLIED = 'firelife_applied_models_v1'
const K_DRAFT = 'firelife_post_draft_v1'

function read(key, fallback) {
  try {
    const raw = uni.getStorageSync(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}
function write(key, value, collection) {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
    if (collection && isApiConfigured()) saveUserCollection(collection, value).catch((error) => console.warn('[community-cloud-sync]', collection, error))
    return true
  } catch { return false }
}

export const CS = {
  favorites: () => { const v = read(K_FAV, []); return Array.isArray(v) ? v : [] },
  saveFavorites: (v) => write(K_FAV, v, 'favorites'),

  ugc: () => { const v = read(K_UGC, []); return Array.isArray(v) ? v : [] },
  saveUGC: (v) => write(K_UGC, v, 'ugc'),

  netWorth: () => {
    const raw = read(K_ASSETS, null)
    const n = typeof raw === 'number' ? raw : Number(raw?.netWorth ?? raw?.assets ?? raw?.amount)
    return Number.isFinite(n) && n > 0 ? n : null
  },
  setNetWorth: (n) => write(K_ASSETS, n, 'net-worth'),

  applied: () => { const v = read(K_APPLIED, []); return Array.isArray(v) ? v : [] },
  saveApplied: (v) => write(K_APPLIED, v, 'applied-models'),

  draft: () => read(K_DRAFT, null),
  saveDraft: (v) => write(K_DRAFT, v, 'post-draft'),
  clearDraft: () => { try { uni.removeStorageSync(K_DRAFT); if (isApiConfigured()) deleteUserCollection('post-draft').catch((error) => console.warn('[community-cloud-sync]', 'post-draft', error)) } catch {} },
  hydrate: async () => {
    if (!isApiConfigured()) return false
    const names = [['favorites', K_FAV], ['ugc', K_UGC], ['net-worth', K_ASSETS], ['applied-models', K_APPLIED], ['post-draft', K_DRAFT]]
    const values = await Promise.all(names.map(([name]) => fetchUserCollection(name)))
    values.forEach((value, index) => { if (value !== undefined && value !== null) { try { uni.setStorageSync(names[index][1], JSON.stringify(value)) } catch {} } })
    return true
  },
}