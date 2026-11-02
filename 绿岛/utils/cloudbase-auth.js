import { reportSessionExpiry } from './session-recovery.js'
import { accountTransportError } from './cloudbase-platform.js'

let cloudbaseModule = null
let app = null
let auth = null
let authTask = null

async function getAuth() {
  if(auth)return auth
  if(authTask)return authTask
  authTask=(async()=>{
    // #ifdef APP-PLUS
    const { createNativeCloudbase }=await import('./cloudbase-native.js')
    app=createNativeCloudbase(uni,()=>Date.now(),reportSessionExpiry)
    // #endif
    // #ifndef APP-PLUS
    if(!cloudbaseModule){
      const module=await import('@cloudbase/js-sdk')
      cloudbaseModule=module.default||module
    }
    app=cloudbaseModule.init({env:'ziyoukedu-d0gyrczqk4de53b87',region:'ap-shanghai'})
    // #endif
    auth=app.auth({persistence:'local'})
    return auth
  })()
  try{return await authTask}
  catch(error){
    authTask=null
    if(error && error.code)throw error
    throw accountTransportError(error,'init')
  }
}

// 保留命名导出，避免旧页面引用时报错；实际实例在首次调用时创建。
export { auth }

export async function sendVerificationCode(mode, value) {
  if(mode!=='email')throw accountTransportError({code:'EMAIL_ONLY'},'auth')
  const client = await getAuth()
  return client.getVerification({ email: value })
}

export async function signInWithCode(mode, value, verificationCode, verificationInfo) {
  if(mode!=='email')throw accountTransportError({code:'EMAIL_ONLY'},'auth')
  const client = await getAuth()
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

async function invokeAccountData(data) {
  const client = await getAuth()
  const login = await client.getLoginState()
  if (!login || !login.user || !login.user.uid) {
    const error=new Error('登录状态已失效，请重新登录后恢复数据');error.code='AUTH_REQUIRED';throw error
  }
  const expected=String(data.expectedUid||login.user.uid)
  if(expected!==String(login.user.uid)){
    const error=new Error('账号已切换，已取消旧账号的数据操作');error.code='ACCOUNT_MISMATCH';throw error
  }
  const token = await client.getAccessToken()
  const current=await client.getLoginState()
  if(String(current?.user?.uid||'')!==String(login.user.uid)){
    const error=new Error('账号已切换，请在当前账号重试');error.code='ACCOUNT_MISMATCH';throw error
  }
  const value=typeof token==='string'?token:token && (token.accessToken||token.access_token)
  if(value)uni.setStorageSync('fire_access_token',value)
  let response
  try { response=await app.callFunction({name:'accountData',data}) }
  catch(cause){
    const error=accountTransportError(cause,'invoke')
    console.warn('[account-function]',{code:error.code,stage:error.stage})
    try{uni.setStorageSync('fire_last_account_error',{code:error.code,stage:error.stage,at:Date.now()})}catch(ignore){}
    throw error
  }
  let result=response && response.result
  if(typeof result==='string'){try{result=JSON.parse(result)}catch(cause){throw accountTransportError({code:'INVALID_FUNCTION_RESPONSE'},'response')}}
  if(!result || result.ok!==true){
    const error=accountTransportError(result||{},'response')
    console.warn('[account-function]',{code:error.code,stage:error.stage})
    throw error
  }
  if(String(result.uid)!==String(login.user.uid)){
    const error=new Error('账号数据归属校验失败，已停止同步');error.code='ACCOUNT_MISMATCH';throw error
  }
  return result
}
export async function callAccountData(data) {
  const owner=String(uni.getStorageSync('fire_account_uid')||'')
  try {
    if(uni.getStorageSync('fire_reauth_pending_v1') && uni.getStorageSync('fire_login_status')!==true)throw accountTransportError({code:'AUTH_REQUIRED'},'session')
    return await invokeAccountData(data)
  }
  catch(cause) {
    const error=accountTransportError(cause,cause?.stage||'invoke')
    reportSessionExpiry(error,owner)
    throw error
  }
}
export async function getAccountAccessToken() {
  const owner=String(uni.getStorageSync('fire_account_uid')||'')
  try {
    if(uni.getStorageSync('fire_reauth_pending_v1')&&uni.getStorageSync('fire_login_status')!==true)throw accountTransportError({code:'AUTH_REQUIRED'},'session')
    const client=await getAuth(),login=await client.getLoginState()
    const uid=String(login?.user?.uid||'')
    if(!uid)throw accountTransportError({code:'AUTH_REQUIRED'},'session')
    if(owner&&uid!==owner)throw accountTransportError({code:'ACCOUNT_MISMATCH'},'session')
    const token=await client.getAccessToken()
    if(String((await client.getLoginState())?.user?.uid||'')!==uid)throw accountTransportError({code:'ACCOUNT_MISMATCH'},'session')
    const value=typeof token==='string'?token:token?.accessToken||token?.access_token
    if(!value)throw accountTransportError({code:'AUTH_REQUIRED'},'session')
    uni.setStorageSync('fire_access_token',value)
    return value
  } catch(cause) {
    const error=accountTransportError(cause,cause?.stage||'auth')
    reportSessionExpiry(error,owner)
    throw error
  }
}
export async function signOutAccountSession() {
  try { await (await getAuth()).signOut() } catch(error){ console.warn('[auth-signout]',error.code||'') }
}
