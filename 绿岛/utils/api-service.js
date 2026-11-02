import { reportSessionExpiry } from './session-recovery.js'
import { callAccountData, getAccountAccessToken } from './cloudbase-auth.js'
import { accountId } from './account-cache.js'
// 统一云端数据服务入口。未配置地址时明确失败，不伪造保存成功。
const DEFAULT_API_BASE_URL = 'https://ziyoukedu-d0gyrczqk4de53b87-1311439378.ap-shanghai.app.tcloudbase.com/api'
export class ApiUnavailableError extends Error {
  constructor(message = '云端服务尚未配置，请稍后重试') { super(message); this.name = 'ApiUnavailableError'; this.code = 'API_NOT_CONFIGURED' }
}
export function getApiBaseUrl() {
  try { const value = uni.getStorageSync('fire_api_base_url'); return typeof value === 'string' && value.trim() ? value.trim().replace(/\/$/, '') : DEFAULT_API_BASE_URL } catch (e) { return DEFAULT_API_BASE_URL }
}
export function isApiConfigured() { return Boolean(getApiBaseUrl()) }
function accessToken() { try { return uni.getStorageSync('fire_access_token') || uni.getStorageSync('fire_login_token') || '' } catch (e) { return '' } }
function tokenSubject(token) {
  try {
    const part = String(token || '').split('.')[1]
    if (!part) return ''
    const encoded = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=').split('').map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2)).join('')))
    const payload = JSON.parse(json)
    return String(payload.sub || payload.openid || payload.user_id || payload.uid || '')
  } catch (e) { return '' }
}
function clientId() {
  // Used only by the legacy AI/payment API. Data ownership is verified by accountData.
  const uid=accountId() || tokenSubject(accessToken())
  return uid ? 'fire-user-' + uid : ''
}
export async function apiRequest(path, options = {}) {
  const base = getApiBaseUrl(); if (!base) return Promise.reject(new ApiUnavailableError())
  const owner=accountId()
  const freshToken=await getAccountAccessToken()
  if(owner!==accountId())throw new Error('账号已切换，旧请求已取消')
  const separator = path.includes('?') ? '&' : '?'
  const url = base + (path.startsWith('/') ? path : '/' + path) + separator + 'clientId=' + encodeURIComponent(clientId())
  const headers = { Accept: 'application/json', ...(options.header || {}) }; const token = freshToken; if (token) headers.Authorization = 'Bearer ' + token
  const payload = options.data === undefined ? undefined : JSON.stringify(options.data)
  if (payload !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'text/plain;charset=UTF-8'
  return new Promise((resolve, reject) => uni.request({ url, method: options.method || 'GET', data: payload, header: headers, timeout: options.timeout || 12000,
    success: (response) => { if(owner!==accountId())return reject(new Error('账号已切换，旧请求已取消')); const code = Number(response.statusCode || 0); if (code >= 200 && code < 300) return resolve(response.data); const message = response.data && (response.data.message || response.data.error); const error = new Error(message || '云端服务请求失败（' + code + '）'); error.statusCode = code;
      // Only explicit account-auth errors trigger reauthentication. A provider's 401/403 does not.
      const authCode=response.data?.code||response.data?.errorCode
      if(['AUTH_REQUIRED','invalid_refresh_token','refresh_token_expired','invalid_grant'].includes(authCode)){error.code=authCode;reportSessionExpiry(error,owner)}
      reject(error) },
    fail: (error) => reject(new Error(error && error.errMsg ? error.errMsg : '无法连接云端服务')),
  }))
}
const revisions = new Map()
const collectionWrites = new Map()
function revisionKey(name,uid=accountId()){return uid+':'+name}
function assertOwner(uid){if(accountId()!==uid)throw new Error('账号已切换，已取消旧账号的数据操作')}
export async function fetchAccountBootstrap(){return callAccountData({action:'bootstrap'})}
export async function fetchUserState(){
  const result=await fetchAccountBootstrap()
  assertOwner(result.uid)
  return result
}
export async function saveUserState(state,revision) {
  const uid=accountId()
  if(!uid)throw new Error('请先登录')
  const result=await callAccountData({action:'state.save',state,revision,expectedUid:uid})
  assertOwner(uid)
  return result
}
export async function fetchPrivacySettings(){const result=await fetchUserState();return result.state?.privacySettings||{}}
export async function savePrivacySettings(){throw new Error('隐私设置已随账户数据同步，请使用云端同步重试')}
export async function exportUserData(){return callAccountData({action:'user.export',expectedUid:accountId()})}
export async function deleteUserData(){throw new Error('清除本机缓存不会删除云端数据；如需删除请申请账号注销')}
export async function requestAccountDeletion(){return callAccountData({action:'deletion.request',expectedUid:accountId()})}

export async function askBehaviorAI(payload) {
  return apiRequest('/v1/ai/chat', { method: 'POST', data: payload, timeout: 30000 })
}
export async function fetchMembership() {
  const uid=accountId()
  if(!uid)throw new Error('请先登录后查看会员状态')
  const result=await callAccountData({action:'membership.get',expectedUid:uid})
  assertOwner(uid)
  return result.membership
}
export async function redeemMembershipCode(code) {
  const uid=accountId()
  if(!uid)throw new Error('请先登录后兑换')
  const result=await callAccountData({action:'membership.redeem',code,expectedUid:uid})
  assertOwner(uid)
  if(!result.membership||typeof result.membership.active!=='boolean')throw new Error('会员返回状态无效，请重试核对')
  return result
}
export async function createMembershipCheckout() {
  return apiRequest('/v1/me/membership/checkout', { method: 'POST', data: { plan: 'fire-life-monthly', price: 9 } })
}

export async function fetchUserCollection(name) {
  const uid=accountId()
  if(!uid)throw new Error('请先登录后恢复数据')
  if(name==='ugc'){
    let cursor=0,items=[]
    do {
      const result=await callAccountData({action:'posts.mine',cursor,expectedUid:uid})
      assertOwner(uid);items=items.concat(result.items||[]);cursor=result.nextCursor
    } while(cursor!==null && cursor!==undefined)
    return items
  }
  const result=await callAccountData({action:'collection.read',name,expectedUid:uid})
  assertOwner(uid)
  if(!Number.isSafeInteger(result.revision)||typeof result.exists!=='boolean')throw new Error('云端集合格式无效，未覆盖本机数据')
  revisions.set(revisionKey(name,uid),result.revision)
  return result.items
}
export async function saveUserCollection(name,items) {
  const uid=accountId(),key=revisionKey(name,uid)
  const task=(collectionWrites.get(key)||Promise.resolve()).catch(()=>{}).then(async()=>{
    assertOwner(uid)
    if(!uid || !revisions.has(key))throw new Error('尚未完成云端读取，本机修改已保留，恢复后再同步')
    const result=await callAccountData({action:'collection.save',name,items,revision:revisions.get(key),expectedUid:uid})
    assertOwner(uid);revisions.set(key,result.revision);return result
  })
  collectionWrites.set(key,task)
  return task
}
export async function deleteUserCollection(name){return saveUserCollection(name,null)}
export async function submitCommunityPost(post){
  const uid=accountId(),result=await callAccountData({action:'posts.submit',post,expectedUid:uid})
  assertOwner(uid);return result.post
}
export async function deleteCommunityPost(id){
  const uid=accountId(),result=await callAccountData({action:'posts.delete',id,expectedUid:uid})
  assertOwner(uid);return result
}
export async function fetchCommunityPosts(journey,cursor=0){
  const uid=accountId(),result=await callAccountData({action:'posts.public',journey,cursor,expectedUid:uid})
  assertOwner(uid);return result
}
