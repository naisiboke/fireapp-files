import { reactive, toRaw } from 'vue'
import { storage } from '../utils/storage.js'
import { HeroDay } from '../utils/engine.js'
import { createFreedomPlan, financeSignature, hasValidFinance } from '../utils/finance-plan.js'
import { isApiConfigured, fetchUserState, saveUserState } from '../utils/api-service.js'

export const STATE_VERSION = 3
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
    assets: 0,
    expense: 0,
    income: 0,
    monthlyDeposit: 0,
    retirementExpense: 0,
    rate: 8,
    withdrawal: 4,
    mode: 'fire',
    goal: 0,
  },
  profile: { name: '自由的旅人', passive: null, goal: '工作自由' },
  items: [],
  completed: [],
  exp: 0,
  started: false,
  financeEntered: false,
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
  privacySettings: { cloudSync: true, personalizedContent: true },
  cloudSync: { status: 'offline', message: '' },
  stateVersion: STATE_VERSION,
})

export const state = reactive({ ...seed(), ready: false })

function applySaved(saved) {
  const defaults = seed()
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    // 保留未知字段、阅读对象及所有记录，仅为缺失字段补默认值。
    Object.assign(state, defaults, saved)
    state.finance = { ...defaults.finance, ...(saved.finance || {}) }
    for (const key of ['assets','expense','income','monthlyDeposit','retirementExpense','rate','withdrawal','goal']) {
      const value = state.finance[key]
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) state.finance[key] = Number(value)
    }
    if (saved.finance && !Number.isFinite(saved.finance.retirementExpense)) {
      state.finance.retirementExpense = Number(saved.finance.expense) || 0
    }
    if (saved.finance && !Number.isFinite(saved.finance.monthlyDeposit)) {
      state.finance.monthlyDeposit = Math.max(0, (Number(saved.finance.income) || 0) - (Number(saved.finance.expense) || 0))
    }
    if (typeof saved.financeEntered !== 'boolean') {
      state.financeEntered = hasValidFinance({ financeEntered: true, finance: state.finance })
    }
  } else Object.assign(state, defaults)
  for (const key of ['items', 'completed', 'ledger', 'assetHistory']) {
    if (!Array.isArray(state[key])) state[key] = []
  }
  if (!state.monthlyTargets) state.monthlyTargets = {}
  if (!state.toolUsage) state.toolUsage = {}
  if (typeof state.soundEnabled !== 'boolean') state.soundEnabled = true
  state.privacySettings = { ...defaults.privacySettings, ...(state.privacySettings || {}) }
  state.cloudSync = { status: 'offline', message: '', ...(state.cloudSync || {}) }
  state.stateVersion = STATE_VERSION
  if (saved && saved.finance && saved.freedomPlan &&
      saved.freedomPlan.signature === JSON.stringify(saved.finance)) {
    state.freedomPlan = { ...saved.freedomPlan, signature: financeSignature(state.finance), calculatedAt: saved.freedomPlan.calculatedAt || Date.now() }
  }
  for (const key of ['goalPlan', 'goalDraft']) {
    if (state[key] && !Number.isFinite(state[key].calculatedAt)) state[key] = { ...state[key], calculatedAt: Date.now() }
  }
  ensureFreedomPlan()
}

function ensureFreedomPlan() {
  if (!hasValidFinance(state)) return false
  const old = state.freedomPlan
  if (!old || (old.signature !== financeSignature(state.finance) && old.signature !== JSON.stringify(state.finance))) {
    state.freedomPlan = createFreedomPlan(state.finance)
    return true
  }
  if (!Number.isFinite(old.calculatedAt) || old.signature !== financeSignature(state.finance)) {
    // HTML 旧版仅保存 deadline；保留该日期，不重新向后滚动。
    state.freedomPlan = { ...old, signature: financeSignature(state.finance), calculatedAt: Date.now() }
    return true
  }
  return false
}

export function bootstrap() {
  applySaved(storage.get('state', null))
  const wishlist = readWishlist()
  if (wishlist) state.items = wishlist
  HeroDay(state)
  state.ready = true
  // 迁移只对已有状态落盘；首次安装保留空白 seed。
  if (storage.get('state', null)) persistNow()
}

// onShow 仅刷新本次功能相关字段，不能用旧存储覆盖未落盘的记账/拔草记录。
export function refreshFinance() {
  if (saveTimer !== null) return
  const saved = storage.get('state', null)
  if (saved && saved.finance) {
    state.finance = { ...state.finance, ...saved.finance }
    if (typeof saved.financeEntered === 'boolean') state.financeEntered = saved.financeEntered
    for (const key of ['freedomPlan', 'goalPlan', 'goalDraft']) {
      if (Object.prototype.hasOwnProperty.call(saved, key)) state[key] = saved[key]
    }
    if (saved.profile) state.profile = { ...state.profile, ...saved.profile }
  }
  if (ensureFreedomPlan()) persistNow()
}

function serializableState() {
  const plain = JSON.parse(JSON.stringify(toRaw(state)))
  delete plain.ready
  delete plain.cloudSync
  return plain
}

function writeLocal(plain) {
  const success = storage.set('state', plain)
  if (success) writeWishlist(plain.items)
  return success
}

export async function syncStateToServer(snapshot = serializableState()) {
  if (!isApiConfigured()) return { configured: false }
  state.cloudSync = { status: 'syncing', message: '' }
  try {
    await saveUserState(snapshot)
    state.cloudSync = { status: 'synced', message: '已与云端同步' }
    return { configured: true, synced: true }
  } catch (error) {
    state.cloudSync = { status: 'error', message: error && error.message ? error.message : '云端同步失败' }
    console.warn('[cloud-sync]', error)
    return { configured: true, synced: false, error }
  }
}

export async function hydrateFromServer() {
  if (!isApiConfigured()) return { configured: false }
  try {
    const remote = await fetchUserState()
    if (remote && typeof remote === 'object') {
      applySaved(remote)
      HeroDay(state)
      writeLocal(serializableState())
      state.cloudSync = { status: 'synced', message: '已从云端读取' }
      return { configured: true, loaded: true }
    }
    return { configured: true, loaded: false }
  } catch (error) {
    state.cloudSync = { status: 'error', message: error && error.message ? error.message : '云端读取失败' }
    console.warn('[cloud-hydrate]', error)
    return { configured: true, loaded: false, error }
  }
}

export function persistNow() {
  clearTimeout(saveTimer)
  saveTimer = null
  try {
    const plain = serializableState()
    const success = writeLocal(plain)
    if (success) syncStateToServer(plain)
    return success
  } catch (e) {
    console.warn('[persistNow]', e)
    return false
  }
}

let saveTimer = null
export function persist() {
  // 拔草数据立即落盘，返回首页时不会被旧存储覆盖。
  writeWishlist(toRaw(state).items)
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      const plain = serializableState()
      writeLocal(plain)
      syncStateToServer(plain)
    } catch (e) {
      console.warn('[persist]', e)
    }
  }, 120)
}

export function reset() {
  Object.assign(state, seed(), { ready: true })
  persist()
}