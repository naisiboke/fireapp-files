// Run from 绿岛: node scripts/check-cloudbase-platform.mjs
// Isolated SDK mocks verify initialization order and error/data-ownership guards.
// Actual adapter requests and mobile credentials must also be verified on an APK.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const checks=[]
function check(name,value){assert.ok(value,name);checks.push(name)}
const helperSource=source('utils/cloudbase-platform.js').replace(/\bexport\s+/g,'')
const helpers=new Function(helperSource+'\nreturn {configureNativeCloudbase,accountTransportError};')()
const environment={VITE_CLOUDBASE_APP_SIGN:'mobile-app-test',VITE_CLOUDBASE_APP_ACCESS_KEY_ID:'1',VITE_CLOUDBASE_APP_ACCESS_KEY:'mobile-credential-test'}
const adapter={name:'official-adapter-mock'}
function build(native,env=environment){
 let state={imports:0,adapterImports:0,registrations:0,initializations:0,calls:0,events:[],mode:'success'}
 const storage=new Map()
 const uni={request(){throw Error('Unexpected legacy HTTP shim')},setStorageSync:(key,value)=>storage.set(key,value)}
 const auth={getLoginState:async()=>({user:{uid:'test-user'}}),getAccessToken:async()=>({accessToken:'test-session-token'})}
 const app={auth(options){check('session uses persistent SDK storage',options.persistence==='local');return auth},async callFunction(options){
  state.calls++;check('cloud call uses expected function',options.name==='accountData')
  if(state.mode==='failure')throw {code:'APP_PERMISSION_DENIED',message:'private token must not appear in UI'}
  if(state.mode==='malformed')return {result:'not-json'}
  if(state.mode==='wrong-owner')return {result:{ok:true,uid:'another-user'}}
  return {result:{ok:true,uid:'test-user'}}
 }}
 const sdk={useAdapters(received,options){state.registrations++;state.events.push('adapter');check('official adapter receives uni runtime',received===adapter&&options.uni===uni)},init(config){
  state.initializations++;state.events.push('init');state.config=config;return app
 }}
 let inApp=false
 const compiled=source('utils/cloudbase-auth.js').split('\n').filter(line=>{
  if(line.includes('// #ifdef APP-PLUS')){inApp=true;return false}
  if(line.includes('// #endif')){inApp=false;return false}
  return !inApp||native
 }).join('\n')
 .replace(/^import .+$/gm,'').replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let))/g,'').replace(/export\s*\{[^}]*\}/g,'')
 .replace("await import('@cloudbase/js-sdk')",'await loadSDK()')
 .replace("await import('@cloudbase/adapter-uni-app')",'await loadAdapter()')
 .replace(/import\.meta\.env/g,'environment')
 const api=new Function('configureNativeCloudbase','accountTransportError','loadSDK','loadAdapter','uni','environment','console',
 compiled+'\nreturn {getAuth,callAccountData};')(
 helpers.configureNativeCloudbase,helpers.accountTransportError,
 async()=>{state.imports++;return {default:sdk}},
 async()=>{state.adapterImports++;return {default:adapter}},uni,env,{warn(){}})
 return {api,state,storage}
}
const app=build(true)
await Promise.all([app.api.getAuth(),app.api.getAuth(),app.api.getAuth()])
check('concurrent App initialization is shared',app.state.initializations===1&&app.state.imports===1&&app.state.adapterImports===1)
check('adapter is registered before SDK init',app.state.events.join(',')==='adapter,init')
check('App init receives dedicated application credentials',app.state.config.appSign==='mobile-app-test'&&app.state.config.appSecret.appAccessKeyId===1)
check('dedicated App credential is passed without changing environment',app.state.config.appSecret.appAccessKey==='mobile-credential-test'&&app.state.config.env==='ziyoukedu-d0gyrczqk4de53b87')
check('authenticated function response is accepted',(await app.api.callAccountData({action:'bootstrap'})).uid==='test-user')
check('SDK session token is retained in local credential storage',app.storage.get('fire_access_token')==='test-session-token')
let mismatch
try{await app.api.callAccountData({action:'state.save',expectedUid:'other-user'})}catch(error){mismatch=error}
check('mismatched account is rejected before sending',mismatch?.code==='ACCOUNT_MISMATCH'&&app.state.calls===1)
app.state.mode='failure'
let failure
try{await app.api.callAccountData({action:'bootstrap'})}catch(error){failure=error}
check('original cloud error code remains diagnosable',failure?.code==='APP_PERMISSION_DENIED'&&failure.message.includes('APP_PERMISSION_DENIED'))
check('raw provider message is not exposed',!failure.message.includes('private token'))
check('stored diagnostics contain only code stage and time',Object.keys(app.storage.get('fire_last_account_error')).sort().join(',')==='at,code,stage')
app.state.mode='malformed'
try{await app.api.callAccountData({action:'bootstrap'})}catch(error){failure=error}
check('malformed cloud response has a safe code',failure.code==='INVALID_FUNCTION_RESPONSE')
app.state.mode='wrong-owner'
try{await app.api.callAccountData({action:'bootstrap'})}catch(error){failure=error}
check('returned owner check remains enforced',failure.code==='ACCOUNT_MISMATCH')
const web=build(false,{})
await web.api.getAuth()
check('H5 never imports or registers native adapter',web.state.adapterImports===0&&web.state.registrations===0)
check('H5 does not require or inject App credentials',!web.state.config.appSign&&!web.state.config.appSecret)
const absent={}
const missing=build(true,absent)
try{await missing.api.getAuth()}catch(error){failure=error}
check('missing App config fails explicitly before initialization',failure.code==='APP_CONFIG_MISSING'&&missing.state.initializations===0)
Object.assign(absent,environment)
await missing.api.getAuth()
check('failed initialization is retryable',missing.state.initializations===1)
for(const invalid of ['','abc','1.2','0','-1','9007199254740992']){
 try{helpers.configureNativeCloudbase({useAdapters(){}},adapter,{request(){}},{...environment,VITE_CLOUDBASE_APP_ACCESS_KEY_ID:invalid});throw Error('unexpected success')}
 catch(error){check('invalid credential version rejected: '+invalid,error.code==='APP_CONFIG_MISSING')}
}
check('missing browser APIs normalize to actionable diagnostic',helpers.accountTransportError({message:'XMLHttpRequest is not defined'}).code==='APP_RUNTIME_UNSUPPORTED')
check('JSON SDK errors retain their code',helpers.accountTransportError({message:'{"code":"INVALID_APP_SIGN","message":"hidden"}'}).code==='INVALID_APP_SIGN')
check('unsafe error codes are not reflected to users',helpers.accountTransportError({code:'https://host/?token=secret'}).code==='CLOUD_CALL_FAILED')
check('App initialization does not install handwritten browser shims',!source('utils/cloudbase-auth.js').includes('ensureRuntimeGlobals')&&!source('utils/cloudbase-auth.js').includes('root.fetch ='))
console.log(checks.length+' native CloudBase checks passed')
