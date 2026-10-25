let cloudbaseModule = null
let app = null
let auth = null

function ensureBrowserStorage() {
  if (typeof globalThis === 'undefined') return
  const root = globalThis
  if (typeof root.window === 'undefined') {
    try { root.window = root } catch (e) {}
  }
  const host = root.window || root
  let existing = null
  try { existing = host.localStorage } catch (e) {}
  if (existing) {
    try { root.localStorage = existing } catch (e) {}
    return
  }
  const prefix = '__fire_cloudbase_'
  const local = {
    getItem(key) {
      try {
        const value = uni.getStorageSync(prefix + String(key))
        return value === '' || value === null || value === undefined ? null : String(value)
      } catch (e) { return null }
    },
    setItem(key, value) {
      try { uni.setStorageSync(prefix + String(key), String(value)) } catch (e) {}
    },
    removeItem(key) {
      try { uni.removeStorageSync(prefix + String(key)) } catch (e) {}
    },
    clear() {
      try {
        const info = uni.getStorageInfoSync()
        ;(info.keys || []).filter(key => String(key).indexOf(prefix) === 0).forEach(key => uni.removeStorageSync(key))
      } catch (e) {}
    },
    key(index) {
      try {
        const info = uni.getStorageInfoSync()
        const keys = (info.keys || []).filter(key => String(key).indexOf(prefix) === 0)
        return keys[index] ? String(keys[index]).slice(prefix.length) : null
      } catch (e) { return null }
    },
  }
  try { Object.defineProperty(local, 'length', { get: () => { try { return (uni.getStorageInfoSync().keys || []).filter(key => String(key).indexOf(prefix) === 0).length } catch (e) { return 0 } } }) } catch (e) {}
  try { Object.defineProperty(host, 'localStorage', { value: local, configurable: true, writable: true }) } catch (e) {
    try { host.localStorage = local } catch (ignore) {}
  }
  try { Object.defineProperty(host, 'sessionStorage', { value: local, configurable: true, writable: true }) } catch (e) {}
  try { root.localStorage = host.localStorage || local; root.sessionStorage = host.sessionStorage || local } catch (e) {}
}


