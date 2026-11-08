
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {pathToFileURL,fileURLToPath}from'node:url'
const tools=process.env.ENTRY_TOOLS||'/tmp/fire-entry-tools',root=fileURLToPath(new URL('..',import.meta.url)),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fire-entry-'))
fs.symlinkSync(path.join(tools,'node_modules'),path.join(temp,'node_modules'),'dir')
const deadline=setTimeout(()=>{console.error('Browser verification exceeded 180 seconds');process.exit(1)},180000)
const {createServer}=await import(pathToFileURL(path.join(tools,'node_modules/vite/dist/node/index.js')))
const {default:vue}=await import(pathToFileURL(path.join(tools,'node_modules/@vitejs/plugin-vue/dist/index.mjs')))
const {chromium}=await import(pathToFileURL(path.join(tools,'node_modules/playwright/index.mjs')))
fs.writeFileSync(path.join(temp,'index.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script type="module" src="/main.js"></script></html>')
fs.writeFileSync(path.join(temp,'store.js'),`
import {reactive}from'vue'
const q=new URLSearchParams(location.search),month='2026-11'
const fresh={financeEntered:true,homeCountdown:'fire',started:true,profile:{name:'测试用户'},privacySettings:{guardianAnimation:false},membership:{active:false},actionSync:{status:'idle'},actionRewards:{events:[],counters:{}},goalPlan:{id:'car',name:'车子',assets:1000,amount:12000,monthlyDeposit:1000,expectedMonths:12,rate:0,calculatedAt:Date.parse('2026-11-08T04:00:00Z')},ready:true,ledger:[],monthlyTargets:q.get('budget')==='1'?{[month]:{expense:300000,income:800000}}:{},items:[],finance:{assets:15000,retirementExpense:6000,monthlyDeposit:3000,expense:6000,income:8000,withdrawal:4,rate:8,goal:0},exp:17,cloudSync:{status:'synced',message:'已恢复当前账户的数据'},deletions:[]}
export const state=reactive(JSON.parse(localStorage.getItem('test-snapshot')||'null')||fresh)
export function persistNow(){if(window.saveFail)return false;localStorage.setItem('test-snapshot',JSON.stringify(state));window.saveCalls=(window.saveCalls||0)+1;return true}
export const persist=persistNow
export const refreshActions=async()=>null
`)

fs.appendFileSync(path.join(temp,'store.js'),`
export const refreshFinance=()=>{}
export const endAccountSession=()=>{}
export const syncStateToServer=async()=>({synced:true})
export async function hydrateFromServer(){
 window.restoreCalls=(window.restoreCalls||0)+1
 if(window.holdRestore)return new Promise((resolve,reject)=>{window.resolveRestore=resolve;window.rejectRestore=reject})
 return{loaded:true,uid:'A',email:'user@example.com'}
}
`)
fs.writeFileSync(path.join(temp,'community-store.js'),`
import{reactive}from'vue'
export const CS={
 syncState:reactive({message:''}),favorites:()=>[],netWorth:()=>null,draft:()=>null,ugc:()=>[],
 hydrate:async()=>({ok:true}),saveFavorites:()=>true,
 publicPage:async()=>{window.feedCalls=(window.feedCalls||0)+1;if(window.holdCommunity)return new Promise((resolve,reject)=>{window.resolveCommunity=resolve;window.rejectCommunity=reject});return{items:[],stats:{doing:0,settled:0},nextCursor:null}}
}
`)
fs.writeFileSync(path.join(temp,'auth.js'),`
export const sendVerificationCode=async()=>({id:'test-verification'})
export const saveAuthToken=async()=>{}
export function signInWithCode(kind,email,code){window.sentCode=code;window.authCalls=(window.authCalls||0)+1;return new Promise((resolve,reject)=>{window.resolveAuth=resolve;window.rejectAuth=reject})}
`)

fs.writeFileSync(path.join(temp,'uni-hooks.js'),"import{getCurrentInstance}from'vue';const hook=(name,fn)=>{const vm=getCurrentInstance();if(vm){vm.__screenHooks??={};(vm.__screenHooks[name]??=[]).push(fn)}};export const onLoad=fn=>hook('onLoad',fn);export const onShow=fn=>hook('onShow',fn);export const onHide=fn=>hook('onHide',fn);export const onUnload=fn=>hook('onUnload',fn);export const onBackPress=fn=>hook('onBackPress',fn);export const onResize=fn=>hook('onResize',fn)")
fs.writeFileSync(path.join(temp,'wishlist-reminder.js'),"import{reactive}from'vue';export const wishlistReminder=reactive({owner:null,uid:'',id:'',busy:false});export const maybePromptWishlist=()=>false;export const closeWishlistReminder=()=>{};export const answerWishlistReminder=()=>{}")
fs.writeFileSync(path.join(temp,'update.js'),"export const maybeCheckAppUpdate=()=>{}")
fs.writeFileSync(path.join(temp,'main.js'),`
import{createApp,defineComponent,h,ref,shallowRef,nextTick}from'vue'
import {state}from'@/store/index.js'
import {feedbackState,closeDialog,hideNotice}from'@/utils/feedback.js'
import {flushSessionDrafts}from'@/utils/session-drafts.js'
const q=new URLSearchParams(location.search)
window.holdCommunity=q.get('hold')==='1';window.holdRestore=false;document.documentElement.style.setProperty('--test-safe-bottom',Number(q.get('bottom')||34)+'px');window.routes=[];window.saveFail=false;window.saveCalls=0;window.stackDepth=2;const keyboardListeners=new Set()
const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v))
window.uni={
 getStorageSync:k=>{try{return JSON.parse(localStorage.getItem(k)||'null')??''}catch{return''}},
 setStorageSync:put,removeStorageSync:k=>localStorage.removeItem(k),
 getWindowInfo:()=>({windowWidth:innerWidth,windowHeight:innerHeight,statusBarHeight:Number(q.get('top')||47),safeAreaInsets:{top:Number(q.get('top')||47),bottom:Number(q.get('bottom')||34)}}),
 getSystemInfoSync(){return this.getWindowInfo()},hideTabBar(){},hideKeyboard(){},
 onKeyboardHeightChange:fn=>keyboardListeners.add(fn),offKeyboardHeightChange:fn=>keyboardListeners.delete(fn),
 emitKeyboard(height){for(const fn of keyboardListeners)fn({height})},
 navigateBack(o={}){window.routes.push('back');window.closeDocument?.();o.complete?.()},switchTab(o){window.routes.push(o.url);o.success?.();o.complete?.()},
 navigateTo(o){window.routes.push(o.url);if(o.url==='/pages/privacy/index'||o.url==='/pages/terms/index')window.openDocument?.(o.url);o.success?.();o.complete?.()},redirectTo(o){window.routes.push(o.url)},reLaunch(o){window.routes.push(o.url);o.success?.()},
 pageScrollTo(o){let top=o.scrollTop||0;if(o.selector){const el=document.querySelector(o.selector);if(el)top=window.scrollY+el.getBoundingClientRect().top-90}window.scrollTo(0,top);setTimeout(()=>o.complete?.(),o.duration||0)},
 createSelectorQuery(){let context=null,selector='';const tasks=[],api={
 in(v){context=v;return api},select(v){selector=v;return api},selectViewport(){return api},
 boundingClientRect(cb){const key=selector;tasks.push(()=>{const host=context?.$el instanceof Element?context.$el:document;const el=host.matches?.(key)?host:host.querySelector(key);cb(el?el.getBoundingClientRect().toJSON():null)});return api},
 scrollOffset(cb){tasks.push(()=>cb({scrollTop:scrollY}));return api},exec(){if(window.delayMeasure)setTimeout(()=>tasks.forEach(task=>task()),200);else requestAnimationFrame(()=>tasks.forEach(task=>task()));return api}
 };return api}
}
put('fire_login_status',q.get('page')!=='login');put('fire_island_onboarding_done',true);put('fire_spotlight_guide_v1:account:A',{completed:true});if(!localStorage.getItem('fire_account_uid'))put('fire_account_uid','A')
const baseRoute=q.get('page')==='personality'?'pages/personality/index':q.get('page')==='profile-edit'?'pages/profile/edit':q.get('page')==='community'?'pages/community/index':'pages/login/login'
window.getCurrentPages=()=>window.documentRoute?[{route:baseRoute,options:{}},{route:window.documentRoute,options:{}}]:[{route:baseRoute,options:{}}]

document.addEventListener('click',e=>e.target.dispatchEvent(new Event('tap',{bubbles:true,cancelable:true})),true)
const Picker=defineComponent({
 props:['mode','fields','value','range','rangeKey','start','end'],emits:['change'],
 setup(p,{emit,slots}){return()=>h('div',{class:'test-picker'},[slots.default?.(),p.mode==='date'?h('input',{type:p.fields==='month'?'month':'date',class:'test-picker-control',value:p.value,min:p.start,max:p.end,onChange:e=>emit('change',{detail:{value:e.target.value}})}):h('select',{class:'test-picker-control',value:p.value,onChange:e=>emit('change',{detail:{value:e.target.value}})},(p.range||[]).map((v,i)=>h('option',{value:i},v[p.rangeKey]||v)))])}
})
const modules={personality:()=>import('@/pages/personality/index.vue'),'profile-edit':()=>import('@/pages/profile/edit.vue'),privacy:()=>import('@/pages/privacy/index.vue'),terms:()=>import('@/pages/terms/index.vue'),ledger:()=>import('@/pages/ledger/index.vue'),wish:()=>import('@/pages/wishlist/index.vue'),edit:()=>import('@/pages/ledger/edit.vue'),home:()=>import('@/pages/index/index.vue'),community:()=>import('@/pages/community/index.vue'),login:()=>import('@/pages/login/login.vue')}
const page=(await modules[q.get('page')||'login']()).default
page.__screen=true
const baseRef=ref(null),documentRef=ref(null),documentPage=shallowRef(null)
const rootPage=defineComponent({setup(){return()=>h('div',[
 h('div',{style:documentPage.value?'display:none':''},[h(page,{ref:baseRef})]),
 documentPage.value?h(documentPage.value,{ref:documentRef}):null
])}})
const app=createApp(rootPage)
feedbackState.owner=1
for(const key of ['onLoad','onReady','onShow','onHide','onUnload','onBackPress','onResize','onPageScroll'])app.config.optionMergeStrategies[key]=(a,b)=>[...(Array.isArray(a)?a:a?[a]:[]),...(Array.isArray(b)?b:b?[b]:[])]
app.component('picker',Picker)
function hook(vm,key,arg){let result;for(const fn of [].concat(vm.$options[key]||[],vm.$?.__screenHooks?.[key]||[]))result=fn.call(vm,arg);return result}
app.mixin({beforeMount(){if(!this.$options.__screen)return;hook(this,'onLoad',{month:q.get('month')||undefined,add:q.get('add')||undefined,id:q.get('id')||undefined,tab:q.get('tab')||undefined,type:q.get('type')||undefined});hook(this,'onShow')},mounted(){if(this.$options.__screen)this.$nextTick(()=>hook(this,'onReady'))}})
app.mount('#app');const vm=baseRef.value
window.openDocument=async url=>{hook(vm,'onHide');window.documentRoute=url.slice(1);const doc=(await modules[url.includes('privacy')?'privacy':'terms']()).default;doc.__screen=true;documentPage.value=doc;await nextTick()}
window.closeDocument=async()=>{if(!documentPage.value)return;hook(documentRef.value,'onUnload');documentPage.value=null;window.documentRoute=null;await nextTick();hook(vm,'onShow')}
window.test={
 vm,state,ready:true,
 back:event=>hook(vm,'onBackPress',event||{}),hide(){hook(vm,'onHide')},show(){hook(vm,'onShow')},resize(){hook(vm,'onResize')},
 dialog:()=>feedbackState.dialog,confirm:()=>closeDialog(true),cancel:()=>closeDialog(false),hideNotice,
 fail(value){window.saveFail=value},flush:()=>flushSessionDrafts(),
 account(uid){hook(vm,'onHide');put('fire_account_uid',uid);hook(vm,'onShow')},
 unmount(){hook(vm,'onUnload');app.unmount()}
}
window.addEventListener('resize',()=>hook(vm,'onResize'))
window.addEventListener('scroll',()=>hook(vm,'onPageScroll'),{passive:true})
const focus=()=>{for(const el of document.querySelectorAll('input[focus="true"]'))if(el.getClientRects().length&&el!==document.activeElement){el.focus({preventScroll:true});break}}
new MutationObserver(focus).observe(document.getElementById('app'),{subtree:true,attributes:true,childList:true})
`)

fs.writeFileSync(path.join(temp,'personality-store.js'),"export async function savePersonalityResult(type,result){window.savedPersonalities??=[];window.savedPersonalities.push({type,result});return{type,result}}")
fs.writeFileSync(path.join(temp,'profile-api.js'),"export async function reviewAndSaveNickname(name){window.nicknameCalls=(window.nicknameCalls||0)+1;return new Promise((resolve,reject)=>{window.resolveNickname=resolve;window.rejectNickname=reject})}")

const appStyle=fs.readFileSync(path.join(root,'App.vue'),'utf8').match(/<style[^>]*>([\s\S]*?)<\/style>/)[1].replace("@import './styles/feedback.scss';",'')
fs.writeFileSync(path.join(temp,'global.css'),appStyle+`
html,body{margin:0;background:#f7f7f2;color:#253b31;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans CJK SC",sans-serif;font-size:14px}view{display:block;box-sizing:border-box}text{display:inline}input{font-family:inherit;border:0;outline:0}button{font-family:inherit;cursor:pointer;--button-height-md:44px;--button-pressed:.97;--button-radius:12px}
.panel{padding-bottom:calc(14px + var(--test-safe-bottom))!important}.test-picker{position:relative}.test-picker-control{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.bottom-tabs{height:calc(60px + var(--entry-safe-bottom))!important;padding-bottom:calc(6px + var(--entry-safe-bottom))!important}.quick-menu{bottom:calc(36px + var(--entry-safe-bottom))!important}@media(max-width:390px){.bottom-tabs{height:calc(56px + var(--entry-safe-bottom))!important;padding-bottom:calc(4px + var(--entry-safe-bottom))!important}.quick-menu{bottom:calc(32px + var(--entry-safe-bottom))!important}}
`)
fs.appendFileSync(path.join(temp,'main.js'),"\nimport './global.css'\n")
const server=await createServer({root:temp,configFile:false,plugins:[
{name:'uni-test-image',enforce:'pre',transform(code,id){if(id.endsWith('.vue'))return code.replace(/<image\b/g,'<img');return null}},
vue({template:{compilerOptions:{isCustomElement:tag=>['view','text','scroll-view'].includes(tag)}}})],
resolve:{alias:[
{find:'@/utils/personality-store.js',replacement:path.join(temp,'personality-store.js')},
{find:'@/utils/api-service.js',replacement:path.join(temp,'profile-api.js')},
{find:'@/store/index.js',replacement:path.join(temp,'store.js')},
{find:'@/utils/community-store.js',replacement:path.join(temp,'community-store.js')},
{find:'@/utils/cloudbase-auth.js',replacement:path.join(temp,'auth.js')},
{find:'@/utils/wishlist-reminder.js',replacement:path.join(temp,'wishlist-reminder.js')},
{find:'./wishlist-reminder.js',replacement:path.join(temp,'wishlist-reminder.js')},
{find:'./app-update.js',replacement:path.join(temp,'update.js')},
{find:'@dcloudio/uni-app',replacement:path.join(temp,'uni-hooks.js')},
{find:'vue',replacement:path.join(tools,'node_modules/vue/dist/vue.esm-bundler.js')},
{find:'@',replacement:root}]},
server:{host:'127.0.0.1',port:5189,strictPort:true,fs:{allow:[temp,root,tools]}}})
await server.listen()
const browser=await chromium.launch({headless:true}),errors=[],previews=[]
let checks=0
const check=(name,value)=>{assert.ok(value,name);checks++}
async function context(view={width:390,height:844},reducedMotion='no-preference'){
 const ctx=await browser.newContext({viewport:view,deviceScaleFactor:1,reducedMotion})
 ctx.setDefaultTimeout(12000)
 const p=await ctx.newPage();p.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER ERROR',e.message)})
 p.on('console',m=>{if(m.type()==='error')console.error('BROWSER CONSOLE',m.text())})
 await p.clock.setFixedTime(new Date('2026-11-08T04:00:00Z'))
 return{ctx,p}
}
const loaded=p=>p.waitForFunction(()=>window.test?.ready)
const closed=p=>p.waitForFunction(()=>!document.querySelector('.qe-sheet-mask'))
async function ready(p){await loaded(p);await p.waitForTimeout(260)}
async function screenshot(p,name){await p.evaluate(()=>window.test.hideNotice());previews.push([name,(await p.screenshot({type:'jpeg',quality:78})).toString('base64')])}
async function formFill(p,amount,note){await p.locator('input[aria-label="记账金额"]').fill(amount);if(note!==undefined)await p.locator('input[aria-label="记账备注"]').fill(note)}
async function add(p,amount,note,type='expense',cat){
 await p.locator('#quiet-entry-fab').click();await p.locator('.qe-sheet-mask').waitFor()
 if(type==='income')await p.locator('.qe-type-tabs button').nth(1).click()
 await formFill(p,amount,note)
 if(cat!==undefined)await p.locator('.qe-sheet-content select').selectOption(String(cat))
 await p.locator('.qe-primary').click();await closed(p);await p.waitForTimeout(900)
}
async function frame(p,top,bottom){
 const b=await p.locator('.qe-back').boundingBox(),fab=await p.locator('#quiet-entry-fab').boundingBox(),v=p.viewportSize()
 check('header return clears status bar',b.y>=top+10)
 check('FAB stays inside safe viewport',fab.x>=0&&fab.x+fab.width<=v.width-15&&fab.y+fab.height<=v.height-bottom-15)
 check('no horizontal document overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
}
try{
 const auth=await context()
 await auth.p.goto('http://127.0.0.1:5189/?page=login');await ready(auth.p)
 const checkbox=auth.p.locator('.consent-check')
 check('consent starts unchecked',await checkbox.getAttribute('aria-checked')==='false')
 await auth.p.locator('input[aria-label="邮箱"]').fill('user@example.com')
 await auth.p.locator('input[aria-label="验证码"]').fill('012345')
 await auth.p.locator('.login-button').click()
 check('unaccepted login produces inline red frame',await auth.p.locator('.consent-error').count()===1&&await auth.p.locator('.consent-message').textContent().then(t=>t.includes('请先阅读')))
 check('unaccepted login never calls authentication',await auth.p.evaluate(()=>!window.authCalls))
 const color=await auth.p.locator('.consent-link').first().evaluate(el=>getComputedStyle(el).color)
 check('legal link is blue',color==='rgb(23, 104, 196)')
 await auth.p.locator('.consent-link').first().click();await auth.p.locator('.legal-name').waitFor()
 check('terms render without authenticated session',await auth.p.locator('.legal-name').textContent()==='Fire生活用户协议')
 await auth.p.locator('.legal-back').click();await checkbox.waitFor()
 check('terms back preserves email and verification code',await auth.p.locator('input[aria-label="邮箱"]').inputValue()==='user@example.com'&&await auth.p.locator('input[aria-label="验证码"]').inputValue()==='012345')
 check('reading does not accept terms',await checkbox.getAttribute('aria-checked')==='false')
 await auth.p.locator('.consent-link').nth(1).click();await auth.p.locator('.legal-name').waitFor()
 check('privacy policy is independent and readable',await auth.p.locator('.legal-name').textContent()==='Fire生活隐私政策'&&await auth.p.locator('.legal-section').count()>10)
 await auth.p.locator('.legal-back').click();await checkbox.waitFor()
 await checkbox.click()
 check('checking removes error frame and text',await auth.p.locator('.consent-error').count()===0&&await auth.p.locator('.consent-message').count()===0)
 await auth.p.locator('.send-code').click();await auth.p.waitForTimeout(80)
 await auth.p.locator('input[aria-label="验证码"]').fill('012345')
 await auth.p.locator('.login-button').click();await auth.p.locator('.login-button .fire-loading-spinner').waitFor()
 check('accepted login retains smooth pending feedback',await auth.p.evaluate(()=>window.authCalls===1&&window.sentCode==='012345'))
 await screenshot(auth.p,'LOGIN_CONSENT')
 await auth.p.evaluate(()=>window.rejectAuth(Error('验证示例错误')));await auth.p.waitForTimeout(80)
 check('failure retains consent and email',await checkbox.getAttribute('aria-checked')==='true'&&await auth.p.locator('input[aria-label="邮箱"]').inputValue()==='user@example.com')
 await auth.ctx.close()

 const nick=await context()
 await nick.p.goto('http://127.0.0.1:5189/?page=profile-edit');await ready(nick.p)
 await nick.p.locator('input[aria-label="昵称"]').fill('新的旅人')
 await nick.p.locator('.save').click();await nick.p.locator('.save .fire-loading-spinner').waitFor()
 check('nickname remains original during review',await nick.p.evaluate(()=>window.test.state.profile.name==='测试用户'&&window.nicknameCalls===1))
 check('review blocks duplicate saving',await nick.p.locator('.save').isDisabled())
 await nick.p.evaluate(()=>window.rejectNickname(Error('昵称不合适，请修改后重试')));await nick.p.waitForTimeout(80)
 check('rejection preserves original and explains retry',await nick.p.locator('.review-message').textContent().then(t=>t.includes('请修改'))&&await nick.p.evaluate(()=>window.test.state.profile.name==='测试用户'))
 await nick.p.locator('input[aria-label="昵称"]').fill('安静的旅人')
 await nick.p.locator('.save').click()
 await nick.p.evaluate(()=>window.resolveNickname({name:'安静的旅人',nicknameReviewStatus:'approved',nicknameUpdatedAt:Date.now(),nicknameReviewedAt:Date.now()}))
 await nick.p.waitForTimeout(100)
 check('approved profile persisted after review',await nick.p.evaluate(()=>window.test.state.profile.name==='安静的旅人'&&window.saveCalls===1))
 await screenshot(nick.p,'NICKNAME_REVIEWED')
 await nick.ctx.close()

 const community=await context()
 await community.p.goto('http://127.0.0.1:5189/?page=community&hold=1');await ready(community.p)
 const centered=async p=>p.locator('.community-loader').evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<2})
 check('initial community spinner centered',await centered(community.p))
 await community.p.evaluate(()=>window.resolveCommunity({items:[{id:'a',title:'我记录的一段经历',content:'生活中的真实记录',summary:'从今天慢慢开始',journey:'doing',displayName:'安静的旅人',status:'approved'}],stats:{doing:1,settled:0},nextCursor:null}))
 await community.p.waitForTimeout(150)
 const before=await community.p.locator('.card').first().boundingBox()
 await community.p.evaluate(()=>{window.test.vm.refreshCommunity()});await community.p.waitForTimeout(80)
 check('refresh spinner centered above cards',await centered(community.p))
 const during=await community.p.locator('.card').first().boundingBox()
 check('refresh does not shift existing timeline',Math.abs(before.y-during.y)<1)
 await screenshot(community.p,'COMMUNITY_CENTERED_SPINNER')
 await community.p.evaluate(()=>window.resolveCommunity({items:[],stats:{doing:0,settled:0},nextCursor:null}));await community.p.waitForTimeout(80)
 check('spinner disappears after completion',await community.p.locator('.community-loader').count()===0)
 check('bottom bar contains no visible text labels',await community.p.locator('.tab-label').count()===0&&await community.p.locator('.tab-item').count()===4)
 await community.ctx.close()

 const personality=await context()
 await personality.p.goto('http://127.0.0.1:5189/?page=personality');await ready(personality.p)
 await personality.p.evaluate(()=>{window.test.state.personalityTests={bigfive:{title:'旧的大五人格结果',rows:[{name:'开放性',score:52}]}}})
 await personality.p.waitForTimeout(50)
 check('old questionnaire result retained with migration notice',await personality.p.locator('.legacy-result-note').count()===1&&await personality.p.locator('.saved-row-head').textContent().then(t=>t.includes('52%')))
 await personality.p.locator('.mbti-manual').click()
 await personality.p.locator('.mbti-input').fill('ABCD')
 await personality.p.locator('.manual-save').click()
 check('invalid manual MBTI blocked',await personality.p.locator('.assessment-error').textContent().then(t=>t.includes('有效')))
 await personality.p.locator('.mbti-input').fill('infp')
 await personality.p.locator('.manual-save').click();await personality.p.waitForTimeout(80)
 check('manual type normalized and source explicit',await personality.p.locator('.result-type').textContent()==='INFP · 自行填写'&&await personality.p.locator('.result-row').count()===0)
 check('manual save leaves Big Five intact',await personality.p.evaluate(()=>window.test.state.personalityTests.bigfive.rows[0].score===52&&window.test.state.personalityTests.mbti.source==='self_reported'))
 await screenshot(personality.p,'MBTI_MANUAL')
 await personality.p.locator('.back').click()
 await personality.p.locator('.test-card').first().click()
 await personality.p.evaluate(()=>{const a=document.querySelectorAll('.answer')[2];a.dispatchEvent(new Event('tap',{bubbles:true}));a.dispatchEvent(new Event('tap',{bubbles:true}))})
 await personality.p.waitForTimeout(60)
 check('rapid double answer advances one question',await personality.p.locator('.quiz-meta').textContent().then(t=>t.includes('2 / 50')))
 await personality.p.locator('.back').click()
 check('previous question restores selected answer',await personality.p.locator('.answer.selected').count()===1)
 await personality.p.locator('.back').click()
 await personality.p.locator('.test-card').first().click()
 for(let i=0;i<50;i++){await personality.p.locator('.answer').nth(2).click();await personality.p.waitForTimeout(235)}
 check('neutral fifty-question result calculates true midpoint',await personality.p.locator('.result-row-head').allTextContents().then(rows=>rows.length===5&&rows.every(t=>t.includes('50%'))))
 check('new score version saved and manual MBTI retained',await personality.p.evaluate(()=>window.test.state.personalityTests.bigfive.scoringVersion===2&&window.test.state.personalityTests.mbti.mbtiType==='INFP'))
 await personality.p.locator('.back').click();await personality.p.locator('.mbti-manual').click()
 await personality.p.locator('.mbti-input').fill('ENTJ')
 await personality.p.evaluate(()=>window.saveFail=true)
 await personality.p.locator('.manual-save').click();await personality.p.waitForTimeout(80)
 check('local save failure does not replace existing MBTI',await personality.p.evaluate(()=>window.test.state.personalityTests.mbti.mbtiType==='INFP')&&await personality.p.locator('.manual-panel').count()===1)
 await personality.ctx.close()

 for(const view of [{width:360,height:640},{width:430,height:932},{width:844,height:390}]){
  const small=await context(view,'reduce')
  await small.p.goto('http://127.0.0.1:5189/?page=login');await ready(small.p)
  await small.p.locator('.login-button').click()
  check('consent gate works on '+view.width,await small.p.locator('.consent-message').count()===1)
  check('login page has no horizontal overflow '+view.width,await small.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  await small.p.locator('.consent-link').nth(1).click();await small.p.locator('.legal-name').waitFor()
  const back=await small.p.locator('.legal-back').boundingBox()
  check('legal return clears status bar '+view.width,back.y>=47)
  await small.p.locator('.legal-back').click()
  check('unread checkbox remains off after policy return '+view.width,await small.p.locator('.consent-check').getAttribute('aria-checked')==='false')
  await small.ctx.close()
 }
 check('no runtime page errors',errors.length===0)
 console.log(checks+' consent, nickname, centered spinner and personality mobile browser checks passed')
}finally{
 for(const[name,data]of previews){console.log(name+'_PREVIEW_BEGIN');for(let i=0;i<data.length;i+=1000)console.log(data.slice(i,i+1000));console.log(name+'_PREVIEW_END')}
 console.log('Browser errors:',JSON.stringify(errors))
 await browser.close();await server.close();clearTimeout(deadline);fs.rmSync(temp,{recursive:true,force:true})
}
