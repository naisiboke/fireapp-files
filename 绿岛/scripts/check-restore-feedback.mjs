import {CONSENT_MESSAGE,consentRecord} from '../utils/login-consent.js'

import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import * as engine from '../utils/engine.js'
import{commitLedgerRecord,removeLedgerRecord}from'../utils/quiet-ledger.js'
import{offerLedgerDraft,takeLedgerDraft,cancelLedgerDraft}from'../utils/ledger-draft-handoff.js'
const checks=[],check=(name,value)=>{assert.ok(value,name);checks.push(name)}
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const clean=code=>code.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/gm,'')
const options=(path,deps)=>new Function(...Object.keys(deps),clean(src(path).match(/<script>([\s\S]*?)<\/script>/)[1]).replace('export default','return'))(...Object.values(deps))
const ref=value=>({value}),clone=value=>JSON.parse(JSON.stringify(value))
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}}
function vm(page){const value={...page.data(),$nextTick:fn=>fn?.()};for(const[k,get]of Object.entries(page.computed||{}))Object.defineProperty(value,k,{get:()=>get.call(value)});for(const[k,fn]of Object.entries(page.methods||{}))value[k]=fn.bind(value);return value}
const day='2026-11-08'
let uid='A',saveWorks=true,confirm=false,nav=[],notices=[]
const state={ledger:[],monthlyTargets:{'2026-11':{expense:300000,income:800000}},finance:{assets:15000},exp:17,cloudSync:{status:'synced'}}
const deps={...engine,LocalDay:()=>day,state,persistNow:()=>saveWorks,commitLedgerRecord,removeLedgerRecord,accountId:()=>uid,takeLedgerDraft,AppFeedback:{},feedbackPageMixin:{},showNotice:o=>notices.push(o.title),showDialog:async()=>({confirm}),dismissFeedback:()=>false,clearOptionsDraft(){},returnFromEntryPage:()=>nav.push('back'),setTimeout:()=>1,clearTimeout(){},uni:{getStorageSync:()=>true}}
const Editor=options('pages/ledger/edit.vue',deps),edit=vm(Editor);Editor.onLoad.call(edit,{});Editor.onShow.call(edit)
check('restored editor initially shows all categories without selecting one',edit.draft.category===null&&edit.categories.length>8)
edit.submit();check('save requires choosing a category first',state.ledger.length===0&&edit.errorText.includes('分类'))
edit.selectCategory('food');check('category immediately expands original numeric panel',edit.draft.category==='food'&&!edit.keyboardCollapsed)
edit.pressKey('3');edit.pressKey('0');check('original keypad enters amount directly',edit.draft.amount==='30')
edit.submit();check('numeric completion saves exactly one real expense',state.ledger.length===1&&state.ledger[0].cents===3000&&state.ledger[0].rewardVersion===1)
check('completion returns to category choice for quick consecutive entry',edit.draft.category===null&&edit.draft.amount===''&&nav.length===0)
check('quick bookkeeping leaves budgets, investment assets and EXP intact',state.finance.assets===15000&&state.exp===17&&state.monthlyTargets['2026-11'].income===800000)
edit.selectCategory('shopping');edit.pressKey('9');saveWorks=false;const before=clone(state);edit.submit()
check('failed save retains keypad input and all stored data',edit.draft.amount==='9'&&JSON.stringify(state)===JSON.stringify(before)&&edit.errorText.includes('保存失败'))
saveWorks=true;uid='B';edit.submit();check('an expired editor cannot save under another account',state.ledger.length===1&&edit.draft.amount==='9')
uid='A';const record=state.ledger[0];record.id=7
const legacy=vm(Editor);Editor.onLoad.call(legacy,{id:'7'});Editor.onShow.call(legacy)
check('numeric legacy record IDs are editable',legacy.editingId===7&&legacy.draft.amount==='30'&&!legacy.recordMissing)
confirm=false;await legacy.confirmDelete();check('cancel deletion preserves record',state.ledger.length===1)
confirm=true;await legacy.confirmDelete();check('confirmed delete writes a tombstone',state.ledger.length===0&&state.deletions.some(x=>x.id==='7')&&nav.at(-1)==='back')
const historic=vm(Editor);Editor.onLoad.call(historic,{month:'2026-10'});check('historic ledger keeps its selected month',historic.draft.date==='2026-10-01')
const missing=vm(Editor);Editor.onLoad.call(missing,{id:'missing'});Editor.onShow.call(missing);missing.submit();check('missing edit never becomes an accidental new record',missing.recordMissing&&state.ledger.length===0)
const ticket=offerLedgerDraft('A','2026-11',{amount:'99',category:'food',note:'保留输入'})
check('draft handoff never reaches another account',takeLedgerDraft('B','2026-11')===null)
check('draft handoff stays in the original month',takeLedgerDraft('A','2026-10')===null)
check('previous inline draft transfers once into the classic editor',takeLedgerDraft('A','2026-11').amount==='99'&&takeLedgerDraft('A','2026-11')===null)
const cancelled=offerLedgerDraft('A','2026-11',{amount:'1'});cancelLedgerDraft('A',cancelled);check('failed navigation retains no stale in-memory handoff',takeLedgerDraft('A','2026-11')===null)
const cs={hydrate:async()=>({ok:true}),publicPage:async()=>({items:[],stats:{doing:0,settled:0},nextCursor:null}),favorites:()=>[],netWorth:()=>null,syncState:{message:''}}
const createFeedCache=new Function(clean(src('utils/community-feed.js')).split('export const communityFeed')[0].replace('export function','function')+';return createFeedCache')()
const feedRows=new Map()
const communityFeed=createFeedCache({owner:()=>uid,read:(tab,id)=>feedRows.get(id+tab),write:(tab,value,id)=>feedRows.set(id+tab,value),fetchPage:(...args)=>cs.publicPage(...args)})
const Community=options('pages/community/index.vue',{state,CS:cs,accountId:()=>uid,communityFeed,LoadingSpinner:{},AppFeedback:{},FireOverlay:{},BottomTabs:{},feedbackPageMixin:{},pageEntryMixin:{},COMMUNITY_POST_TAGS:[],COMMUNITY_OFFICIAL:[],isMembershipActive:()=>false})
const community=vm(Community);community.ensureFeedOwner();community.allUGC=[{id:'existing',journey:'doing'}]
let waiting=deferred();cs.publicPage=()=>waiting.promise
const read=community.refreshCommunity(true);check('refresh immediately shows busy state while retaining visible data',community.publicLoading&&community.allUGC.length===1)
waiting.reject(Error('offline'));await read
check('feed failure always stops loading and retains existing posts',!community.publicLoading&&community.communitySyncMessage.includes('未更新')&&community.allUGC[0].id==='existing')
cs.publicPage=async()=>({items:[{id:'new',journey:'doing'}],stats:{doing:1,settled:0},nextCursor:1})
await community.refreshCommunity(true);check('successful refresh hides loader and replaces content',!community.publicLoading&&community.allUGC[0].id==='new'&&community.communitySyncMessage==='')
waiting=deferred();cs.publicPage=()=>waiting.promise;const more=community.loadMore()
check('pagination uses its own spinner state',community.publicLoading&&community.loadingMore)
const nextFeed=deferred();cs.publicPage=()=>nextFeed.promise;const newer=community.refreshCommunity(true)
waiting.resolve({items:[{id:'stale'}],nextCursor:null});await more
check('older pagination cannot stop a newer refresh spinner',community.publicLoading&&!community.loadingMore&&community.allUGC[0].id==='new')
nextFeed.reject(Error('offline'));await newer;check('newest failure releases the spinner',!community.publicLoading&&!community.loadingMore)
function loginFixture(){
 let auth=deferred(),restore=deferred(),authCalls=0
 const values=new Map(),local={cloudSync:{status:'synced'},profile:{},finance:{assets:15000}},routes=[],messages=[]
 const uni={getStorageSync:k=>values.get(k),setStorageSync:(k,v)=>values.set(k,v),removeStorageSync:k=>values.delete(k),reLaunch:o=>routes.push(o.url)}
 let script=clean(src('pages/login/login.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1]).replace('import.meta.env.DEV','false').replace("import('@/utils/community-store.js')","Promise.resolve({CS:{hydrate:async()=>{}}})")
 const inject={CONSENT_MESSAGE,consentRecord,ref,watch(){},onMounted(){},onBeforeUnmount(){},useFeedbackPage:()=>1,showNotice:o=>messages.push(o.title),state:local,persist(){},hydrateFromServer:()=>restore.promise,endAccountSession(){},sendVerificationCode:async()=>({id:'verified'}),signInWithCode:()=>{authCalls++;return auth.promise},saveAuthToken:async()=>{},safeReturnRoute:()=>'/pages/index/index',finishSessionRecovery:()=>'/pages/index/index',getCurrentPages:()=>[],uni,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){}}
 const api=new Function(...Object.keys(inject),script+';return{email,code,loading,loginAction,countdown,sendCode,login,resumeLogin,allowCode(){consentAccepted.value=true;verificationInfo={};sentEmail=account()}}')(...Object.values(inject))
 api.email.value='user@example.com';api.code.value='123456';api.allowCode()
 return{api,auth,restore,local,routes,messages,calls:()=>authCalls}
}
let login=loginFixture();const pending=login.api.login()
check('login button immediately owns a busy action',login.api.loading.value&&login.api.loginAction.value==='login')
await login.api.login();check('repeat tap sends no second authentication request',login.calls()===1)
login.auth.resolve({});await Promise.resolve();await Promise.resolve()
check('spinner remains active during account restoration',login.api.loading.value)
login.restore.resolve({loaded:true,uid:'A',email:'user@example.com'});await pending
check('successful login releases busy state after navigation',!login.api.loading.value&&login.api.loginAction.value===''&&login.routes[0]==='/pages/index/index'&&login.local.finance.assets===15000)
login=loginFixture();const failed=login.api.login();login.auth.reject(Error('验证码无效'));const oldError=console.error;console.error=()=>{};try{await failed}finally{console.error=oldError}
check('failed login restores the button and retains email and code',!login.api.loading.value&&login.api.email.value==='user@example.com'&&login.api.code.value==='123456'&&login.messages.at(-1)==='验证码无效')
login=loginFixture();const resume=login.api.resumeLogin();check('verified login restore has a distinct loading state',login.api.loading.value&&login.api.loginAction.value==='resume'&&login.calls()===0)
login.restore.resolve({loaded:false});await resume;check('failed account restore stops animation and remains retryable',!login.api.loading.value&&login.messages.length>0)
login=loginFixture();await login.api.sendCode();check('verification-code countdown remains sixty seconds',login.api.countdown.value===60)
const homeState={...state,goalPlan:{name:'车子',assets:0,amount:12000,monthlyDeposit:1000,expectedMonths:12,rate:0,calculatedAt:Date.parse(day+'T00:00:00Z')},homeCountdown:'fire'}
const Home=options('pages/index/index.vue',{...engine,state:homeState,persistNow:()=>saveWorks,AppFeedback:{},BottomTabs:{},AnimatedNumber:{},SpotlightGuide:{},CountdownSwitch:{},spotlightHomeMixin:{},pageEntryMixin:{},feedbackPageMixin:{},showNotice:o=>notices.push(o.title)})
let starts=0;const home={startCountdown:()=>starts++};const original=clone(homeState)
Home.methods.selectCountdown.call(home,'goal');check('goal toggle commits the selected mode',homeState.homeCountdown==='goal'&&starts===1)
Home.methods.selectCountdown.call(home,'goal');check('reselecting the active segment does not restart content',starts===1)
Home.methods.selectCountdown.call(home,'fire');check('FIRE toggle preserves goal and financial values',homeState.homeCountdown==='fire'&&JSON.stringify(homeState.goalPlan)===JSON.stringify(original.goalPlan)&&homeState.finance.assets===15000&&homeState.exp===17)
saveWorks=false;Home.methods.selectCountdown.call(home,'goal');check('failed toggle save restores the previous mode',homeState.homeCountdown==='fire'&&notices.at(-1).includes('切换未保存'));saveWorks=true
login=loginFixture();login.api.code.value=123456;const numericCode=login.api.login();check('numeric code values never crash the login handler',login.api.loading.value);login.auth.reject(Error('test'));console.error=()=>{};try{await numericCode}finally{console.error=oldError}
console.log(checks.length+' restored quick entry, login lifecycle, community race and countdown checks passed')
