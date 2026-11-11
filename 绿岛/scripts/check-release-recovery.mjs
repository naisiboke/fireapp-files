// Run in 绿岛: node scripts/check-release-recovery.mjs
// Real recovery, native transport, form-draft, layout, calculator and update modules.
// Isolated storage/network/navigation only; no production write and no APK rendering.
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const checks=[]
function check(name,value){assert.ok(value,name);checks.push(name)}
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value))
const clean=code=>code.replace(/^\s*import\s+(?:(?:[\s\S]*?)\s+from\s+)?['"][^'"\n]+['"]\s*;?/gm,'')
 .replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class))/g,'').replace(/export\s*\{[^}]*\}/g,'')
function mod(path,names,deps={}){
 return new Function(...Object.keys(deps),clean(source(path))+'\nreturn {'+names.join(',')+'};')(...Object.values(deps))
}
const {resolveStatusInset}=mod('utils/page-layout.js',['resolveStatusInset'],{reactive:value=>value})
check('Android runtime status bar works even with zero CSS/safe-area inset',resolveStatusInset({statusBarHeight:28,safeAreaInsets:{top:0}})===28)
check('notch takes the larger real inset',resolveStatusInset({statusBarHeight:20,safeArea:{top:47}})===47)
check('an already inset viewport does not receive the status bar twice',resolveStatusInset({statusBarHeight:28,windowTop:28})===0)
check('ordinary H5 has no artificial status gap',resolveStatusInset({statusBarHeight:0,windowTop:0})===0)
check('unavailable metrics retain CSS fallback',resolveStatusInset({})===null)
check('bad runtime metrics do not move content offscreen',resolveStatusInset({statusBarHeight:NaN,safeArea:{top:9999}})===null)
const pages=JSON.parse(source('pages.json')).pages
for(const page of pages){
 const code=source(page.path+'.vue')
 check('page binds shared runtime inset: '+page.path,/:style="(?:pageLayoutStyle|\[pageLayoutStyle, pageStyle\])"/.test(code))
 check('page applies the common spacing after responsive rules: '+page.path,code.includes('var(--fire-page-top)')||code.includes('var(--fire-header-height)'))
}
const home=source('pages/index/index.vue')
check('home uses a quiet purpose line rather than a locale date',home.includes('class="masthead-date">让选择回到自己手中</text>')&&!home.includes('{{ todayText }}'))
check('empty finance state removes redundant placeholder prose',!home.includes('从了解自己开始')&&!home.includes('自由日：待填写')&&!home.includes('先填写你的财务数据'))

