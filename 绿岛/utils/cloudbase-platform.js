// App-specific SDK options. VITE_* values are compiled into the APK.
// Use CloudBase mobile-application credentials only, never administrator/API-provider keys.
export function configureNativeCloudbase(sdk, adapter, uniRuntime, env = {}) {
  if (!sdk || typeof sdk.useAdapters !== 'function') {
    const error=new Error('App 云服务组件不兼容，请更新应用（APP_SDK_UNSUPPORTED）')
    error.code='APP_SDK_UNSUPPORTED';throw error
  }
  if (!uniRuntime || typeof uniRuntime.request !== 'function' || !adapter) {
    const error=new Error('App 网络适配组件不可用（APP_ADAPTER_UNAVAILABLE）')
    error.code='APP_ADAPTER_UNAVAILABLE';throw error
  }
  const appSign=String(env.VITE_CLOUDBASE_APP_SIGN||'').trim()
  const appAccessKey=String(env.VITE_CLOUDBASE_APP_ACCESS_KEY||'').trim()
  const rawId=String(env.VITE_CLOUDBASE_APP_ACCESS_KEY_ID||'').trim()
  const appAccessKeyId=Number(rawId)
  if(!appSign||!appAccessKey||!/^\d+$/.test(rawId)||!Number.isSafeInteger(appAccessKeyId)||appAccessKeyId<1){
    const error=new Error('App 云服务授权尚未配置，请联系开发者（APP_CONFIG_MISSING）')
    error.code='APP_CONFIG_MISSING';throw error
  }
  sdk.useAdapters(adapter,{uni:uniRuntime})
  return {appSign,appSecret:{appAccessKeyId,appAccessKey}}
}

export function accountTransportError(cause,stage='invoke') {
  let rawCode=cause && (cause.code||cause.errorCode)
  const message=String(cause && (cause.message||cause.errMsg)||'')
  if(!rawCode && message.trim().startsWith('{')){
    try{const parsed=JSON.parse(message);rawCode=parsed.code||parsed.errorCode}catch(ignore){}
  }
  if(!rawCode && /(?:XMLHttpRequest|Headers|Request|URLSearchParams|fetch).*not (?:defined|a function)/i.test(message))rawCode='APP_RUNTIME_UNSUPPORTED'
  if(!rawCode && /timeout|超时/i.test(message))rawCode='CLOUD_TIMEOUT'
  const candidate=String(rawCode||'CLOUD_CALL_FAILED')
  const code=/^[A-Z0-9_.:-]{1,64}$/i.test(candidate)?candidate:'CLOUD_CALL_FAILED'
  const messages={
    AUTH_REQUIRED:'登录已失效，请重新登录',
    ACCOUNT_MISMATCH:'账号已切换，旧请求已取消',
    SYNC_CONFLICT:'云端已有更新，本机记录已保留，请重试恢复',
    EMPTY_OVERWRITE:'已阻止空白数据覆盖存档，请重试恢复',
  }
  const error=new Error((messages[code]||'云端连接失败，本机记录已保留，请稍后重试')+'（'+code+'）')
  error.code=code
  error.stage=stage
  return error
}
