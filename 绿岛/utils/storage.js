const PREFIX = 'fire_forge_'
const LEGACY_STATE_KEYS = [
  'fire_forge_state',
  'fire-forge-preview-v1',
  'fire_state_v1',
  'firelife_state_v1',
]

function decode(value) {
  if (value === '' || value === undefined || value === null) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch (e) { return null }
  }
  return value
}

function migrateState() {
  try {
    const current = decode(uni.getStorageSync(PREFIX + 'state'))
    if (current && typeof current === 'object') return current
    for (const key of LEGACY_STATE_KEYS) {
      const legacy = decode(uni.getStorageSync(key))
      if (!legacy || typeof legacy !== 'object' || !legacy.finance) continue
      // 立即复制到新键，后续版本只使用统一命名空间。
      uni.setStorageSync(PREFIX + 'state', JSON.stringify(legacy))
      return legacy
    }
  } catch (e) {
    console.warn('[storage.migrate]', e)
  }
  return null
}

export const storage = {
  get(key, fallback = null) {
    try {
      const v = decode(uni.getStorageSync(PREFIX + key))
      if (v !== null) return v
      if (key === 'state') {
        const migrated = migrateState()
        return migrated === null ? fallback : migrated
      }
      return fallback
    } catch (e) {
      console.warn('[storage.get]', key, e)
      return fallback
    }
  },
  set(key, value) {
    try {
      uni.setStorageSync(PREFIX + key, JSON.stringify(value))
      return true
    } catch (e) {
      console.warn('[storage.set]', key, e)
      return false
    }
  },
  remove(key) {
    try { uni.removeStorageSync(PREFIX + key) } catch (e) {}
  },
}