let owner='account-A',page={route:'pages/ledger/edit',options:{id:'entry/中文?&'}},storageFull=false
const memory=new Map([['fire_account_uid',owner],['fire_login_status',true],['private-saved-records',{asset:15000}]])
const routes=[],sequence=[]
const uni={
 getStorageSync:key=>copy(memory.get(key)),
 setStorageSync(key,value){if(storageFull)throw Error('storage full');memory.set(key,copy(value))},
 removeStorageSync:key=>memory.delete(key),
 reLaunch(options){sequence.push('redirect');routes.push(options.url);options.complete?.()},
}
const draft=mod('utils/session-drafts.js',['registerSessionDraft','flushSessionDrafts','currentPageRoute'],{
 uni,accountId:()=>owner,getCurrentPages:()=>[page],onShow(){},onUnload(){},console,
})
const recovery=mod('utils/session-recovery.js',['configureSessionRecovery','reportSessionExpiry','finishSessionRecovery','safeReturnRoute','isSessionExpired'],{...draft,uni})
const {accountTransportError}=mod('utils/cloudbase-platform.js',['accountTransportError'])
const {createNativeCloudbase}=mod('utils/cloudbase-native.js',['createNativeCloudbase'],{accountTransportError})
let form={amount:'123.45',note:'尚未保存的记账草稿'}
const registered=draft.registerSessionDraft(()=>form,value=>{form=value})
let preserveWorks=true
recovery.configureSessionRecovery({
 suspend(){sequence.push('suspend')},
 preserve(){sequence.push('save');return preserveWorks},
 expired(){sequence.push('expired')},
 failed(){sequence.push('save-failed')},
})
check('network timeout does not force reauthentication',!recovery.reportSessionExpiry({code:'CLOUD_TIMEOUT'},owner)&&routes.length===0)
check('policy rejection does not force reauthentication',!recovery.reportSessionExpiry({code:'ACTION_FORBIDDEN'},owner)&&routes.length===0)
check('old account response cannot redirect the current user',!recovery.reportSessionExpiry({code:'invalid_grant'},'account-B')&&routes.length===0)
let requests=0,mode='expired',refreshes=0,functions=0,expiryCalls=0,instant=1000
const session={uid:owner,accessToken:'old-token',refreshToken:'old-refresh',expiresAt:1}
memory.set('fire_native_auth_v1',session)
uni.request=options=>{
 requests++
 Promise.resolve().then(()=>{
  if(options.url.endsWith('/auth/v1/token')){
   refreshes++
   if(mode==='expired')return options.success({statusCode:400,data:{error:'invalid_grant'}})
   if(mode==='network')return options.fail({errMsg:'request:fail timeout'})
   return options.success({statusCode:200,data:{sub:owner,access_token:'new-token',refresh_token:'rotated',expires_in:7200}})
  }
  functions++
  if(mode==='forbidden')return options.success({statusCode:403,data:{code:'ACTION_FORBIDDEN'}})
  if(mode==='retry'&&options.header.Authorization==='Bearer old-token')return options.success({statusCode:401,data:{error:'AUTH_REQUIRED'}})
  options.success({statusCode:200,data:{ok:true,uid:owner,exists:false,state:null,revision:0}})
 })
}
let app=createNativeCloudbase(uni,()=>instant,(error,uid)=>{expiryCalls++;recovery.reportSessionExpiry(error,uid)})
const expired=await Promise.allSettled([app.auth().getAccessToken(),app.auth().getAccessToken(),app.auth().getAccessToken()])
check('invalid grant is diagnosed on every concurrent waiter',expired.every(item=>item.status==='rejected'&&item.reason.code==='invalid_grant'))
check('invalid refresh is attempted once and redirects once',refreshes===1&&expiryCalls===1&&routes.length===1)
check('local persistence finishes before redirect',sequence.indexOf('suspend')<sequence.indexOf('save')&&sequence.indexOf('save')<sequence.indexOf('redirect'))
check('invalid credentials are removed without clearing records',!memory.has('fire_native_auth_v1')&&memory.get('private-saved-records').asset===15000)
check('account ownership remains available for local recovery',memory.get('fire_account_uid')===owner&&memory.get('fire_login_status')===false)
const afterExpiry=requests
await app.auth().getAccessToken().catch(()=>{})
check('invalid credentials are not retried in a refresh loop',requests===afterExpiry)
const pending=memory.get('fire_reauth_pending_v1')
check('return route preserves encoded original record ID',pending.redirect==='/pages/ledger/edit?id='+encodeURIComponent('entry/中文?&'))
registered.release()
owner='account-B';memory.set('fire_account_uid',owner)
let restoredB=null
const regB=draft.registerSessionDraft(()=>({}),value=>{restoredB=value})
check('another account never receives the original form draft',restoredB===null)
check('switching accounts returns to home rather than the prior private record',recovery.finishSessionRecovery(owner,pending.redirect)==='/pages/index/index')
regB.release()
owner='account-A';memory.set('fire_account_uid',owner)
form={}
const regA=draft.registerSessionDraft(()=>form,value=>{form=value})
check('same account recovers the unsubmitted amount and text',form.amount==='123.45'&&form.note.includes('草稿'))
regA.clear();regA.release()
let restoredAgain=false
draft.registerSessionDraft(()=>({}),()=>{restoredAgain=true}).release()
check('successfully cleared draft is not resurrected',!restoredAgain)
memory.set('fire_reauth_pending_v1',pending)
check('same account returns to its original page and query',recovery.finishSessionRecovery(owner,'/pages/index/index')===pending.redirect)
for(const unsafe of ['https://evil.example','//evil.example','/pages/login/login','/pages/index/index#https://evil','/pages/not-real/index','/pages/index/index\\evil']){
 check('untrusted return route falls back safely: '+unsafe,recovery.safeReturnRoute(unsafe)==='/pages/index/index')
}
memory.set('fire_login_status',true);storageFull=true
check('failed draft persistence does not discard current form by navigating',!recovery.reportSessionExpiry({code:'invalid_grant'},owner)&&routes.length===1)
storageFull=false;preserveWorks=false
check('failed account persistence also keeps the current page',!recovery.reportSessionExpiry({code:'invalid_grant'},owner)&&routes.length===1)
preserveWorks=true
memory.set('fire_native_auth_v1',{...session,uid:owner,expiresAt:instant+7200000})
mode='retry';functions=0;refreshes=0;expiryCalls=0
app=createNativeCloudbase(uni,()=>instant,()=>expiryCalls++)
const retried=await app.callFunction({name:'accountData',data:{action:'bootstrap'}})
check('rejected access token refreshes once before any forced login',retried.result.ok&&functions===2&&refreshes===1&&expiryCalls===0)
check('the replacement refresh token persists',memory.get('fire_native_auth_v1').refreshToken==='rotated')
mode='forbidden'
await app.callFunction({name:'accountData',data:{action:'bootstrap'}}).catch(()=>{})
check('function permission denial does not clear a healthy login',expiryCalls===0&&!!memory.get('fire_native_auth_v1'))
mode='network';instant+=7200000
await app.auth().getAccessToken().catch(()=>{})
check('refresh timeout retains credentials for a later retry',expiryCalls===0&&!!memory.get('fire_native_auth_v1'))

