let cloudbaseModule = null
let app = null
let auth = null

async function getAuth() {
  if (auth) return auth
  try {
    if (!cloudbaseModule) {
      const module = await import('@cloudbase/js-sdk')
      cloudbaseModule = module.default || module
    }
    app = cloudbaseModule.init({
      env: 'ziyoukedu-d0gyrczqk4de53b87',
      region: 'ap-shanghai',
    })
    auth = app.auth({ persistence: 'local' })
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