function ensureRuntimeGlobals() {
  if (typeof globalThis === 'undefined') return
  const root = globalThis
  if (typeof root.window === 'undefined') {
    try { root.window = root } catch (e) {}
  }
  if (typeof root.URL === 'undefined') {
    class URLSearchParamsCompat {
      constructor(value = '') {
        this.value = String(value).replace(/^\?/, '')
      }
      get(name) {
        const item = this.value.split('&').find(part => part.split('=')[0] === String(name))
        return item ? decodeURIComponent((item.split('=')[1] || '').replace(/\+/g, ' ')) : null
      }
      has(name) { return this.get(name) !== null }
      toString() { return this.value }
    }
    class URLCompat {
      constructor(value, base = '') {
        let text = String(value || '')
        if (base && !/^[a-z][a-z\d+.-]*:\/\//i.test(text)) {
          text = String(base).replace(/\/$/, '') + (text.startsWith('/') ? text : '/' + text)
        }
        const match = text.match(/^([a-z][a-z\d+.-]*:)?\/\/([^/?#]+)([^?#]*)?(\?[^#]*)?(#.*)?$/i)
        this.protocol = match ? (match[1] || 'http:') : ''
        this.host = match ? match[2] : ''
        this.hostname = this.host.split(':')[0]
        this.port = this.host.includes(':') ? this.host.split(':').pop() : ''
        this.pathname = match ? (match[3] || '/') : text
        this.search = match ? (match[4] || '') : ''
        this.hash = match ? (match[5] || '') : ''
        this.origin = this.protocol && this.host ? this.protocol + '//' + this.host : ''
        this.href = this.origin + this.pathname + this.search + this.hash
        this.searchParams = new URLSearchParamsCompat(this.search)
      }
      toString() { return this.href }
    }
    try { root.URL = URLCompat; root.URLSearchParams = URLSearchParamsCompat } catch (e) {}
    try { root.window.URL = root.URL; root.window.URLSearchParams = root.URLSearchParams } catch (e) {}
  }
  if (typeof root.fetch !== 'function' && typeof uni !== 'undefined' && uni.request) {
    class HeadersCompat {
      constructor(init = {}) { this.map = {}; Object.keys(init || {}).forEach(key => { this.map[String(key).toLowerCase()] = String(init[key]) }) }
      get(key) { return this.map[String(key).toLowerCase()] || null }
      set(key, value) { this.map[String(key).toLowerCase()] = String(value) }
      has(key) { return Object.prototype.hasOwnProperty.call(this.map, String(key).toLowerCase()) }
      forEach(callback) { Object.keys(this.map).forEach(key => callback(this.map[key], key, this)) }
    }
    root.fetch = (input, options = {}) => {
      const url = typeof input === 'string' ? input : input && input.url
      if (!url) return Promise.reject(new Error('URL is not defined'))
      const headers = {}
      const sourceHeaders = options.headers || {}
      if (typeof sourceHeaders.forEach === 'function') sourceHeaders.forEach((value, key) => { headers[key] = value })
      else Object.assign(headers, sourceHeaders)
      return new Promise((resolve, reject) => {
        uni.request({
          url,
          method: String(options.method || 'GET').toUpperCase(),
          header: headers,
          data: options.body,
          timeout: 15000,
          success(response) {
            const raw = response.data
            const responseHeaders = new HeadersCompat(response.header || {})
            resolve({
              status: Number(response.statusCode || 0),
              ok: Number(response.statusCode || 0) >= 200 && Number(response.statusCode || 0) < 300,
              statusText: '',
              headers: responseHeaders,
              json: () => Promise.resolve(typeof raw === 'string' ? JSON.parse(raw) : raw),
              text: () => Promise.resolve(typeof raw === 'string' ? raw : JSON.stringify(raw == null ? '' : raw)),
              clone() { return this },
            })
          },
          fail: reject,
        })
      })
    }
    try { root.window.fetch = root.fetch } catch (e) {}
  }
}

async function getAuth() {
  if (auth) return auth
  try {
    ensureBrowserStorage()
    ensureRuntimeGlobals()
    if (!cloudbaseModule) {
      const module = await import('@cloudbase/js-sdk')
      cloudbaseModule = module.default || module
    }
    app = cloudbaseModule.init({
      env: 'ziyoukedu-d0gyrczqk4de53b87',
      region: 'ap-shanghai',
    })
    auth = app.auth({ persistence: 'none' })
    return auth
  } catch (error) {
    const message = error && error.message ? error.message : '云端登录服务初始化失败'
    throw new Error(message)
  }
}

// 保留命名导出，避免旧页面引用时报错；实际实例在首次调用时创建。
export { auth }

export async function sendVerificationCode(mode, value) {
  const client = await getAuth()
  return client.getVerification(mode === 'phone' ? { phone_number: '+86 ' + value } : { email: value })
}

export async function signInWithCode(mode, value, verificationCode, verificationInfo) {
  const client = await getAuth()
  if (mode === 'phone') return client.signInWithSms({ verificationInfo, verificationCode, phoneNum: '+86 ' + value })
  return client.signInWithEmail({ verificationInfo, verificationCode, email: value })
}

export async function saveAuthToken(loginState = null) {
  let result = null
  try { result = await (await getAuth()).getAccessToken() } catch (error) {}
  const token = typeof result === 'string'
    ? result
    : (result && (result.accessToken || result.access_token))
      || (loginState && (loginState.accessToken || loginState.access_token || (loginState.loginState && loginState.loginState.accessToken)))
  if (token) {
    uni.setStorageSync('fire_access_token', token)
    return token
  }
  throw new Error('验证码已验证，但登录令牌获取失败，请重新获取验证码后重试')
}

export async function getMediaURL(fileID) {
  if (!fileID) return ''
  // App 端优先使用 uniCloud 原生接口，避免 WebView 中 SDK 的 fetch/localStorage 兼容差异。
  try {
    if (typeof uniCloud !== 'undefined' && typeof uniCloud.getTempFileURL === 'function') {
      const nativeResult = await uniCloud.getTempFileURL({ fileList: [fileID] })
      const nativeItem = nativeResult && nativeResult.fileList && nativeResult.fileList[0]
      const nativeURL = nativeItem && (nativeItem.tempFileURL || nativeItem.tempFileUrl || '')
      if (nativeURL) return nativeURL
    }
  } catch (error) {}
  await getAuth()
  const result = await app.getTempFileURL({ fileList: [fileID] })
  const item = result && result.fileList && result.fileList[0]
  return item && (item.tempFileURL || item.tempFileUrl || '')
}
