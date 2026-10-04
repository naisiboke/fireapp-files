import { reactive, toRaw } from 'vue'
import { storage } from '../utils/storage.js'
import { LocalDay, HeroDay } from '../utils/engine.js'

export const WISHLIST_KEY = 'fire_wishlist_v1'

function readWishlist() {
  try {
    const value = uni.getStorageSync(WISHLIST_KEY)
    return Array.isArray(value) ? value : null
  } catch (e) { return null }
}

function writeWishlist(items) {
  try { uni.setStorageSync(WISHLIST_KEY, JSON.parse(JSON.stringify(items || []))) } catch (e) {}
}

const seed = () => ({
  finance: {
    assets: 1248000,
    expense: 8600,
    income: 17200,
    monthlyDeposit: 15000,
    retirementExpense: 8000,
    rate: 8,
    withdrawal: 4,
    mode: 'fire',
    goal: 2000000,
  },
  profile: { name: '自由的旅人', passive: 3200, goal: '工作自由' },
  items: [],
  completed: [],
  exp: 0,
  started: false,
  financeEntered: true,
  goalPlan: null,
  goalDraft: null,
  hero: null,
  ledger: [],
  assetHistory: [],
  monthlyTargets: {},
  toolUsage: {},
  timeLedger: null,
  soundEnabled: true,
  reading: undefined,
})

export const state = reactive({ ...seed(), ready: false })

export function bootstrap() {
  const saved = storage.get('state', null)
  if (saved && saved.finance && Array.isArray(saved.items)) {
    Object.assign(state, saved)
  }
  const wishlist = readWishlist()
  if (wishlist) state.items = wishlist
  if (!Array.isArray(state.ledger)) state.ledger = []
  if (!Array.isArray(state.assetHistory)) state.assetHistory = []
  if (typeof state.soundEnabled !== 'boolean') state.soundEnabled = true
  if (!state.monthlyTargets) state.monthlyTargets = {}
  HeroDay(state)
  state.ready = true
}

let saveTimer = null
export function persist() {
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
  persist()
}