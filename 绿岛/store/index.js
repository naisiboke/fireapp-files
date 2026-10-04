import { reactive, toRaw } from 'vue'
import { storage } from '../utils/storage.js'
import { LocalDay, HeroDay } from '../utils/engine.js'

export const WISHLIST_KEY = 'fire_wishlist_v1'
export const STATE_VERSION = 2
export const FIRE_STORAGE_KEYS = [
  'fire_forge_state',
  'fire_wishlist_v1',
  'fire_login_status',
  'fire_guest_mode',
  'fire_island_onboarding_done',
  'fire_theme_v1',
  'firelife_favorites_v1',
  'firelife_ugc_v1',
  'firelife_assets_v1',
  'firelife_applied_models_v1',
  'firelife_post_draft_v1',
]

function readWishlist() {
  try {
    const value = uni.getStorageSync(WISHLIST_KEY)
    return Array.isArray(value) ? value : null
  } catch (e) { return null }
}

function writeWishlist(items) {
  try { uni.setStorageSync(WISHLIST_KEY, JSON.parse(JSON.stringify(items || []))) } catch (e) {}
}

function hasFinanceData(finance) {
  if (!finance || typeof finance !== 'object') return false
  return ['assets','expense','income','monthlyDeposit','retirementExpense','goal']
    .some(key => Number(finance[key]) > 0)
}

const seed = () => ({
  stateVersion: STATE_VERSION,
  finance: {
    assets: 0, expense: 0, income: 0, monthlyDeposit: 0, retirementExpense: 0,
    rate: 8, withdrawal: 4, mode: 'fire', goal: 0,
  },
  profile: { name: '自由的旅人', passive: 0, goal: '' },
  items: [], completed: [], exp: 0, started: false, financeEntered: false,
  goalPlan: null, goalDraft: null, hero: null, ledger: [], assetHistory: [],
  monthlyTargets: {}, toolUsage: {}, timeLedger: null, soundEnabled: true,
  reading: [], ready: false,
})

export const state = reactive({ ...seed(), ready: false })

export function bootstrap() {
  const defaults = seed()
  const saved = storage.get('state', null)
  if (saved && saved.finance && typeof saved === 'object') {
    Object.assign(state, saved)
    state.finance = { ...defaults.finance, ...(saved.finance || {}) }
    if (typeof saved.financeEntered !== 'boolean') state.financeEntered = hasFinanceData(state.finance)
  }
  if (!Array.isArray(state.items)) state.items = []
  if (!Array.isArray(state.completed)) state.completed = []
  if (!Array.isArray(state.ledger)) state.ledger = []
  if (!Array.isArray(state.assetHistory)) state.assetHistory = []
  if (!state.monthlyTargets || typeof state.monthlyTargets !== 'object') state.monthlyTargets = {}
  if (!state.toolUsage || typeof state.toolUsage !== 'object') state.toolUsage = {}
  if (!Array.isArray(state.reading)) state.reading = []
  if (typeof state.exp !== 'number') state.exp = 0
  if (typeof state.started !== 'boolean') state.started = false
  if (typeof state.soundEnabled !== 'boolean') state.soundEnabled = true
  state.stateVersion = STATE_VERSION
  const wishlist = readWishlist()
  if (wishlist) state.items = wishlist
  HeroDay(state)
  state.ready = true
}

let saveTimer = null
export function persist() {
  // 拔草数据立即落盘，返回首页时不会被旧存储覆盖。
  writeWishlist(toRaw(state).items)
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const plain = JSON.parse(JSON.stringify(toRaw(state)))
      delete plain.ready
      storage.set('state', plain)
      writeWishlist(plain.items)
    } catch (e) {
      console.warn('[persist]', e)
    }
  }, 120)
}

export function reset() {
  Object.assign(state, seed(), { ready: true })
}

export function clearAllData() {
  FIRE_STORAGE_KEYS.forEach(key => {
    try { uni.removeStorageSync(key) } catch (e) {}
  })
  Object.assign(state, seed(), { ready: true })
}