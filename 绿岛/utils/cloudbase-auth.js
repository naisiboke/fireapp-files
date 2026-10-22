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
  if (host.localStorage) {
    if (!root.localStorage) {
      try { root.localStorage = host.localStorage } catch (e) {}
    }
    return
  }
  const memory = Object.create(null)
  const local = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null },
    setItem(key, value) { memory[String(key)] = String(value) },
    removeItem(key) { delete memory[String(key)] },
    clear() { Object.keys(memory).forEach(key => delete memory[key]) },
    key(index) { const keys = Object.keys(memory); return keys[index] || null },
  }
  try { Object.defineProperty(local, 'length', { get: () => Object.keys(memory).length }) } catch (e) {}
  try { Object.defineProperty(host, 'localStorage', { value: local, configurable: true, writable: true }) } catch (e) {
    try { host.localStorage = local } catch (ignore) {}
  }
  try { root.localStorage = host.localStorage || local } catch (e) {}
}

async function getAuth() {
  if (auth) return auth
  try {
    ensureBrowserStorage()
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

export async function saveAuthToken() {
  const result = await (await getAuth()).getAccessToken()
  const token = typeof result === 'string' ? result : result && result.accessToken
  if (token) {
    uni.setStorageSync('fire_access_token', token)
    return token
  }
  throw new Error('登录令牌获取失败，请重试')
}

export async function getMediaURL(fileID) {
  if (!fileID) return ''
  await getAuth()
  const result = await app.getTempFileURL({ fileList: [fileID] })
  const item = result && result.fileList && result.fileList[0]
  return item && (item.tempFileURL || item.tempFileUrl || '')
}
