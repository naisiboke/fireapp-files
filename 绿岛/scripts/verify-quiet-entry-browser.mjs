
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {pathToFileURL,fileURLToPath}from'node:url'
const tools=process.env.ENTRY_TOOLS||'/tmp/fire-entry-tools',root=fileURLToPath(new URL('..',import.meta.url)),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fire-entry-'))
fs.symlinkSync(path.join(tools,'node_modules'),path.join(temp,'node_modules'),'dir')
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
export function signInWithCode(){window.authCalls=(window.authCalls||0)+1;return new Promise((resolve,reject)=>{window.resolveAuth=resolve;window.rejectAuth=reject})}
`)

fs.writeFileSync(path.join(temp,'uni-hooks.js'),"export const onShow=()=>{};export const onHide=()=>{};export const onUnload=()=>{};export const onBackPress=()=>{};export const onResize=()=>{}")
fs.writeFileSync(path.join(temp,'wishlist-reminder.js'),"import{reactive}from'vue';export const wishlistReminder=reactive({owner:null,uid:'',id:'',busy:false});export const maybePromptWishlist=()=>false;export const closeWishlistReminder=()=>{};export const answerWishlistReminder=()=>{}")
fs.writeFileSync(path.join(temp,'update.js'),"export const maybeCheckAppUpdate=()=>{}")
fs.writeFileSync(path.join(temp,'main.js'),`
import{createApp,defineComponent,h}from'vue'
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
 navigateBack(o={}){window.routes.push('back');o.complete?.()},switchTab(o){window.routes.push(o.url);o.success?.();o.complete?.()},
 navigateTo(o){window.routes.push(o.url);o.success?.();o.complete?.()},redirectTo(o){window.routes.push(o.url)},reLaunch(o){window.routes.push(o.url);o.success?.()},
 pageScrollTo(o){let top=o.scrollTop||0;if(o.selector){const el=document.querySelector(o.selector);if(el)top=window.scrollY+el.getBoundingClientRect().top-90}window.scrollTo(0,top);setTimeout(()=>o.complete?.(),o.duration||0)},
 createSelectorQuery(){let context=null,selector='';const tasks=[],api={
 in(v){context=v;return api},select(v){selector=v;return api},selectViewport(){return api},
 boundingClientRect(cb){const key=selector;tasks.push(()=>{const host=context?.$el instanceof Element?context.$el:document;const el=host.matches?.(key)?host:host.querySelector(key);cb(el?el.getBoundingClientRect().toJSON():null)});return api},
 scrollOffset(cb){tasks.push(()=>cb({scrollTop:scrollY}));return api},exec(){if(window.delayMeasure)setTimeout(()=>tasks.forEach(task=>task()),200);else requestAnimationFrame(()=>tasks.forEach(task=>task()));return api}
 };return api}
}
put('fire_login_status',q.get('page')!=='login');put('fire_island_onboarding_done',true);put('fire_spotlight_guide_v1:account:A',{completed:true});if(!localStorage.getItem('fire_account_uid'))put('fire_account_uid','A')
window.getCurrentPages=()=>Array.from({length:window.stackDepth},(_,i)=>({route:q.get('page')==='wish'?'pages/wishlist/index':q.get('page')==='edit'?'pages/ledger/edit':q.get('page')==='home'?'pages/index/index':q.get('page')==='community'?'pages/community/index':q.get('page')==='login'?'pages/login/login':'pages/ledger/index',options:{}}))
document.addEventListener('click',e=>e.target.dispatchEvent(new Event('tap',{bubbles:true,cancelable:true})),true)
const Picker=defineComponent({
 props:['mode','fields','value','range','rangeKey','start','end'],emits:['change'],
 setup(p,{emit,slots}){return()=>h('div',{class:'test-picker'},[slots.default?.(),p.mode==='date'?h('input',{type:p.fields==='month'?'month':'date',class:'test-picker-control',value:p.value,min:p.start,max:p.end,onChange:e=>emit('change',{detail:{value:e.target.value}})}):h('select',{class:'test-picker-control',value:p.value,onChange:e=>emit('change',{detail:{value:e.target.value}})},(p.range||[]).map((v,i)=>h('option',{value:i},v[p.rangeKey]||v)))])}
})
const modules={ledger:()=>import('@/pages/ledger/index.vue'),wish:()=>import('@/pages/wishlist/index.vue'),edit:()=>import('@/pages/ledger/edit.vue'),home:()=>import('@/pages/index/index.vue'),community:()=>import('@/pages/community/index.vue'),login:()=>import('@/pages/login/login.vue')}
const page=(await modules[q.get('page')||'ledger']()).default,app=createApp(page)
feedbackState.owner=1
for(const key of ['onLoad','onReady','onShow','onHide','onUnload','onBackPress','onResize','onPageScroll'])app.config.optionMergeStrategies[key]=(a,b)=>[...(Array.isArray(a)?a:a?[a]:[]),...(Array.isArray(b)?b:b?[b]:[])]
app.component('picker',Picker)
function hook(vm,key,arg){let result;for(const fn of [].concat(vm.$options[key]||[]))result=fn.call(vm,arg);return result}
app.mixin({beforeMount(){if(this.$parent)return;hook(this,'onLoad',{month:q.get('month')||undefined,add:q.get('add')||undefined,id:q.get('id')||undefined,tab:q.get('tab')||undefined});hook(this,'onShow')},mounted(){if(!this.$parent)this.$nextTick(()=>hook(this,'onReady'))}})
const vm=app.mount('#app')
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
const appStyle=fs.readFileSync(path.join(root,'App.vue'),'utf8').match(/<style[^>]*>([\s\S]*?)<\/style>/)[1].replace("@import './styles/feedback.scss';",'')
fs.writeFileSync(path.join(temp,'global.css'),appStyle+`
html,body{margin:0;background:#f7f7f2;color:#253b31;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans CJK SC",sans-serif;font-size:14px}view{display:block;box-sizing:border-box}text{display:inline}input{font-family:inherit}button{font-family:inherit;cursor:pointer;--button-height-md:44px;--button-pressed:.97;--button-radius:12px}
.panel{padding-bottom:calc(14px + var(--test-safe-bottom))!important}.test-picker{position:relative}.test-picker-control{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.bottom-tabs{height:calc(60px + var(--entry-safe-bottom))!important;padding-bottom:calc(6px + var(--entry-safe-bottom))!important}.quick-menu{bottom:calc(36px + var(--entry-safe-bottom))!important}@media(max-width:390px){.bottom-tabs{height:calc(56px + var(--entry-safe-bottom))!important;padding-bottom:calc(4px + var(--entry-safe-bottom))!important}.quick-menu{bottom:calc(32px + var(--entry-safe-bottom))!important}}
`)
fs.appendFileSync(path.join(temp,'main.js'),"\nimport './global.css'\n")
const server=await createServer({root:temp,configFile:false,plugins:[
{name:'uni-test-image',enforce:'pre',transform(code,id){if(id.endsWith('.vue'))return code.replace(/<image\b/g,'<img');return null}},
vue({template:{compilerOptions:{isCustomElement:tag=>['view','text','scroll-view'].includes(tag)}}})],
resolve:{alias:[
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

 const {ctx,p}=await context()
 await p.goto('http://127.0.0.1:5189/');await ready(p)
 check('new month still requires expense budget and income target',await p.locator('.qe-sheet-title').textContent()==='本月预算')
 await p.locator('input[aria-label="本月支出预算"]').fill('3000');await p.locator('input[aria-label="本月收入目标"]').fill('8000');await p.locator('.qe-primary').click();await closed(p)
 await p.waitForTimeout(250);await frame(p,47,34)
 check('budget saving never fabricates actual records',await p.evaluate(()=>test.state.ledger.length===0&&test.state.exp===17))
 check('approved book illustration remains',await p.locator('.qe-empty-art').evaluate(e=>e.complete&&e.naturalWidth>0))
 await p.locator('#quiet-entry-fab').click()
 check('add reopens original category grid route',await p.evaluate(()=>window.routes.at(-1)==='/pages/ledger/edit'))
 check('ledger never shows replacement amount form',await p.locator('.qe-input-amount').count()===0)
 await p.goto('http://127.0.0.1:5189/?page=edit&budget=1');await ready(p)
 check('editor starts at category choice',await p.locator('.cat-item').count()>8&&await p.locator('.panel').count()===0)
 await screenshot(p,'CLASSIC_CATEGORIES')
 await p.locator('.cat-item').filter({hasText:'餐饮'}).click();await p.locator('.keypad').waitFor()
 check('category opens original numeric keypad',await p.locator('.key').count()===14)
 await p.locator('.key').filter({hasText:/^3$/}).click();await p.locator('.key').filter({hasText:/^0$/}).click()
 check('digits enter thirty directly',await p.locator('.amount-input').inputValue()==='30')
 await screenshot(p,'CLASSIC_KEYPAD')
 await p.locator('.key.done').click()
 check('numeric completion saves one actual expense',await p.evaluate(()=>test.state.ledger.length===1&&test.state.ledger[0].cents===3000&&test.state.exp===17))
 check('completion returns to category choice for consecutive entry',await p.locator('.panel').count()===0)
 await p.locator('.type-card').nth(1).click();await p.locator('.cat-item').filter({hasText:'工资'}).click()
 for(const digit of ['5','0','0','0'])await p.locator('.key').filter({hasText:new RegExp('^'+digit+'$')}).click()
 await p.locator('.key.done').click()
 check('income stays distinct from spending and plans',await p.evaluate(()=>test.state.ledger.length===2&&test.state.ledger.find(x=>x.type==='income').cents===500000&&test.state.monthlyTargets['2026-11'].expense===300000&&test.state.finance.assets===15000))
 await p.locator('.type-card').first().click();await p.locator('.cat-item').filter({hasText:'餐饮'}).click();await p.locator('.key').filter({hasText:/^9$/}).click()
 await p.evaluate(()=>test.fail(true));await p.locator('.key.done').click()
 check('failed save retains the custom-keypad amount',await p.locator('.amount-input').inputValue()==='9'&&await p.evaluate(()=>test.state.ledger.length===2))
 await p.evaluate(()=>test.fail(false));await p.locator('.back-btn').click()
 check('classic return uses the actual previous page',await p.evaluate(()=>window.routes.at(-1)==='back'))
 await p.goto('http://127.0.0.1:5189/?budget=1');await ready(p)
 check('overview retains actual amounts and shares after classic entry',await p.evaluate(()=>test.vm.expenseTotal===3000&&test.vm.incomeTotal===500000&&test.vm.distribution[0].percent===100))
 check('monthly table still lists both saved records',await p.locator('.qe-record-row').count()===2)
 const id=await p.evaluate(()=>test.state.ledger.find(x=>x.type==='expense').id)
 await p.goto('http://127.0.0.1:5189/?page=edit&id='+encodeURIComponent(id));await ready(p)
 check('editing existing record opens numeric panel with saved amount',await p.locator('.amount-input').inputValue()==='30')
 await p.locator('.record-delete').click();await p.locator('.fire-dialog-title').waitFor();await p.locator('.fire-dialog-secondary').click()
 check('cancel deletion retains original entry',await p.evaluate(()=>test.state.ledger.length===2))
 await p.locator('.record-delete').click();await p.locator('.fire-dialog-primary').click()
 check('confirmed deletion still records a single tombstone',await p.evaluate(()=>test.state.ledger.length===1&&test.state.deletions.some(x=>x.kind==='ledger')))
 await ctx.close()
 const auth=await context();await auth.p.goto('http://127.0.0.1:5189/?page=login');await ready(auth.p)
 await auth.p.locator('input[aria-label="邮箱"]').fill('user@example.com');await auth.p.locator('.send-code').click()
 check('email verification retains its countdown',await auth.p.locator('.send-code').textContent().then(t=>t.includes('60')))
 await auth.p.locator('input[aria-label="验证码"]').fill('123456')
 const before=await auth.p.locator('.login-button').boundingBox();await auth.p.locator('.login-button').click()
 await auth.p.locator('.login-button .fire-loading-ring').waitFor()
 const during=await auth.p.locator('.login-button').boundingBox()
 check('login spinner leaves button width and height unchanged',Math.abs(before.width-during.width)<1&&Math.abs(before.height-during.height)<1)
 check('login spinner is uniform compositor rotation',await auth.p.locator('.login-button .fire-loading-ring').evaluate(e=>getComputedStyle(e).animationTimingFunction)==='linear')
 check('busy login button blocks duplicate requests',await auth.p.locator('.login-button').isDisabled()&&await auth.p.evaluate(()=>window.authCalls===1))
 await screenshot(auth.p,'LOGIN_SPINNER')
 await auth.p.evaluate(()=>window.rejectAuth(Error('验证码无效')));await auth.p.waitForFunction(()=>!document.querySelector('.login-button').disabled)
 check('failed login restores original button and retains email',await auth.p.locator('.login-button .fire-loading-spinner').count()===0&&await auth.p.locator('input[aria-label="邮箱"]').inputValue()==='user@example.com')
 await auth.p.locator('.login-button').click();await auth.p.waitForFunction(()=>window.authCalls===2)
 await auth.p.evaluate(()=>{window.holdRestore=true;window.resolveAuth({})});await auth.p.waitForFunction(()=>!!window.resolveRestore)
 check('spinner stays active through account restoration',await auth.p.locator('.login-button .fire-loading-spinner').count()===1)
 await auth.p.evaluate(()=>window.resolveRestore({loaded:true,uid:'A',email:'user@example.com'}));await auth.p.waitForFunction(()=>window.routes.includes('/pages/index/index'))
 await auth.ctx.close()
 const home=await context();await home.p.goto('http://127.0.0.1:5189/?page=home');await ready(home.p)
 check('successful account restoration banner is hidden',await home.p.locator('.account-sync-banner').count()===0)
 check('selected FIRE segment is explicitly pressed',await home.p.locator('.countdown-switch-option').first().getAttribute('aria-pressed')==='true')
 const fireDate=await home.p.locator('.countdown-target').textContent(),assets=await home.p.evaluate(()=>test.state.finance.assets)
 await home.p.locator('.countdown-switch-option').nth(1).click();await home.p.waitForTimeout(80)
 const slide=await home.p.locator('.countdown-switch-indicator').evaluate(e=>({width:e.getBoundingClientRect().width,x:new DOMMatrixReadOnly(getComputedStyle(e).transform).m41}))
 check('selection indicator moves continuously',slide.x>0&&slide.x<slide.width)
 await home.p.waitForTimeout(220)
 check('selected goal has white text and clear selection',await home.p.locator('.countdown-switch-option.selected').textContent().then(t=>t.includes('我的目标'))&&await home.p.locator('.countdown-switch-option.selected').evaluate(e=>getComputedStyle(e).color)==='rgb(255, 255, 255)')
 check('goal selection updates actual countdown content without touching assets',await home.p.locator('.countdown-target').textContent()!==fireDate&&await home.p.evaluate(()=>test.state.finance.assets)===assets)
 await screenshot(home.p,'HOME_GOAL_SELECTED')
 for(const status of ['pending','restoring','error','auth-required','conflict']){await home.p.evaluate(status=>{test.state.cloudSync={status,message:'需要处理的同步提示'}},status);await home.p.locator('.account-sync-banner').waitFor()}
 check('pending, failures, expiration and conflicts remain visible',await home.p.locator('.account-sync-banner').count()===1)
 await home.ctx.close()
 const feed=await context();await feed.p.goto('http://127.0.0.1:5189/?page=community&tab=doing&hold=1');await ready(feed.p)
 await feed.p.locator('.community-loading-initial .fire-loading-spinner').waitFor()
 check('community loading copy is removed',!(await feed.p.locator('body').textContent()).includes('正在读取社区内容'))
 await feed.p.waitForFunction(()=>!!window.resolveCommunity)
 const post={id:'test-post',journey:'doing',title:'记录我的自由计划',summary:'慢慢走向理想生活',category:'生活',timeline:[],displayName:'测试用户'}
 await feed.p.evaluate(post=>window.resolveCommunity({items:[post],stats:{doing:1,settled:0},nextCursor:1}),post);await feed.p.locator('.card-title').waitFor()
 check('loader disappears after community data arrives',await feed.p.locator('.community-loader .fire-loading-spinner').count()===0)
 const card=await feed.p.locator('.card').first().boundingBox()
 await feed.p.evaluate(()=>test.vm.refreshCommunity());await feed.p.locator('.community-loader-refresh .fire-loading-spinner').waitFor()
 const refreshing=await feed.p.locator('.card').first().boundingBox()
 check('refresh keeps current timeline cards in place',Math.abs(card.y-refreshing.y)<1)
 await screenshot(feed.p,'COMMUNITY_REFRESH')
 await feed.p.evaluate(()=>window.rejectCommunity(Error('offline')));await feed.p.waitForFunction(()=>!test.vm.publicLoading)
 check('community failure stops the spinner and preserves retry',await feed.p.locator('.community-loader .fire-loading-spinner').count()===0&&await feed.p.locator('.community-sync-note').textContent().then(t=>t.includes('重试')))
 check('community failure preserves loaded posts',await feed.p.locator('.card-title').textContent()==='记录我的自由计划')
 await feed.ctx.close()
 const wish=await context();await wish.p.goto('http://127.0.0.1:5189/?page=wish');await ready(wish.p)
 await frame(wish.p,47,34)
 const nav=await wish.p.locator('.bottom-tabs').boundingBox(),wf=await wish.p.locator('#quiet-entry-fab').boundingBox()
 check('wishlist FAB clears existing bottom navigation',wf.y+wf.height<nav.y-8)
 await screenshot(wish.p,'WISHLIST_EMPTY')
 await wish.p.locator('#quiet-entry-fab').click();await wish.p.locator('input[aria-label="消费计划名称"]').fill('想买的耳机');await wish.p.locator('input[aria-label="预计金额"]').fill('299')
 await wish.p.locator('.qe-primary').click();await closed(wish.p);await wish.p.waitForTimeout(950)
 check('wishlist addition keeps seven-day cooling period',await wish.p.evaluate(()=>test.state.items.length===1&&test.state.items[0].days===7&&test.state.items[0].status==='active'))
 check('wishlist preserves exactly three status tabs',await wish.p.locator('.qe-wishlist-tabs button').count()===3)
 await wish.p.locator('.qe-wish-delete').click();await wish.p.locator('.fire-dialog-title').waitFor()
 check('delete button never opens item details',await wish.p.evaluate(()=>window.routes.length===0))
 await wish.p.locator('.fire-dialog-secondary').click();await wish.p.locator('.qe-wish-delete').click();await wish.p.locator('.fire-dialog-primary').click();await wish.p.waitForTimeout(250)
 check('deleting all plans does not repeat first-user nudges',await wish.p.locator('.qe-fab-hint').count()===0)
 await wish.p.locator('.qe-wishlist-tabs button').nth(1).click()
 check('empty finished tab does not show creation arrow',await wish.p.locator('.qe-empty-arrow').count()===0)
 await wish.p.locator('#quiet-entry-fab').click();await wish.p.locator('input[aria-label="消费计划名称"]').fill('未保存')
 await wish.p.evaluate(()=>test.account('B'));await closed(wish.p)
 check('switching accounts drops original account unsaved form',await wish.p.evaluate(()=>test.vm.form.name===''))
 await wish.ctx.close()

 for(const spec of [{width:360,height:640,top:24,bottom:0},{width:430,height:932,top:59,bottom:34},{width:844,height:390,top:24,bottom:20}]){
  const v=await context({width:spec.width,height:spec.height})
  await v.p.goto('http://127.0.0.1:5189/?page=edit&budget=1&top='+spec.top+'&bottom='+spec.bottom);await ready(v.p)
  await v.p.locator('.cat-item').filter({hasText:'餐饮'}).click();await v.p.locator('.keypad').waitFor()
  const panel=await v.p.locator('.panel').boundingBox(),back=await v.p.locator('.back-btn').boundingBox()
  check('numeric panel clears status bar and return at '+spec.width+'x'+spec.height,panel.y>=spec.top+70&&back.y>=spec.top+10)
  await v.p.locator('.key.done').scrollIntoViewIfNeeded()
  const done=await v.p.locator('.key.done').boundingBox()
  check('original completion key is reachable at '+spec.width+'x'+spec.height,done.y>=panel.y&&done.y+done.height<=spec.height-spec.bottom+1)
  await v.ctx.close()
 }
 const reduced=await context({width:390,height:844},'reduce');await reduced.p.goto('http://127.0.0.1:5189/?page=home');await ready(reduced.p)
 check('reduced motion disables sliding indicator',await reduced.p.locator('.countdown-switch-indicator').evaluate(e=>getComputedStyle(e).transitionDuration)==='0s')
 await reduced.p.locator('.countdown-switch-option').nth(1).click()
 check('reduced motion keeps selected goal functional',await reduced.p.locator('.countdown-switch-option.selected').textContent().then(t=>t.includes('我的目标')))
 await reduced.ctx.close()
 check('no browser runtime errors',errors.length===0)
 console.log(checks+' restored keypad, login spinner, countdown, community and wishlist browser checks passed')
}finally{for(const [name,data]of previews){console.log(name+'_PREVIEW_BEGIN');for(let i=0;i<data.length;i+=1000)console.log(data.slice(i,i+1000));console.log(name+'_PREVIEW_END')}await browser.close();await server.close();fs.rmSync(temp,{recursive:true,force:true})}
