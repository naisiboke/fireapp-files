import { accountId, activateAccount, readAccountCache, writeAccountCache, preserveLegacyCache, adoptVerifiedLegacyCache } from '../utils/account-cache.js'
import { reactive, toRaw } from 'vue'
import { storage } from '../utils/storage.js'
import { HeroDay } from '../utils/engine.js'
import { createFreedomPlan, financeSignature, hasValidFinance } from '../utils/finance-plan.js'
import { isApiConfigured, fetchAccountBootstrap, saveUserState, fetchMembership, redeemMembershipCode } from '../utils/api-service.js'
import { validateNickname } from '../utils/nickname.js'

export const STATE_VERSION = 4
export const WISHLIST_KEY = 'fire_wishlist_v1'

function readWishlist() {
  try {
    const value = readAccountCache(WISHLIST_KEY)
    return Array.isArray(value) ? value : null
  } catch (e) { return null }
}

function writeWishlist(items) {
  try { const value=JSON.parse(JSON.stringify(items || []));writeAccountCache(WISHLIST_KEY,value);uni.setStorageSync(WISHLIST_KEY,value) } catch (e) {}
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
  membership: { active: false, status: 'inactive', plan: 'fire-life-monthly', name: 'Fire生活通用会员', price: 9, expiresAt: 0, updatedAt: 0 },
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
  aiChats: [],
  timeLedger: null,
  soundEnabled: true,
  reading: undefined,
  personalityTests: {},
  privacySettings: { cloudSync: true, personalizedContent: true, guardianAnimation: true },
  cloudSync: { status: 'offline', message: '' },
  stateVersion: STATE_VERSION,
})

export const state = reactive({ ...seed(), ready: false })

