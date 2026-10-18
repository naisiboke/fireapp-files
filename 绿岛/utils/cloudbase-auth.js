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
export async function uploadAvatar(filePath) {
  if (!filePath) throw new Error('未选择头像')
  const loginState = await auth.getLoginState()
  if (!loginState || loginState.isLoggedIn === false) {
    throw new Error('登录状态已失效，请退出后重新登录')
  }
  const cloudPath = 'avatars/' + Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.jpg'
  let uploadPath = filePath
  // H5 的 uni.chooseImage 返回临时 URL，CloudBase 浏览器 SDK 需要 File 对象。
  if (typeof window !== 'undefined' && typeof filePath === 'string') {
    const response = await fetch(filePath)
    const blob = await response.blob()
    uploadPath = new File([blob], 'avatar.jpg', { type: blob.type || 'image/jpeg' })
  }
  const result = await app.uploadFile({ cloudPath, filePath: uploadPath })
  return result && (result.fileID || result.fileId || cloudPath)
}

export async function getAvatarURL(fileID) {
  if (!fileID) return ''
  const result = await app.getTempFileURL({ fileList: [fileID] })
  const item = result && result.fileList && result.fileList[0]
  return item && (item.tempFileURL || item.tempFileUrl || '')
}
