
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
export const refreshMembershipFromServer=async()=>null
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
const baseRoute=q.get('page')==='ai'?'pages/ai/index':q.get('page')==='personality'?'pages/personality/index':q.get('page')==='profile-edit'?'pages/profile/edit':q.get('page')==='community'?'pages/community/index':'pages/login/login'
window.getCurrentPages=()=>window.documentRoute?[{route:baseRoute,options:{}},{route:window.documentRoute,options:{}}]:[{route:baseRoute,options:{}}]

document.addEventListener('click',e=>e.target.dispatchEvent(new Event('tap',{bubbles:true,cancelable:true})),true)
const Picker=defineComponent({
 props:['mode','fields','value','range','rangeKey','start','end'],emits:['change'],
 setup(p,{emit,slots}){return()=>h('div',{class:'test-picker'},[slots.default?.(),p.mode==='date'?h('input',{type:p.fields==='month'?'month':'date',class:'test-picker-control',value:p.value,min:p.start,max:p.end,onChange:e=>emit('change',{detail:{value:e.target.value}})}):h('select',{class:'test-picker-control',value:p.value,onChange:e=>emit('change',{detail:{value:e.target.value}})},(p.range||[]).map((v,i)=>h('option',{value:i},v[p.rangeKey]||v)))])}
})
const modules={ai:()=>import('@/pages/ai/index.vue'),personality:()=>import('@/pages/personality/index.vue'),'profile-edit':()=>import('@/pages/profile/edit.vue'),privacy:()=>import('@/pages/privacy/index.vue'),terms:()=>import('@/pages/terms/index.vue'),ledger:()=>import('@/pages/ledger/index.vue'),wish:()=>import('@/pages/wishlist/index.vue'),edit:()=>import('@/pages/ledger/edit.vue'),home:()=>import('@/pages/index/index.vue'),community:()=>import('@/pages/community/index.vue'),login:()=>import('@/pages/login/login.vue')}
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
fs.writeFileSync(path.join(temp,'profile-api.js'),"export async function askBehaviorAI(payload){window.chatPayload=payload;window.chatCalls=(window.chatCalls||0)+1;return new Promise((resolve,reject)=>{window.resolveChat=resolve;window.rejectChat=reject})} export async function reviewAndSaveNickname(name){window.nicknameCalls=(window.nicknameCalls||0)+1;return new Promise((resolve,reject)=>{window.resolveNickname=resolve;window.rejectNickname=reject})}")