function applySaved(saved) {
  const defaults = seed()
  for(const key of Object.keys(state))if(!(key in defaults))delete state[key]
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
    // 保留未知字段、阅读对象及所有记录，仅为缺失字段补默认值。
    Object.assign(state, defaults, saved)
    state.finance = { ...defaults.finance, ...(saved.finance || {}) }
    state.profile = { ...defaults.profile, ...(saved.profile || {}) }
    state.membership = { ...defaults.membership, ...(saved.membership || {}) }
    if (!validateNickname(state.profile.name).ok) state.profile.name = defaults.profile.name
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
  state.membership = { ...defaults.membership, ...(state.membership || {}) }
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
  preserveLegacyCache()
  const savedMeta=readAccountCache('fire_sync_meta_v1',{})||{}
  revision=Number(savedMeta.revision)||0;dirty=!!savedMeta.dirty;changeVersion=Number(savedMeta.changeVersion)||0
  applySaved(storage.get('state', null))
  const wishlist = readWishlist()
  if (wishlist) state.items = wishlist
  uni.setStorageSync(WISHLIST_KEY,state.items)
  HeroDay(state)
  state.ready = true
  // 迁移只对已有状态落盘；首次安装保留空白 seed。
  if (storage.get('state', null)) writeLocal(serializableState())
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
    if (saved.profile) {
      state.profile = { ...state.profile, ...saved.profile }
      if (!validateNickname(state.profile.name).ok) state.profile.name = '自由的旅人'
    }
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

let saveTimer = null
let sessionEpoch = 0
let restoreReady = false
let revision = 0
let dirty = false
let changeVersion = 0
let restoreTask = null
let writeQueue = Promise.resolve()

function meta() { return {revision,dirty,changeVersion} }
function saveMeta() { writeAccountCache('fire_sync_meta_v1',meta()) }
function equivalentState(left,right){
  const ignored=new Set(['membership','ready','cloudSync'])
  const normalize=value=>{
    if(Array.isArray(value))return value.map(normalize)
    if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])]))
    return value
  }
  const clean=value=>Object.fromEntries(Object.entries(value||{}).filter(([key])=>!ignored.has(key)))
  return JSON.stringify(normalize(clean(left)))===JSON.stringify(normalize(clean(right)))
}
function meaningful(value) {
  return !!(value.financeEntered || ['assets','monthlyDeposit','retirementExpense','income','expense','goal'].some(key=>Number(value.finance?.[key])>0) || value.ledger?.length || value.items?.length || value.assetHistory?.length ||
    value.aiChats?.length || value.completed?.length || value.goalPlan || value.goalDraft || value.reading || value.personality?.completed ||
    Object.keys(value.monthlyTargets||{}).length || value.soundEnabled===false || value.privacySettings?.cloudSync===false ||
    Object.keys(value.personalityTests||{}).length || value.profile?.nicknameUpdatedAt)
}
export function suspendAccountSync() {
  sessionEpoch++
  restoreReady=false
  restoreTask=null
  clearTimeout(saveTimer);saveTimer=null
}
export function endAccountSession() {
  if(accountId()){writeLocal(serializableState());saveMeta()}
  suspendAccountSync()
  uni.removeStorageSync('fire_account_uid')
  applySaved(null)
  state.ready=true
  uni.setStorageSync(WISHLIST_KEY,[])
}
export async function syncStateToServer() {
  const uid=accountId(),epoch=sessionEpoch
  if(!uid || !restoreReady){
    state.cloudSync={status:'error',message:'尚未恢复账号数据，本机记录已保留，请先重试恢复'}
    return {synced:false,blocked:true}
  }
  const task=writeQueue.catch(()=>{}).then(async()=>{
    if(accountId()!==uid||epoch!==sessionEpoch)return {synced:false,blocked:true}
    const snapshot=serializableState(),version=changeVersion
    if(!dirty)return {synced:true,skipped:true}
    if(!meaningful(snapshot)&&revision===0){
      dirty=false;saveMeta()
      state.cloudSync={status:'empty',message:'尚无财务存档，填写资料后会自动同步'}
      return {synced:true,skipped:true}
    }
    state.cloudSync={status:'syncing',message:'正在同步，本机副本已保留'}
    try{
      const result=await saveUserState(snapshot,revision)
      if(accountId()!==uid||epoch!==sessionEpoch)return {synced:false,blocked:true}
      revision=result.revision
      if(changeVersion===version)dirty=false
      saveMeta()
      state.cloudSync=dirty?{status:'pending',message:'还有本机修改等待同步'}:{status:'synced',message:'已与账号云端同步'}
      return {synced:!dirty}
    }catch(error){
      if(accountId()===uid&&epoch===sessionEpoch){
        state.cloudSync={status:'error',message:error.message||'同步失败，本机记录已保留'}
        saveMeta()
      }
      return {synced:false,error}
    }
  })
  writeQueue=task
  return task
}

// Membership is server-owned; refresh it without marking financial data dirty or changing revisions.
function applyServerMembership(membership,uid,epoch) {
  if(accountId()!==uid||epoch!==sessionEpoch)throw new Error('账号已切换，已取消旧账号的会员更新')
  if(!membership||typeof membership.active!=='boolean')throw new Error('云端会员状态格式无效')
  state.membership={...membership}
  writeLocal(serializableState())
}
export async function refreshMembershipFromServer() {
  const uid=accountId(),epoch=sessionEpoch
  if(!uid)return null
  const membership=await fetchMembership()
  applyServerMembership(membership,uid,epoch)
  return membership
}
export async function redeemMembershipForAccount(code) {
  const uid=accountId(),epoch=sessionEpoch
  if(!uid)throw new Error('请先登录后兑换')
  const result=await redeemMembershipCode(code)
  applyServerMembership(result.membership,uid,epoch)
  return result
}

