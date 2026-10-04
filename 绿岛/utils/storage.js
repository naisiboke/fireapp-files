const PREFIX = 'fire_forge_'

export const storage = {
  get(key, fallback = null) {
    try {
      const v = uni.getStorageSync(PREFIX + key)
      if (v === '' || v === undefined || v === null) return fallback
      return typeof v === 'string' ? JSON.parse(v) : v
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
    try { uni.removeStorageSync(PREFIX + key) } catch {}
  },
}