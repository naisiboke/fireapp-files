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
    UNKNOWN_ACTION:'云端暂不支持此操作，请核对 accountData 的部署版本、入口和环境',
    DATABASE_REQUEST_FAILED:'云端数据库操作失败，请查看对应请求的集合、索引和权限诊断',
    NICKNAME_INVALID:'昵称格式不符合规则，请使用2–8个中文、字母或数字',
    NICKNAME_REJECTED:'昵称未通过审核，请换一个友善、清晰的名字',
    NICKNAME_COOLDOWN:'昵称暂未到可修改时间，请稍后再试',
    NICKNAME_RATE_LIMIT:'昵称审核请求过于频繁，请十分钟后重试',
    NICKNAME_CHANGED:'昵称已有更新，请重新打开个人资料',
    REVIEW_UNAVAILABLE:'昵称审核服务暂未就绪，请稍后重试或检查云端AI配置',
    AI_UNAVAILABLE:'AI 服务暂不可用，请稍后重试',
    AI_BUSY:'上一次回答仍在处理中，请稍候',
    AI_DAILY_LIMIT:'今日免费额度已用完，请查看会员权益',
    AI_INPUT_INVALID:'请输入不超过2000个字符的问题',
    AI_REQUEST_EXPIRED:'本次AI请求已过期，请重新发送',
    REDEEM_DOCUMENT_ID:'请填写 code 字段的兑换码，不是数据库 _id',
    REDEEM_INVALID:'兑换码格式或配置不正确，请检查后重试',
    REDEEM_NOT_FOUND:'兑换码不存在，请填写完整兑换码',
    REDEEM_USED:'兑换码已使用或已停用',
    REDEEM_DUPLICATE:'兑换码配置重复，请联系客服',
    REDEEM_DURATION_INVALID:'兑换码有效天数配置有误，请联系客服',
    REDEEM_EXPIRED:'兑换码已过期',
    REDEEM_RATE_LIMIT:'兑换尝试过于频繁，请十分钟后重试',
    REDEEM_NOT_NEEDED:'当前会员无到期限制，无需兑换',
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
    invalid_grant:'登录已过期，本机记录已保留，请重新登录以恢复同步',
    access_token_expired:'登录凭证已过期，请重新登录以恢复同步',
    invalid_refresh_token:'登录已过期，请重新获取邮箱验证码',
    refresh_token_expired:'登录已过期，请重新获取邮箱验证码',
    AUTH_REQUIRED:'登录已失效，请重新登录',
    ACCOUNT_MISMATCH:'账号已切换，旧请求已取消',
    SYNC_CONFLICT:'云端已有更新，本机记录已保留，请重试恢复',
    EMPTY_OVERWRITE:'已阻止空白数据覆盖存档，请重试恢复',
  }
  const knownCollections=new Set(['user_states','user_collections','data_backups','community_posts','action_rewards','vip_codes','vip_redemptions','account_deletion_requests'])
  const knownOperations=new Set(['read','list','snapshot-backup','save','post-backup','post-save','review-status-save','publication-save'])
  const diagnostic=cause&&cause.diagnostic
  const reasons={COLLECTION_MISSING:'缺少集合',INDEX_REQUIRED:'需配置索引',ACCESS_DENIED:'访问权限不足',CHECK_DATABASE_LOG:'请查云函数日志'}
  const safeDiagnostic={}
  if(diagnostic&&typeof diagnostic==='object'){
    if(knownCollections.has(diagnostic.collection)&&knownOperations.has(diagnostic.operation)){
      safeDiagnostic.collection=diagnostic.collection
      safeDiagnostic.operation=diagnostic.operation
      if(Object.prototype.hasOwnProperty.call(reasons,diagnostic.reason))safeDiagnostic.reason=diagnostic.reason
    }
    for(const key of ['serviceBuild','action','requestId']){
      if(typeof diagnostic[key]==='string'&&/^[A-Za-z0-9_.:-]{1,80}$/.test(diagnostic[key]))safeDiagnostic[key]=diagnostic[key]
    }
  }
  let detail=''
  if(code==='DATABASE_REQUEST_FAILED'&&safeDiagnostic.collection){
    detail='；'+safeDiagnostic.collection+' / '+safeDiagnostic.operation
    if(safeDiagnostic.reason)detail+='：'+reasons[safeDiagnostic.reason]
  }
  const error=new Error((messages[code]||'云端连接失败，本机记录已保留，请稍后重试')+detail+'（'+code+'）')
  error.code=code
  error.stage=stage
  // invokeAccountData and callAccountData both normalize errors. Keep only the
  // approved metadata so a second pass retains the database step without raw payloads.
  if(Object.keys(safeDiagnostic).length)error.diagnostic=safeDiagnostic
  return error
}
