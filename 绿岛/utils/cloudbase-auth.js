import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({
  env: 'ziyoukedu-d0gyrczqk4de53b87',
  region: 'ap-shanghai',
})
export const auth = app.auth({ persistence: 'local' })

export function sendVerificationCode(mode, value) {
  return auth.getVerification(mode === 'phone' ? { phone_number: '+86 ' + value } : { email: value })
}

export function signInWithCode(mode, value, verificationCode, verificationInfo) {
  if (mode === 'phone') return auth.signInWithSms({ verificationInfo, verificationCode, phoneNum: '+86 ' + value })
  return auth.signInWithEmail({ verificationInfo, verificationCode, email: value })
}

export async function saveAuthToken() {
  const result = await auth.getAccessToken()
  if (result && result.accessToken) {
    uni.setStorageSync('fire_access_token', result.accessToken)
    return result.accessToken
  }
  throw new Error('登录令牌获取失败，请重试')
}
export async function getMediaURL(fileID) {
  if (!fileID) return ''
  const result = await app.getTempFileURL({ fileList: [fileID] })
  const item = result && result.fileList && result.fileList[0]
  return item && (item.tempFileURL || item.tempFileUrl || '')
}