const engine=mod('utils/engine.js',['FireEngine','GoalEngine','ReelCalendarParts','ReelParts','SaveAssetRecord','HeroDay'])
const finance=mod('utils/finance-plan.js',['validateFireForm','validateGoalForm','hasValidFinance','freedomResult','createFreedomPlan'],engine)
function calculator(saveWorks=true,task=''){
 const day='2026-11-20',snapshots=[],navigations=[],hooks={}
 const state={finance:{assets:0},financeEntered:false,profile:{},assetHistory:[],exp:0,hero:null,goalDraft:null,goalPlan:null}
 engine.HeroDay(state,day)
 const deps={...engine,...finance,state,AppFeedback:{},AnimatedNumber:{},refreshFinance(){},isMembershipActive:()=>false,
  reactive:value=>value,ref:value=>({value}),computed:get=>({get value(){return get()}}),
  useFeedbackPage:()=>1,useSessionDraft:()=>({clear(){}}),showNotice(){},dismissFeedback:()=>false,
  persistNow(){if(!saveWorks)return false;snapshots.push(copy(state));return true},
  LocalDay:()=>day,setTimeout:callback=>{callback();return 1},setInterval:()=>1,clearInterval(){},
  uni:{reLaunch:options=>navigations.push(options.url)},getCurrentPages:()=>[],
 }
 for(const name of ['onLoad','onShow','onHide','onUnload','onBackPress','onUnmounted'])deps[name]=fn=>{hooks[name]=fn}
 const script=clean(source('pages/calculator/index.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1])
 const page=new Function(...Object.keys(deps),script+'\nreturn {fire,calculate,errors};')(...Object.values(deps))
 hooks.onLoad({task})
 Object.assign(page.fire,{assets:'15000',monthlyDeposit:'2000',retirementExpense:'1000',rate:'4',withdrawal:'4'})
 return {page,state,snapshots,navigations}
}
const calc=calculator(true,'assets')
await calc.page.calculate()
check('financial-form save records cloud reward proof',calc.state.assetHistory[0].rewardVersion===1&&calc.state.exp===0&&calc.state.assetHistory[0].amount===15000)
check('finance, asset record and task persist together',calc.snapshots[0].finance.assets===15000&&calc.snapshots[0].assetHistory[0].confirmedAt>0&&calc.snapshots[0].exp===0)
check('task-mode financial form returns home after success',calc.navigations[0]==='/pages/index/index')
await calc.page.calculate()
check('recalculating the same asset balance never duplicates EXP',calc.state.exp===0&&calc.state.assetHistory.length===1)
const failedCalc=calculator(false,'assets'),beforeCalc=JSON.stringify(failedCalc.state)
await failedCalc.page.calculate()
check('failed financial save rolls back the asset reward and finance',JSON.stringify(failedCalc.state)===beforeCalc)
check('failed financial save retains input and current page',failedCalc.page.fire.assets==='15000'&&failedCalc.navigations.length===0&&failedCalc.page.errors.value[0].includes('保存失败'))

const {validateUpdate,createUpdateChecker}=mod('utils/app-update.js',['validateUpdate','createUpdateChecker'],{
 feedbackState:{},showDialog(){},showNotice(){},currentPageRoute:()=>'/pages/index/index',
})
const metadata={appId:'__UNI__6A9B0BE',android:{published:true,versionCode:102,versionName:'1.0.2',downloadUrl:'https://fireday.cn/fireday-1.0.2.apk',notes:['改进体验']}}
check('higher published Android version is offered',validateUpdate(metadata,101,'android').versionCode===102)
check('same version never prompts a reinstall',validateUpdate(metadata,102,'android')===null)
check('newer installed version never downgrades',validateUpdate(metadata,103,'android')===null)
check('unpublished package is never offered',validateUpdate({...metadata,android:{...metadata.android,published:false}},101,'android')===null)
check('metadata for another app is ignored',validateUpdate({...metadata,appId:'another-app'},101,'android')===null)
for(const url of ['http://fireday.cn/file.apk','https://evil.example/file.apk','https://fireday.cn.evil.example/file.apk','https://fireday.cn/file.exe','javascript:alert(1)']){
 let rejected=false
 try{validateUpdate({...metadata,android:{...metadata.android,downloadUrl:url}},101,'android')}catch(error){rejected=true}
 check('untrusted update URL is rejected: '+url,rejected)
}
let updateTime=172800000,eligible=true,feedbackOwner=1,fetchCount=0,dialogCount=0,noticeCount=0,openCount=0,confirm=false,document=metadata,networkFails=false,native=true
const updateCache=new Map()
const checkUpdate=createUpdateChecker({
 now:()=>updateTime,isNative:()=>native,eligible:()=>eligible,owner:()=>feedbackOwner,
 installed:()=>({code:101,name:'1.0.1',platform:'android'}),
 read:key=>updateCache.get(key),write:(key,value)=>updateCache.set(key,value),
 fetch:async()=>{fetchCount++;if(networkFails)throw Error('offline');return document},
 dialog:async()=>{dialogCount++;return {confirm}},notice:()=>noticeCount++,open:()=>openCount++,
})
await checkUpdate()
check('startup checks offer an optional update once',fetchCount===1&&dialogCount===1&&openCount===0)
await checkUpdate()
check('page changes do not repeatedly check or prompt',fetchCount===1&&dialogCount===1)
confirm=true
await checkUpdate(true)
check('settings manual check can reopen the prompt and follow download',dialogCount===2&&openCount===1)
eligible=false
await checkUpdate(true)
check('leaving an eligible page suppresses late update UI',dialogCount===2&&openCount===1)
eligible=true;networkFails=true
await checkUpdate()
check('automatic update network failure stays silent',noticeCount===0)
await checkUpdate(true)
check('manual update network failure gives useful feedback',noticeCount===1)
native=false
await checkUpdate(true)
check('H5 does not invoke native download code',openCount===1&&noticeCount===2)
check('release manifest uses the new identifiable build',source('manifest.json').includes('"versionCode" : "105"'))
check('repository release metadata remains unpublished until APK upload',JSON.parse(readFileSync(new URL('../../app-update.json',import.meta.url),'utf8')).android.published===false)
console.log(checks.length+' release recovery, spacing and update checks passed')