export async function hydrateFromServer() {
  const epoch=sessionEpoch
  if(restoreTask && restoreTask.epoch===epoch)return restoreTask.promise
  const promise=(async()=>{
    const beforeOwner=accountId(),beforeVersion=changeVersion
    restoreReady=false
    state.cloudSync={status:'restoring',message:'正在恢复账号数据'}
    try{
      const remote=await fetchAccountBootstrap()
      if(epoch!==sessionEpoch || accountId()!==beforeOwner)return {loaded:false,cancelled:true}
      if(!remote.uid||typeof remote.exists!=='boolean'||!Number.isSafeInteger(remote.revision)||
        (remote.exists && (!remote.state || typeof remote.state.finance!=='object'||!Array.isArray(remote.state.ledger)))||
        (!remote.exists && remote.state!==null))throw new Error('云端存档格式异常，本机副本已保留，未覆盖数据')
      preserveLegacyCache()
      const adopted=adoptVerifiedLegacyCache(remote.uid,remote.email)
      activateAccount(remote.uid)
      const local=storage.get('state',null)
      const localMeta=readAccountCache('fire_sync_meta_v1',{})||{}
      // A response may not replace local edits made while the request was in flight.
      if(beforeOwner===remote.uid && changeVersion!==beforeVersion){
        writeLocal(serializableState());dirty=true;saveMeta()
        throw new Error('读取期间有新的本机修改，已保留，请再次同步')
      }
      const remoteRevision=remote.revision
      dirty=(!!localMeta.dirty && meaningful(local)) || adopted || (!!local && meaningful(local) && !remote.exists)
      changeVersion=Number(localMeta.changeVersion)||0
      if(localMeta.dirty && meaningful(local) && remote.exists && Number(localMeta.revision)!==remoteRevision){
        if(equivalentState(local,remote.state))dirty=false
        else{
          revision=Number(localMeta.revision)||0
          applySaved(local);state.ready=true;writeWishlist(state.items)
          throw new Error('另一设备也更新了存档，已保留本机与云端两份资料，请联系客服核对后合并')
        }
      }
      revision=remoteRevision
      applySaved(dirty&&local ? local : remote.exists ? remote.state : local)
      if(remote.membership && typeof remote.membership.active==='boolean')state.membership={...remote.membership}
      state.ready=true
      HeroDay(state)
      writeLocal(serializableState());saveMeta()
      restoreReady=true
      state.cloudSync=dirty?{status:'pending',message:'本机修改已保留，等待同步'}:remote.exists?{status:'synced',message:'已恢复当前账号的数据'}:{status:'empty',message:'尚无财务存档，填写资料后会自动同步'}
      if(dirty)await syncStateToServer()
      return {loaded:true,exists:remote.exists,uid:remote.uid}
    }catch(error){
      if(epoch===sessionEpoch)state.cloudSync={status:'error',message:error.message||'恢复失败，本机数据已保留'}
      console.warn('[account-restore]',error.code||error.message)
      return {loaded:false,error}
    }
  })()
  restoreTask={epoch,promise}
  try{return await promise}finally{if(restoreTask?.promise===promise)restoreTask=null}
}
function saveLocalChange() {
  if(!accountId())return false
  const plain=serializableState()
  const previous=storage.get('state',null)
  if(JSON.stringify(previous)===JSON.stringify(plain))return true
  dirty=true;changeVersion++
  const success=writeLocal(plain);saveMeta()
  if(success)state.cloudSync={status:'pending',message:'本机已保存，等待云端确认'}
  return success
}
export function persistNow() {
  clearTimeout(saveTimer);saveTimer=null
  try{
    const success=saveLocalChange()
    if(success)syncStateToServer()
    return success
  }catch(error){console.warn('[persist-now]',error);return false}
}
export function persist() {
  clearTimeout(saveTimer)
  // Commit to the account-scoped cache immediately; do not lose edits on a quick page exit.
  try{if(!saveLocalChange())return}catch(error){console.warn('[persist-local]',error);return}
  const epoch=sessionEpoch
  saveTimer=setTimeout(()=>{saveTimer=null;if(epoch===sessionEpoch)syncStateToServer()},120)
}
export function reset() {
  // This operation clears local state only. It must never erase the cloud account.
  suspendAccountSync()
  applySaved(null);state.ready=true
}