fs.writeFileSync(path.join(temp,'ai-chat-store.js'),"export const loadAIChats=async()=>[];export const saveAIChats=async chats=>{window.savedChats=chats;return chats}")

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
{find:'@/utils/ai-chat-store.js',replacement:path.join(temp,'ai-chat-store.js')},
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
 const nick=await context()
 await nick.p.goto('http://127.0.0.1:5189/?page=profile-edit');await ready(nick.p)
 check('nickname field enforces eight-character UI limit',await nick.p.locator('input[aria-label="昵称"]').getAttribute('maxlength')==='8')
 await nick.p.locator('input[aria-label="昵称"]').fill('一路向阳天天开心')
 check('eight normal characters remain editable',await nick.p.locator('input[aria-label="昵称"]').inputValue()==='一路向阳天天开心')
 await nick.p.locator('input[aria-label="昵称"]').fill('傻B')
 await nick.p.locator('.save').click()
 check('obvious disguised abuse blocked before request',await nick.p.locator('.review-message').textContent().then(t=>t.includes('不适合'))&&await nick.p.evaluate(()=>!window.nicknameCalls))
 await nick.ctx.close()
 const chat=await context()
 await chat.p.goto('http://127.0.0.1:5189/?page=ai');await ready(chat.p)
 await chat.p.evaluate(()=>{window.test.state.personalityTests={mbti:{title:'INFP',source:'self_reported'}};window.test.vm.syncPrerequisites()})
 await chat.p.locator('.question').waitFor()
 await chat.p.locator('.question').fill('请给我一个简短的生活建议')
 await chat.p.locator('.send').click()
 await chat.p.waitForFunction(()=>window.chatCalls===1)
 check('question sends once during generation',await chat.p.locator('.send').isDisabled())
 await chat.p.evaluate(()=>window.resolveChat({reply:'建议'.repeat(400),reviewed:true,used:1}))
 await chat.p.waitForFunction(()=>!window.test.vm.loading,{},{timeout:16000})
 const answer=await chat.p.locator('.message-row.assistant .message-bubble').last().textContent()
 check('mobile output is five hundred characters or fewer',Array.from(answer).length<=500&&answer.endsWith('…'))
 check('one successful reply consumes one free use',await chat.p.evaluate(()=>window.test.vm.freeUsed===1))
 await screenshot(chat.p,'AI_FIVE_HUNDRED')
 await chat.p.locator('.question').fill('这次请求会失败')
 await chat.p.locator('.send').click();await chat.p.waitForFunction(()=>window.chatCalls===2)
 await chat.p.evaluate(()=>window.rejectChat(Error('本次回答未通过审核，请换一种说法后重试')))
 await chat.p.waitForFunction(()=>!window.test.vm.loading)
 check('review failure leaves free count unchanged',await chat.p.evaluate(()=>window.test.vm.freeUsed===1))
 check('review failure is explained without unsafe body',await chat.p.locator('.message-row.assistant').last().textContent().then(t=>t.includes('未通过审核')))
 await chat.p.evaluate(()=>{window.test.vm.chats=[{id:'legacy',title:'旧聊天',messages:[{role:'assistant',text:'原'.repeat(700)}]}];window.test.vm.selectChat('legacy')})
 await chat.p.waitForTimeout(80)
 check('old long answers are bounded only for display',Array.from(await chat.p.locator('.message-row.assistant .message-bubble').textContent()).length<=500&&await chat.p.evaluate(()=>window.test.vm.messages[0].text.length===700))
 await chat.p.evaluate(()=>{window.test.vm.saveCurrentChat()});await chat.p.waitForTimeout(80)
 check('saving does not destroy older full chat history',await chat.p.evaluate(()=>window.savedChats[0].messages[0].text.length===700))
 await chat.ctx.close()
 const mbti=await context()
 await mbti.p.goto('http://127.0.0.1:5189/?page=personality');await ready(mbti.p)
 await mbti.p.locator('.mbti-quiz').click()
 check('complete MBTI starts at first of one hundred',await mbti.p.locator('.quiz-meta').textContent().then(t=>t.includes('1 / 100')))
 const axisOrder=['EI','SN','TF','JP']
 // Each block of four visits one question of every axis. Alternating blocks are reverse.
 // Semantic target INFP: agree with I/N/F/P statements, disagree with E/S/T/J.
 const expected='INFP'
 for(let i=0;i<100;i++){
  const axisIndex=i%4,reverse=Math.floor(i/4)%2===1,firstLetter=expected[axisIndex]===axisOrder[axisIndex][0]
  const value=reverse?(firstLetter?1:5):(firstLetter?5:1)
  await mbti.p.locator('.answer').nth(value-1).click();await mbti.p.waitForTimeout(235)
 }
 check('all hundred answers yield semantic INFP target',await mbti.p.locator('.result-type').textContent().then(t=>t.startsWith('INFP')))
 check('four independent percentage rows remain',await mbti.p.locator('.result-row').count()===4)
 check('questionnaire source and all results saved',await mbti.p.evaluate(()=>window.test.state.personalityTests.mbti.source==='questionnaire'&&window.test.state.personalityTests.mbti.mbtiType==='INFP'&&window.savedPersonalities.length===1))
 await screenshot(mbti.p,'MBTI_HUNDRED_QUESTIONS')
 await mbti.ctx.close()
 check('no runtime page errors',errors.length===0)
 console.log(checks+' strict nickname, bounded AI and complete MBTI browser checks passed')
}finally{
 for(const[name,data]of previews){console.log(name+'_PREVIEW_BEGIN');for(let i=0;i<data.length;i+=1000)console.log(data.slice(i,i+1000));console.log(name+'_PREVIEW_END')}
 console.log('Browser errors:',JSON.stringify(errors))
 await browser.close();await server.close();clearTimeout(deadline);fs.rmSync(temp,{recursive:true,force:true})
}
