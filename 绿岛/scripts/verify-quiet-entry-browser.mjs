
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
const fresh={ready:true,ledger:[],monthlyTargets:q.get('budget')==='1'?{[month]:{expense:300000,income:800000}}:{},items:[],finance:{assets:15000,retirementExpense:6000,monthlyDeposit:3000},exp:17,cloudSync:{status:'synced'},deletions:[]}
export const state=reactive(JSON.parse(localStorage.getItem('test-snapshot')||'null')||fresh)
export function persistNow(){if(window.saveFail)return false;localStorage.setItem('test-snapshot',JSON.stringify(state));window.saveCalls=(window.saveCalls||0)+1;return true}
export const persist=persistNow
export const refreshActions=async()=>null
`)
fs.writeFileSync(path.join(temp,'uni-hooks.js'),"export const onShow=()=>{};export const onHide=()=>{};export const onUnload=()=>{};export const onBackPress=()=>{};export const onResize=()=>{}")
fs.writeFileSync(path.join(temp,'wishlist-reminder.js'),"import{reactive}from'vue';export const wishlistReminder=reactive({owner:null,uid:'',id:'',busy:false});export const maybePromptWishlist=()=>false;export const closeWishlistReminder=()=>{};export const answerWishlistReminder=()=>{}")
fs.writeFileSync(path.join(temp,'update.js'),"export const maybeCheckAppUpdate=()=>{}")
fs.writeFileSync(path.join(temp,'main.js'),`
import{createApp,defineComponent,h}from'vue'
import Ledger from '@/pages/ledger/index.vue'
import Wishlist from '@/pages/wishlist/index.vue'
import {state}from'@/store/index.js'
import {feedbackState,closeDialog,hideNotice}from'@/utils/feedback.js'
import {flushSessionDrafts}from'@/utils/session-drafts.js'
const q=new URLSearchParams(location.search)
window.routes=[];window.saveFail=false;window.saveCalls=0;window.stackDepth=2;const keyboardListeners=new Set()
const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v))
window.uni={
 getStorageSync:k=>{try{return JSON.parse(localStorage.getItem(k)||'null')??''}catch{return''}},
 setStorageSync:put,removeStorageSync:k=>localStorage.removeItem(k),
 getWindowInfo:()=>({windowWidth:innerWidth,windowHeight:innerHeight,statusBarHeight:Number(q.get('top')||47),safeAreaInsets:{top:Number(q.get('top')||47),bottom:Number(q.get('bottom')||34)}}),
 getSystemInfoSync(){return this.getWindowInfo()},hideTabBar(){},hideKeyboard(){},
 onKeyboardHeightChange:fn=>keyboardListeners.add(fn),offKeyboardHeightChange:fn=>keyboardListeners.delete(fn),
 emitKeyboard(height){for(const fn of keyboardListeners)fn({height})},
 navigateBack(o={}){window.routes.push('back');o.complete?.()},switchTab(o){window.routes.push(o.url);o.success?.();o.complete?.()},
 navigateTo(o){window.routes.push(o.url)},redirectTo(o){window.routes.push(o.url)},
 pageScrollTo(o){let top=o.scrollTop||0;if(o.selector){const el=document.querySelector(o.selector);if(el)top=window.scrollY+el.getBoundingClientRect().top-90}window.scrollTo(0,top);setTimeout(()=>o.complete?.(),o.duration||0)},
 createSelectorQuery(){let context=null,selector='';const tasks=[],api={
 in(v){context=v;return api},select(v){selector=v;return api},selectViewport(){return api},
 boundingClientRect(cb){const key=selector;tasks.push(()=>{const host=context?.$el instanceof Element?context.$el:document;const el=host.matches?.(key)?host:host.querySelector(key);cb(el?el.getBoundingClientRect().toJSON():null)});return api},
 scrollOffset(cb){tasks.push(()=>cb({scrollTop:scrollY}));return api},exec(){requestAnimationFrame(()=>tasks.forEach(task=>task()));return api}
 };return api}
}
put('fire_login_status',true);if(!localStorage.getItem('fire_account_uid'))put('fire_account_uid','A')
window.getCurrentPages=()=>Array.from({length:window.stackDepth},(_,i)=>({route:q.get('page')==='wish'?'pages/wishlist/index':'pages/ledger/index',options:{}}))
document.addEventListener('click',e=>e.target.dispatchEvent(new Event('tap',{bubbles:true,cancelable:true})),true)
const Picker=defineComponent({
 props:['mode','fields','value','range','rangeKey','start','end'],emits:['change'],
 setup(p,{emit,slots}){return()=>h('div',{class:'test-picker'},[slots.default?.(),p.mode==='date'?h('input',{type:p.fields==='month'?'month':'date',class:'test-picker-control',value:p.value,min:p.start,max:p.end,onChange:e=>emit('change',{detail:{value:e.target.value}})}):h('select',{class:'test-picker-control',value:p.value,onChange:e=>emit('change',{detail:{value:e.target.value}})},(p.range||[]).map((v,i)=>h('option',{value:i},v[p.rangeKey]||v)))])}
})
const page=q.get('page')==='wish'?Wishlist:Ledger,app=createApp(page)
for(const key of ['onLoad','onShow','onHide','onUnload','onBackPress','onResize','onPageScroll'])app.config.optionMergeStrategies[key]=(a,b)=>[...(Array.isArray(a)?a:a?[a]:[]),...(Array.isArray(b)?b:b?[b]:[])]
app.component('picker',Picker)
function hook(vm,key,arg){let result;for(const fn of [].concat(vm.$options[key]||[]))result=fn.call(vm,arg);return result}
app.mixin({beforeMount(){if(this.$parent)return;hook(this,'onLoad',{month:q.get('month')||undefined,add:q.get('add')||undefined});hook(this,'onShow')}})
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
.test-picker{position:relative}.test-picker-control{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.bottom-tabs{height:calc(60px + var(--entry-safe-bottom))!important;padding-bottom:calc(6px + var(--entry-safe-bottom))!important}.quick-menu{bottom:calc(36px + var(--entry-safe-bottom))!important}@media(max-width:390px){.bottom-tabs{height:calc(56px + var(--entry-safe-bottom))!important;padding-bottom:calc(4px + var(--entry-safe-bottom))!important}.quick-menu{bottom:calc(32px + var(--entry-safe-bottom))!important}}
`)
fs.appendFileSync(path.join(temp,'main.js'),"\nimport './global.css'\n")
const server=await createServer({root:temp,configFile:false,plugins:[
{name:'uni-test-image',enforce:'pre',transform(code,id){if(id.endsWith('.vue'))return code.replace(/<image\b/g,'<img');return null}},
vue({template:{compilerOptions:{isCustomElement:tag=>['view','text','scroll-view'].includes(tag)}}})],
resolve:{alias:[
{find:'@/store/index.js',replacement:path.join(temp,'store.js')},
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
 check('new month prompts for both budgets',await p.locator('.qe-sheet-title').textContent()==='本月预算')
 await p.locator('input[aria-label="本月支出预算"]').fill('3000');await p.locator('input[aria-label="本月收入目标"]').fill('8000')
 await p.locator('.qe-primary').click();await closed(p);await p.waitForTimeout(250)
 check('plans do not fabricate records or EXP',await p.evaluate(()=>test.state.ledger.length===0&&test.state.exp===17&&test.state.monthlyTargets['2026-11'].expense===300000))
 check('book SVG loads from a local data URI',await p.locator('.qe-empty-art').evaluate(e=>e.complete&&e.naturalWidth>0&&e.src.startsWith('data:image/svg+xml')))
 check('empty state arrow is rendered',await p.locator('.qe-empty-arrow').count()===1)
 await frame(p,47,34);await screenshot(p,'LEDGER_EMPTY')
 await p.locator('#quiet-entry-fab').click();await formFill(p,'30','午饭')
 await p.locator('.qe-primary').click()
 await p.waitForFunction(()=>!!document.querySelector('.qe-flight'))
 const flight=await p.locator('.qe-flight').evaluate(e=>({duration:getComputedStyle(e).animationDuration,dy:parseFloat(e.style.getPropertyValue('--entry-dy'))}))
 check('record flies from FAB with rebound duration',flight.duration==='0.48s'&&Number.isFinite(flight.dy)&&flight.dy!==0)
 await p.waitForTimeout(600)
 check('successful first addition replaces empty illustration',await p.locator('.qe-empty').count()===0&&await p.locator('.qe-record-row').count()===1)
 check('first addition has a small success tip',await p.locator('.qe-tip').textContent().then(t=>t.includes('第一笔已记下')))
 check('record and server proof are persisted',await p.evaluate(()=>test.state.ledger[0].note==='午饭'&&test.state.ledger[0].rewardVersion===1&&test.state.exp===17))
 await add(p,'5000','工资','income')
 check('income does not offset actual spending',await p.evaluate(()=>test.vm.expenseTotal===3000&&test.vm.incomeTotal===500000&&test.vm.distribution[0].percent===100))
 await add(p,'50','日用品','expense',1)
 await add(p,'20','地铁','expense',3)
 await p.locator('.qe-filter').first().click()
 check('all records are available',await p.locator('.qe-record-row').count()===4)
 check('income shows no spending percentage in mixed list',await p.locator('.qe-record-row').filter({hasText:'工资'}).locator('.qe-record-share').textContent()==='—')
 await p.locator('.qe-filter').nth(1).click()
 check('expense filter excludes income',await p.locator('.qe-record-row').count()===3)
 check('category amounts add to actual spending only',await p.evaluate(()=>test.vm.distribution.reduce((n,c)=>n+c.cents,0)===10000&&test.vm.budgetRemaining===290000))
 await screenshot(p,'LEDGER_RECORDED')
 await p.locator('#quiet-entry-fab').click();await formFill(p,'99','保留的草稿')
 await p.evaluate(()=>test.fail(true));await p.locator('.qe-primary').click();await p.locator('.qe-error').waitFor()
 check('save failure keeps input and does not append data',await p.locator('input[aria-label="记账金额"]').inputValue()==='99'&&await p.evaluate(()=>test.state.ledger.length===4))
 await p.evaluate(()=>test.flush());await p.evaluate(()=>test.back());await closed(p)
 check('hardware back closes sheet before navigating',await p.evaluate(()=>window.routes.length===0))
 await p.locator('#quiet-entry-fab').click()
 check('closing and reopening preserves unfinished entry',await p.locator('input[aria-label="记账备注"]').inputValue()==='保留的草稿')
 await p.evaluate(()=>test.back());await closed(p);await p.evaluate(()=>test.fail(false))
 await p.locator('.qe-record-row').filter({hasText:'午饭'}).click();await formFill(p,'35','午饭')
 await p.locator('.qe-primary').click();await closed(p)
 check('editing keeps record count and updates cents',await p.evaluate(()=>test.state.ledger.length===4&&test.state.ledger.find(x=>x.note==='午饭').cents===3500))
 await p.locator('.qe-record-row').filter({hasText:'地铁'}).click();await p.locator('.qe-danger-text').click();await p.locator('.fire-dialog-title').waitFor()
 check('delete confirmation says it cannot be recovered',await p.locator('.fire-dialog-content').textContent().then(t=>t.includes('无法恢复')))
 await p.locator('.fire-dialog-secondary').click()
 check('cancel deletion keeps the record',await p.evaluate(()=>test.state.ledger.length===4))
 await p.locator('.qe-danger-text').click();await p.locator('.fire-dialog-primary').click();await closed(p)
 check('confirmed deletion persists a single tombstone',await p.evaluate(()=>test.state.ledger.length===3&&test.state.deletions.some(x=>x.kind==='ledger')))
 await p.locator('.qe-header-action').click();await p.setViewportSize({width:390,height:520});await p.evaluate(()=>uni.emitKeyboard(324));await p.waitForTimeout(250)
 const panel=await p.locator('.qe-sheet-panel').boundingBox(),submit=await p.locator('.qe-primary').boundingBox()
 check('keyboard keeps panel and submit within available height',panel.y>=47+11&&submit.y+submit.height<=520+1)
 await screenshot(p,'BUDGET_KEYBOARD_HEIGHT')
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>uni.emitKeyboard(0));await p.evaluate(()=>test.back());await closed(p)
 await p.locator('.qe-month-step').first().click();await p.locator('.qe-sheet-mask').waitFor()
 check('history uses its own month plans and records',await p.evaluate(()=>test.vm.month==='2026-10'&&test.vm.records.length===0&&!test.vm.targetsReady))
 await p.evaluate(()=>test.back());await closed(p)
 await p.locator('.qe-back').click()
 check('header return pops actual previous page',await p.evaluate(()=>window.routes.at(-1)==='back'))
 await ctx.close()
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
  await v.p.goto('http://127.0.0.1:5189/?budget=1&top='+spec.top+'&bottom='+spec.bottom);await ready(v.p);await frame(v.p,spec.top,spec.bottom)
  await v.p.locator('#quiet-entry-fab').click();await v.p.waitForTimeout(250)
  const rect=await v.p.locator('.qe-primary').boundingBox()
  check('submit stays accessible at '+spec.width+'x'+spec.height,rect.y>=spec.top&&rect.y+rect.height<=spec.height+1)
  await v.p.evaluate(()=>test.back());await closed(v.p);await v.ctx.close()
 }
 const reduced=await context({width:390,height:844},'reduce');await reduced.p.goto('http://127.0.0.1:5189/?budget=1');await ready(reduced.p)
 check('reduced motion disables illustration float',await reduced.p.locator('.qe-empty-art').evaluate(e=>getComputedStyle(e).animationName)==='none')
 await add(reduced.p,'10','第一笔');check('reduced motion reveals the saved row immediately',await reduced.p.locator('.qe-record-arriving').count()===0)
 await reduced.ctx.close()
 check('no browser runtime errors',errors.length===0)
 console.log(checks+' real ledger/wishlist browser interaction, layout and keyboard checks passed')
}finally{for(const [name,data]of previews){console.log(name+'_PREVIEW_BEGIN');for(let i=0;i<data.length;i+=1000)console.log(data.slice(i,i+1000));console.log(name+'_PREVIEW_END')}await browser.close();await server.close();fs.rmSync(temp,{recursive:true,force:true})}
