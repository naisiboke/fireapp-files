// 统一云端数据服务入口。未配置地址时明确失败，不伪造保存成功。
export class ApiUnavailableError extends Error {
  constructor(message = '云端服务尚未配置，请稍后重试') { super(message); this.name = 'ApiUnavailableError'; this.code = 'API_NOT_CONFIGURED' }
}
export function getApiBaseUrl() {
  try { const value = uni.getStorageSync('fire_api_base_url'); return typeof value === 'string' ? value.trim().replace(/\/$/, '') : '' } catch (e) { return '' }
}
export function isApiConfigured() { return Boolean(getApiBaseUrl()) }
function accessToken() { try { return uni.getStorageSync('fire_access_token') || uni.getStorageSync('fire_login_token') || '' } catch (e) { return '' } }
export function apiRequest(path, options = {}) {
  const base = getApiBaseUrl(); if (!base) return Promise.reject(new ApiUnavailableError())
  const headers = { 'Content-Type': 'application/json', ...(options.header || {}) }; const token = accessToken(); if (token) headers.Authorization = 'Bearer ' + token
  return new Promise((resolve, reject) => uni.request({ url: base + (path.startsWith('/') ? path : '/' + path), method: options.method || 'GET', data: options.data, header: headers, timeout: options.timeout || 12000,
    success: (response) => { const code = Number(response.statusCode || 0); if (code >= 200 && code < 300) return resolve(response.data); const message = response.data && (response.data.message || response.data.error); const error = new Error(message || '云端服务请求失败（' + code + '）'); error.statusCode = code; reject(error) },
    fail: (error) => reject(new Error(error && error.errMsg ? error.errMsg : '无法连接云端服务')),
  }))
}
function unwrapState(payload) { return payload && payload.state && typeof payload.state === 'object' ? payload.state : payload }
export async function fetchUserState() { return unwrapState(await apiRequest('/v1/me/state')) }
export async function saveUserState(state) { return apiRequest('/v1/me/state', { method: 'PUT', data: { state } }) }
export async function fetchPrivacySettings() { const payload = await apiRequest('/v1/me/privacy'); return payload && payload.settings ? payload.settings : payload }
export async function savePrivacySettings(settings) { return apiRequest('/v1/me/privacy', { method: 'PUT', data: { settings } }) }
export async function exportUserData() { return apiRequest('/v1/me/export') }
export async function deleteUserData() { return apiRequest('/v1/me/state', { method: 'DELETE' }) }
export async function requestAccountDeletion() { return apiRequest('/v1/me/deletion', { method: 'POST', data: { reason: 'user_requested' } }) }