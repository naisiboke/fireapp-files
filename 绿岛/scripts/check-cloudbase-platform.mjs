// Run in 绿岛: node scripts/check-cloudbase-platform.mjs
// Exercises actual native transport and auth wrapper with mocked official HTTPS responses.
// Does not access production, compile Vue, install SDKs, or validate an APK.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const checks=[]
function check(name,value){assert.ok(value,name);checks.push(name)}
const plain=code=>code.replace(/^import .*$/gm,'').replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let))/g,'').replace(/export\s*\{[^}]*\}/g,'')
const {accountTransportError}=new Function(plain(source('utils/cloudbase-platform.js'))+';return {accountTransportError}')()
const {createNativeCloudbase}=new Function('accountTransportError',plain(source('utils/cloudbase-native.js'))+';return {createNativeCloudbase}')(accountTransportError)
const BASE='https://ziyoukedu-d0gyrczqk4de53b87.api.tcloudbasegateway.com'
const KEY='fire_native_auth_v1'
const token=(uid='user-A',suffix='1')=>({sub:uid,access_token:'access-'+uid+'-'+suffix,refresh_token:'refresh-'+uid+'-'+suffix,expires_in:7200})
async function errorCode(task,code,name){
 let error
 try{await task()}catch(cause){error=cause}
 check(name,error?.code===code)
 return error
}
function fixture(saved=null){
 const storage=new Map(saved?[[KEY,saved]]:[])
 const requests=[]
 let instant=1000000, uid='user-A', isUser=true, mode='', gate=null
 const runtime={
  getStorageSync:key=>storage.get(key),
  setStorageSync:(key,value)=>storage.set(key,JSON.parse(JSON.stringify(value))),
  removeStorageSync:key=>storage.delete(key),
  request(options){
   requests.push(options)
   const path=options.url.slice(BASE.length)
   Promise.resolve().then(async()=>{
    check('requests stay on the fixed HTTPS environment host',options.url.startsWith(BASE+'/'))
    if(gate&&gate.path===path)return gate.pending(options)
    if(mode==='network')return options.fail({errMsg:'request:fail timeout token=private'})
    if(mode==='forbidden')return options.success({statusCode:403,data:{code:'ACTION_FORBIDDEN',message:'token=private'}})
    if(mode==='captcha')return options.success({statusCode:400,data:{error:'captcha_required',error_description:'private'}})
    let data={}
    if(path==='/auth/v1/verification'){
     check('verification sends email only',options.data.email==='a@example.com'&&!options.data.phone_number&&options.data.target==='ANY')
     data={verification_id:'verification-id',is_user:isUser}
    }else if(path==='/auth/v1/verification/verify'){
     check('verification code and challenge are paired',options.data.verification_id==='verification-id')
     if(options.data.verification_code!=='123456')return options.success({statusCode:400,data:{error:'invalid_verification_code'}})
     data={verification_token:'verified-email-token'}
    }else if(path==='/auth/v1/signin'||path==='/auth/v1/signup'){
     check('authentication uses verified email token',options.data.verification_token==='verified-email-token')
     if(path.endsWith('signup'))check('new registration uses verified email address',options.data.email==='a@example.com')
     data=token(uid)
    }else if(path==='/auth/v1/token'){
     check('refresh uses the refresh grant',options.data.grant_type==='refresh_token')
     data=token(uid,'2')
    }else if(path==='/v1/functions/accountData'){
     check('function is called as ordinary function with user authorization',options.header.Authorization.startsWith('Bearer access-')&&!options.url.includes('webfn=true'))
     check('review calls have enough request time',options.timeout===65000)
     data=mode==='wrong-owner'?{ok:true,uid:'user-B'}:{ok:true,uid,exists:false,state:null,revision:0}
     if(mode==='envelope')data={result:JSON.stringify(data)}
     if(mode==='malformed')data='<html>Error</html>'
    }else if(path==='/v1/storages/get-objects-download-info'){
     data=options.data.map(row=>({cloudObjectId:row.cloudObjectId,downloadUrl:'https://files.example/image.jpg'}))
    }else if(path!=='/auth/v1/user/signout')throw Error('Unexpected request path '+path)
    options.success({statusCode:200,data})
   }).catch(error=>options.fail(error))
  },
 }
 const app=createNativeCloudbase(runtime,()=>instant),auth=app.auth()
 return {app,auth,runtime,storage,requests,setMode:value=>mode=value,setUID:value=>uid=value,setNew:()=>isUser=false,
  expire(){instant+=7200000},
  hold(path){let release;const ready=new Promise(resolve=>release=resolve);gate={path,pending:options=>release(options)};return ready},
  async login(){const info=await auth.getVerification({email:'a@example.com'});return auth.signInWithEmail({email:'a@example.com',verificationCode:'123456',verificationInfo:info})},
 }
}
const f=fixture()
check('native session starts logged out',(await f.auth.getLoginState())===null)
const info=await f.auth.getVerification({email:' A@EXAMPLE.COM '})
await errorCode(()=>f.auth.signInWithEmail({email:'b@example.com',verificationCode:'123456',verificationInfo:info}),'EMAIL_VERIFICATION_MISMATCH','changed email cannot consume another email challenge')
await errorCode(()=>f.auth.signInWithEmail({email:'a@example.com',verificationCode:'000000',verificationInfo:info}),'invalid_verification_code','wrong code is rejected')
check('failed verification does not save a session',!f.storage.has(KEY))
const signed=await f.login()
check('login UID comes from server token response',signed.user.uid==='user-A')
check('refresh and access tokens persist in one record',f.storage.get(KEY).refreshToken==='refresh-user-A-1'&&f.storage.get(KEY).accessToken===signed.accessToken)
check('verification code and verification token are not stored',!JSON.stringify([...f.storage]).includes('123456')&&!JSON.stringify([...f.storage]).includes('verified-email-token'))
check('signed in session survives a new client instance',(await createNativeCloudbase(f.runtime).auth().getLoginState()).user.uid==='user-A')
check('native function result is accepted',(await f.app.callFunction({name:'accountData',data:{action:'bootstrap'}})).result.uid==='user-A')
f.setMode('envelope')
check('SDK result envelope is decoded',(await f.app.callFunction({name:'accountData',data:{action:'bootstrap'}})).result.ok===true)
f.setMode('malformed')
await errorCode(()=>f.app.callFunction({name:'accountData',data:{}}),'INVALID_FUNCTION_RESPONSE','malformed function response is rejected')
f.setMode('forbidden')
const denied=await errorCode(()=>f.app.callFunction({name:'accountData',data:{}}),'ACTION_FORBIDDEN','HTTP access policy denial remains actionable')
check('provider messages and tokens are not reflected in UI',!denied.message.includes('private'))
f.setMode('network')
await errorCode(()=>f.app.callFunction({name:'accountData',data:{}}),'CLOUD_TIMEOUT','network timeout is diagnosed')
f.setMode('')
const media=await f.app.getTempFileURL({fileList:['cloud://env/photo']})
check('native storage uses authenticated download API',media.fileList[0].tempFileURL==='https://files.example/image.jpg')
f.expire()
const before=f.requests.length
await Promise.all([f.auth.getAccessToken(),f.auth.getAccessToken(),f.auth.getAccessToken()])
check('concurrent refresh rotates once',f.requests.slice(before).filter(r=>r.url.endsWith('/auth/v1/token')).length===1)
check('rotated refresh token is persisted',f.storage.get(KEY).refreshToken==='refresh-user-A-2')
check('function writes are never retried silently',f.requests.every(r=>!r.url.includes('retry')))
const fresh=fixture();fresh.setNew();await fresh.login()
check('new verified email uses signup',fresh.requests.some(r=>r.url.endsWith('/auth/v1/signup'))&&!fresh.requests.some(r=>r.url.endsWith('/auth/v1/signin')))
const captcha=fixture();captcha.setMode('captcha')
await errorCode(()=>captcha.auth.getVerification({email:'a@example.com'}),'captcha_required','captcha is reported and never bypassed')
const refreshRace=fixture();await refreshRace.login();refreshRace.expire()
const waitRefresh=refreshRace.hold('/auth/v1/token')
const refreshing=refreshRace.auth.getAccessToken();const refreshRequest=await waitRefresh
await refreshRace.auth.signOut()
refreshRequest.success({statusCode:200,data:token('user-A','late')})
await errorCode(()=>refreshing,'ACCOUNT_MISMATCH','late refresh is rejected after logout')
check('late refresh cannot recreate cleared login session',!refreshRace.storage.has(KEY)&&(await refreshRace.auth.getLoginState())===null)
const wrongRefresh=fixture();await wrongRefresh.login();wrongRefresh.expire();wrongRefresh.setUID('user-B')
await errorCode(()=>wrongRefresh.auth.getAccessToken(),'ACCOUNT_MISMATCH','refresh cannot replace UID')
check('wrong-UID refresh does not overwrite prior record',wrongRefresh.storage.get(KEY).uid==='user-A')
const callRace=fixture();await callRace.login()
const waiting=callRace.hold('/v1/functions/accountData')
const pending=callRace.app.callFunction({name:'accountData',data:{action:'bootstrap'}});const callRequest=await waiting
await callRace.auth.signOut()
callRequest.success({statusCode:200,data:{ok:true,uid:'user-A'}})
await errorCode(()=>pending,'ACCOUNT_MISMATCH','late cloud response cannot revive logged out account')
check('logout sends revocation with user bearer token',callRace.requests.some(r=>r.url.endsWith('/auth/v1/user/signout')&&r.header.Authorization==='Bearer access-user-A-1'))
check('safe error codes do not echo URL secrets',accountTransportError({code:'https://host/?token=private'}).code==='CLOUD_CALL_FAILED')
function compile(native){
 let include=true
 return source('utils/cloudbase-auth.js').split('\n').filter(line=>{
  if(line.includes('// #ifdef APP-PLUS')){include=native;return false}
  if(line.includes('// #ifndef APP-PLUS')){include=!native;return false}
  if(line.includes('// #endif')){include=true;return false}
  return include
 }).join('\n')
}
function wrapper(native,fixture){
 const imports=[]
 const fake={auth:()=>fixture.auth,callFunction:options=>fixture.app.callFunction(options)}
 const code=plain(compile(native)).replace("await import('./cloudbase-native.js')","await load('native')").replace("await import('@cloudbase/js-sdk')","await load('sdk')")
 const api=new Function('accountTransportError','load','uni','console',code+';return {getAuth,sendVerificationCode,signInWithCode,saveAuthToken,callAccountData}')(
 accountTransportError,async name=>{imports.push(name);return name==='native'?{createNativeCloudbase:()=>fixture.app}:{default:{init:()=>fake}}},fixture.runtime,{warn(){}})
 return {api,imports}
}
const wf=fixture();await wf.login();const native=wrapper(true,wf)
await Promise.all([native.api.getAuth(),native.api.getAuth()])
check('App imports only native HTTP auth once',native.imports.join(',')==='native')
check('wrapper returns authenticated bootstrap',(await native.api.callAccountData({action:'bootstrap'})).uid==='user-A')
const count=wf.requests.length
await errorCode(()=>native.api.callAccountData({action:'state.save',expectedUid:'user-B'}),'ACCOUNT_MISMATCH','wrong expected UID blocks network request')
check('UID mismatch sends nothing',wf.requests.length===count)
wf.setMode('wrong-owner')
await errorCode(()=>native.api.callAccountData({action:'bootstrap'}),'ACCOUNT_MISMATCH','wrapper rejects wrong cloud owner')
await errorCode(()=>native.api.sendVerificationCode('phone','13800000000'),'EMAIL_ONLY','SMS entry is disabled before request')
await errorCode(()=>native.api.signInWithCode('phone','13800000000','123456',{}),'EMAIL_ONLY','SMS verification is disabled')
const web=wrapper(false,wf);await web.api.getAuth()
check('H5 still uses SDK and does not load native HTTP client',web.imports.join(',')==='sdk')
const login=source('pages/login/login.vue')
check('login has email form without other login entries',login.includes('邮箱验证码登录')&&!/微信登录|QQ\s*登录|手机号登录|mode\.value|signInWithSms/.test(login))
check('native auth has no appSign or browser dependency',!compile(true).includes('@cloudbase/js-sdk')&&!source('utils/cloudbase-native.js').includes('import.meta.env'))
console.log(checks.length+' native email/auth transport checks passed')
