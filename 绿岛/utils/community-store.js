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
function write(key, value) {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
    return true
  } catch { return false }
}

export const CS = {
  favorites: () => { const v = read(K_FAV, []); return Array.isArray(v) ? v : [] },
  saveFavorites: (v) => write(K_FAV, v),

  ugc: () => { const v = read(K_UGC, []); return Array.isArray(v) ? v : [] },
  saveUGC: (v) => write(K_UGC, v),

  netWorth: () => {
    const raw = read(K_ASSETS, null)
    const n = typeof raw === 'number' ? raw : Number(raw?.netWorth ?? raw?.assets ?? raw?.amount)
    return Number.isFinite(n) && n > 0 ? n : null
  },
  setNetWorth: (n) => write(K_ASSETS, n),

  applied: () => { const v = read(K_APPLIED, []); return Array.isArray(v) ? v : [] },
  saveApplied: (v) => write(K_APPLIED, v),

  draft: () => read(K_DRAFT, null),
  saveDraft: (v) => write(K_DRAFT, v),
  clearDraft: () => { try { uni.removeStorageSync(K_DRAFT) } catch {} },
}