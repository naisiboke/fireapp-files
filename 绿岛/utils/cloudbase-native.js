import { accountTransportError } from './cloudbase-platform.js'

// Native requests use the documented CloudBase Auth v1 / Functions HTTP API.
// No browser globals, administrator keys, mobile app secrets, or anonymous login.
const BASE='https://ziyoukedu-d0gyrczqk4de53b87.api.tcloudbasegateway.com'
const SESSION_KEY='fire_native_auth_v1'
export function createNativeCloudbase(runtime, now=()=>Date.now()) {
  let session=runtime.getStorageSync(SESSION_KEY)||null
  if(!session||typeof session.uid!=='string'||!session.accessToken)session=null
  let generation=0, refreshTask=null
  const fail=(code,stage)=>{throw accountTransportError({code},stage)}
  const guard=version=>{if(version!==generation)fail('ACCOUNT_MISMATCH','session')}
  function request(path,data={},token='',method='POST',timeout=20000) {
    return new Promise((resolve,reject)=>{
      runtime.request({
        url:BASE+path,method,data,timeout,dataType:'json',
        header:{'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:'Bearer '+token}:{})},
        success(response){
          try{
            let body=response.data
            if(typeof body==='string'){try{body=body?JSON.parse(body):{}}catch(ignore){fail('INVALID_FUNCTION_RESPONSE','response')}}
            const status=Number(response.statusCode)
            if(status<200||status>=300||!Number.isFinite(status)||body?.error||body?.code){
              const code=body?.error?.code||body?.error||body?.code||(status===401?'AUTH_REQUIRED':'HTTP_'+status)
              throw accountTransportError({code},path.startsWith('/auth/')?'auth':'invoke')
            }
            resolve(body)
          }catch(error){reject(error)}
        },
        fail(cause){reject(accountTransportError(cause,'network'))},
      })
    })
  }
  function storeTokens(tokens,version,expectedUid='') {
    guard(version)
    if(typeof tokens?.sub!=='string'||!tokens.sub||typeof tokens.access_token!=='string'||!tokens.access_token||
      typeof tokens.refresh_token!=='string'||!tokens.refresh_token||!Number.isFinite(tokens.expires_in)||tokens.expires_in<=0)fail('INVALID_AUTH_RESPONSE','auth')
    if(expectedUid&&tokens.sub!==expectedUid)fail('ACCOUNT_MISMATCH','refresh')
    const next={uid:tokens.sub,accessToken:tokens.access_token,refreshToken:tokens.refresh_token,expiresAt:now()+tokens.expires_in*1000}
    // Persist the rotated refresh token as part of the same session record.
    runtime.setStorageSync(SESSION_KEY,next)
    session=next
    runtime.setStorageSync('fire_access_token',next.accessToken)
    return {user:{uid:next.uid},accessToken:next.accessToken}
  }
  async function getAccessToken(){
    if(!session)fail('AUTH_REQUIRED','auth')
    if(Number(session.expiresAt)>now()+60000)return {accessToken:session.accessToken}
    if(!session.refreshToken)fail('AUTH_REQUIRED','refresh')
    if(refreshTask)return refreshTask
    const version=generation, old=session
    const task=(async()=>{
      const result=await request('/auth/v1/token',{grant_type:'refresh_token',refresh_token:old.refreshToken})
      storeTokens(result,version,old.uid)
      return {accessToken:session.accessToken}
    })()
    refreshTask=task
    try{return await task}finally{if(refreshTask===task)refreshTask=null}
  }
  const client={
    async getVerification({email}){
      const address=String(email||'').trim().toLowerCase()
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))fail('EMAIL_ONLY','auth')
      const result=await request('/auth/v1/verification',{email:address,target:'ANY'})
      if(typeof result?.verification_id!=='string'||!result.verification_id)fail('INVALID_AUTH_RESPONSE','auth')
      return {...result,_email:address}
    },
    async signInWithEmail({email,verificationCode,verificationInfo}){
      const address=String(email||'').trim().toLowerCase()
      if(!verificationInfo?.verification_id||verificationInfo._email!==address)fail('EMAIL_VERIFICATION_MISMATCH','auth')
      const version=++generation
      refreshTask=null
      const verified=await request('/auth/v1/verification/verify',{
        verification_id:verificationInfo.verification_id,verification_code:verificationCode,
      })
      guard(version)
      if(typeof verified?.verification_token!=='string'||!verified.verification_token)fail('INVALID_AUTH_RESPONSE','auth')
      const fresh=verificationInfo.is_user!==true
      const tokens=await request(fresh?'/auth/v1/signup':'/auth/v1/signin',{
        verification_token:verified.verification_token,...(fresh?{email:address}:{}),
      })
      return storeTokens(tokens,version)
    },
    async getLoginState(){return session?{user:{uid:session.uid}}:null},
    getAccessToken,
    async signOut(){
      const token=session?.accessToken
      generation++;session=null;refreshTask=null
      runtime.removeStorageSync(SESSION_KEY)
      runtime.removeStorageSync('fire_access_token')
      if(token)await request('/auth/v1/user/signout',{},token)
    },
  }
  return {
    auth(){return client},
    async callFunction({name,data}){
      if(name!=='accountData')fail('INVALID_FUNCTION','invoke')
      const version=generation, uid=session?.uid
      const {accessToken}=await getAccessToken()
      guard(version)
      if(!uid||uid!==session?.uid)fail('ACCOUNT_MISMATCH','invoke')
      const body=await request('/v1/functions/accountData',data,accessToken,'POST',65000)
      guard(version)
      // The REST API returns the function result directly; accept the legacy SDK envelope too.
      let result=body?.result??body
      if(typeof result==='string'){try{result=JSON.parse(result)}catch(ignore){fail('INVALID_FUNCTION_RESPONSE','response')}}
      if(!result||typeof result.ok!=='boolean')fail('INVALID_FUNCTION_RESPONSE','response')
      return {result}
    },
    async getTempFileURL({fileList}){
      const version=generation
      const {accessToken}=await getAccessToken()
      guard(version)
      const rows=await request('/v1/storages/get-objects-download-info',fileList.map(cloudObjectId=>({cloudObjectId})),accessToken)
      guard(version)
      if(!Array.isArray(rows))fail('INVALID_FUNCTION_RESPONSE','response')
      return {fileList:rows.map(row=>({fileID:row.cloudObjectId,tempFileURL:row.downloadUrlEncoded||row.downloadUrl||''}))}
    },
  }
}
