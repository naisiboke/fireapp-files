export function accountTransportError(cause,stage='invoke') {
  let rawCode=cause && (cause.code||cause.errorCode||cause.error)
  const message=String(cause && (cause.message||cause.errMsg)||'')
  if(!rawCode && message.trim().startsWith('{')){
    try{const parsed=JSON.parse(message);rawCode=parsed.code||parsed.errorCode||parsed.error}catch(ignore){}
  }
  if(!rawCode && /(?:XMLHttpRequest|Headers|Request|URLSearchParams|fetch).*not (?:defined|a function)/i.test(message))rawCode='APP_RUNTIME_UNSUPPORTED'
  if(!rawCode && /timeout|超时/i.test(message))rawCode='CLOUD_TIMEOUT'
  const candidate=String(rawCode||'CLOUD_CALL_FAILED')
  const code=/^[A-Z0-9_.:-]{1,64}$/i.test(candidate)?candidate:'CLOUD_CALL_FAILED'
  const messages={
    EMAIL_ONLY:'目前仅支持邮箱验证码登录',
    EMAIL_VERIFICATION_MISMATCH:'邮箱已修改，请重新获取验证码',
    INVALID_AUTH_RESPONSE:'登录服务返回信息不完整，请重新获取验证码',
    ACTION_FORBIDDEN:'云端调用权限不足，本机记录已保留，请联系开发者',
    ACCESS_DENIED:'云端访问被拒绝，本机记录已保留，请联系开发者',
    invalid_verification_code:'验证码错误或已过期，请重新获取',
    invalid_argument:'请求信息无效，请检查邮箱及验证码后重试',
    user_not_found:'该邮箱尚未注册，请重新获取验证码',
    rate_limit_exceeded:'操作过于频繁，请稍后再试',
    captcha_required:'需要图形验证，请先使用网页版登录或稍后重试',
    invalid_refresh_token:'登录已过期，请重新获取邮箱验证码',
    refresh_token_expired:'登录已过期，请重新获取邮箱验证码',
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
