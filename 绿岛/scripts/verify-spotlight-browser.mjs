
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
const tools=process.env.SPOTLIGHT_TOOLS||'/tmp/fire-spotlight-tools'
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)))
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fire-spotlight-'))
const testTimer=setTimeout(()=>{console.error('Browser test exceeded deadline');process.exit(1)},180000)
const {createServer}=await import(pathToFileURL(path.join(tools,'node_modules/vite/dist/node/index.js')))
const {default:vue}=await import(pathToFileURL(path.join(tools,'node_modules/@vitejs/plugin-vue/dist/index.mjs')))
const {chromium}=await import(pathToFileURL(path.join(tools,'node_modules/playwright/index.mjs')))
const {default:pngjs}=await import(pathToFileURL(path.join(tools,'node_modules/pngjs/lib/png.js')))
const {PNG}=pngjs
fs.writeFileSync(path.join(temp,'index.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script type="module" src="/main.js"></script>')
fs.writeFileSync(path.join(temp,'store.js'),"import{reactive}from'vue';export const state=reactive({ready:false,monthlyTargets:{},cloudSync:{status:'synced'}});export const persistNow=()=>true")
fs.writeFileSync(path.join(temp,'wishlist.js'),"import{reactive}from'vue';export const wishlistReminder=reactive({owner:null,id:''});export const maybePromptWishlist=()=>{}")
fs.writeFileSync(path.join(temp,'main.js'),`
import {createApp} from 'vue'
import App from './Harness.vue'
const q=new URLSearchParams(location.search)
document.documentElement.style.setProperty('--test-bottom',Number(q.get('bottom')||34)+'px')
window.routes=[];window.storageFail=false
window.uni={
 getStorageSync(key){const v=localStorage.getItem(key);return v===null?'':JSON.parse(v)},
 setStorageSync(key,value){if(window.storageFail)throw Error('disk full');localStorage.setItem(key,JSON.stringify(value))},
 removeStorageSync(key){localStorage.removeItem(key)},
 getWindowInfo(){return{windowWidth:innerWidth,windowHeight:innerHeight,statusBarHeight:Number(q.get('top')||47),safeAreaInsets:{top:Number(q.get('top')||47),bottom:Number(q.get('bottom')||34)}}},
 getSystemInfoSync(){return this.getWindowInfo()},
 hideTabBar(){},hideKeyboard(){},
 navigateTo(o){window.routes.push(o.url)},switchTab(o){window.routes.push(o.url)},
 pageScrollTo(o){window.scrollTo(0,o.scrollTop);setTimeout(()=>o.complete?.(),o.duration||0)},
 createSelectorQuery(){let context=null,selector='';const tasks=[];const api={
 in(value){context=value;return api},select(value){selector=value;return api},selectViewport(){return api},
 boundingClientRect(callback){tasks.push(()=>{const host=context?.$el instanceof Element?context.$el:document;const el=host.matches?.(selector)?host:host.querySelector(selector);callback(el?el.getBoundingClientRect().toJSON():null)});return api},
 scrollOffset(callback){tasks.push(()=>callback({scrollTop:window.scrollY}));return api},
 exec(){requestAnimationFrame(()=>tasks.forEach(task=>task()));return api}
 };return api}
}
window.getCurrentPages=()=>[{route:'pages/index/index'}]
if(!localStorage.getItem('fire_account_uid'))uni.setStorageSync('fire_account_uid','A')
uni.setStorageSync('fire_login_status',true)
document.addEventListener('click',event=>event.target.dispatchEvent(new Event('tap',{bubbles:true,cancelable:true})),true)
createApp(App).mount('#app')
`)
const homeStyle=fs.readFileSync(path.join(root,'pages/index/index.vue'),'utf8').match(/<style[^>]*>([\s\S]*?)<\/style>/)[1].replace("@import '../../utils/tab-content.css';",fs.readFileSync(path.join(root,'utils/tab-content.css'),'utf8'))
fs.writeFileSync(path.join(temp,'Harness.vue'),`
<template>
 <view class="page home-page" :style="pageLayoutStyle">
  <view class="test-status"><text>9:41</text><text>▮▮▮ ▰</text></view>
  <view class="home-view">
   <view class="masthead"><text class="masthead-title">我的自由计划</text><text class="masthead-date">fireday.cn</text></view>
   <view class="freedom-summary">
    <template v-if="!configured"><text class="eyebrow">从今天，开始规划自由</text><text class="hero-title">看看你的自由日</text><text class="hero-description">记录当下，让目标慢慢靠近。</text><button id="fire-guide-finance" class="btn-primary" @tap="business">填写资料</button></template>
    <template v-else><text class="eyebrow">距离理想生活，还有</text><text class="hero-title">4 年 5 月 28 天</text><text class="hero-description">预计到达 2031 年 5 月 2 日</text><view class="plan-link" id="fire-guide-finance" @tap="business">查看计划 ›</view></template>
   </view>
   <view class="test-metrics"><view>本月消费<text>¥ 6050</text></view><view>本月收入<text>待填写</text></view><view>拔草已省下<text>¥ 0</text></view></view>
   <view class="test-actions"><view class="test-actions-title">今日行动<text>0 / 3</text></view><view v-for="item in ['记录本月资产','记录今天的消费','检视储蓄目标']" :key="item" class="test-action"><view class="test-icon">◇</view><text>{{item}}</text><text class="test-action-go">去完成 ›</text></view></view>
   <view class="test-footer">F.I.R.E · 让选择回到自己手中</view>
  </view>
  <BottomTabs ref="guideTabs" current="home" :guide-active="spotlightActive" :guide-menu-open="spotlightMenuOpen"/>
  <SpotlightGuide :visible="spotlightVisible" :rect="spotlightRect" :viewport="spotlightViewport" :step="spotlightStep" :busy="spotlightBusy" :title="spotlightTitle" :description="spotlightDescription" @next="advanceSpotlight" @skip="finishSpotlight('skipped')" @closed="spotlightClosed"/>
 </view>
</template>
<script>
import {spotlightHomeMixin} from '@/utils/spotlight-home.js'
import {state} from '@/store/index.js'
import {pageLayoutStyle,refreshPageLayout} from '@/utils/page-layout.js'
import {feedbackState,activateFeedbackOwner,dismissFeedback} from '@/utils/feedback.js'
import {accountId} from '@/utils/account-cache.js'
import {requestGuideReplay,guideCompleted,guideKey} from '@/utils/spotlight-guide.js'
import BottomTabs from '@/components/BottomTabs.vue'
import SpotlightGuide from '@/components/SpotlightGuide.vue'
export default{
 components:{BottomTabs,SpotlightGuide},mixins:[spotlightHomeMixin],
 data(){return{pageVisible:true,pageEntryReset:false,feedbackOwnerId:1,configured:false,pageLayoutStyle}},
 computed:{displayConfigured(){return this.configured}},
 mounted(){
  refreshPageLayout();activateFeedbackOwner(1);spotlightHomeMixin.onShow.call(this)
  const vm=this
  window.tour={
   ready(){state.ready=true},step:()=>vm.spotlightStep,busy:()=>vm.spotlightBusy,
   replay(){requestGuideReplay(accountId());spotlightHomeMixin.onShow.call(vm)},
   hide(){vm.pageVisible=false;spotlightHomeMixin.onHide.call(vm)},
   show(){vm.pageVisible=true;spotlightHomeMixin.onShow.call(vm)},
   account(uid){this.hide();uni.setStorageSync('fire_account_uid',uid);this.show()},
   dialog(open){feedbackState.dialog=open?{owner:1}:null},
   cloud(status){state.cloudSync.status=status},
   configured(value){vm.configured=value},
   resize(){refreshPageLayout();spotlightHomeMixin.onResize.call(vm)},
   back(){return dismissFeedback(1)},
   completed:()=>guideCompleted(uni,accountId()),
   stored:()=>uni.getStorageSync(guideKey(accountId())),
   unmount(){vm.$.appContext.app.unmount()}
  }
  if(new URLSearchParams(location.search).get('auto')!=='false')state.ready=true
 },
 methods:{business(){window.routes.push('finance')}}
}
</script>
<style>${homeStyle}
html,body{margin:0;background:#fafbf7;color:#243830;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans CJK SC",sans-serif;font-size:14px}view{display:block}text{display:inline}button{font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;box-sizing:border-box}
.page{min-height:100vh;box-sizing:border-box;padding:calc(var(--fire-status-top) + 12px) 16px 90px;background:linear-gradient(155deg,#315e4d 0,#c6d5c5 220px,#fafbf7 440px)}
.bottom-tabs{height:calc(60px + var(--test-bottom))!important;padding-bottom:calc(6px + var(--test-bottom))!important}.quick-menu{bottom:calc(36px + var(--test-bottom))!important}@media(max-width:390px){.bottom-tabs{height:calc(56px + var(--test-bottom))!important;padding-bottom:calc(4px + var(--test-bottom))!important}.quick-menu{bottom:calc(32px + var(--test-bottom))!important}}
.test-status{position:absolute;left:21px;right:21px;top:12px;display:flex;justify-content:space-between;font-weight:600;color:#fff}
.masthead-title{display:block;font-size:25px;font-weight:650;line-height:1.4;color:#fff}.masthead-date{display:block;font-size:13px;margin-top:5px;color:#eff3ed}
.freedom-summary{margin-top:42px;margin-bottom:24px}.eyebrow{display:block;font-size:15px;color:#35533f}.hero-title{display:block;font-size:28px;font-weight:650;margin-top:8px;line-height:1.35}.hero-description{display:block;margin:12px 0 18px;color:#566b5b;line-height:1.5}.btn-primary{width:100%;height:48px;border:0;border-radius:12px;background:#243f33;color:white;font-size:16px}.plan-link{display:inline-block;padding:10px 0;min-height:24px}
.test-metrics{display:flex;justify-content:space-between;border-top:1px solid #dce3d9;border-bottom:1px solid #dce3d9;padding:20px 0;color:#66776a;font-size:12px}.test-metrics text{display:block;font-weight:600;font-size:20px;color:#294f40;margin-top:12px}
.test-actions-title{display:flex;justify-content:space-between;font-size:20px;font-weight:650;margin:24px 0 14px}.test-actions-title text{font-size:13px;font-weight:400;color:#788679}.test-action{display:flex;align-items:center;gap:12px;min-height:72px;border-bottom:1px solid #dfe5db}.test-icon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;background:#edf3e8;color:#789780;font-size:26px}.test-action-go{margin-left:auto;font-size:12px;color:#66846e}.test-footer{text-align:center;padding:36px 0 18px;color:#939d91;font-size:12px;letter-spacing:1px}
</style>
`)
const server=await createServer({
 root:temp,configFile:false,
 plugins:[{name:'uni-image-test-adapter',enforce:'pre',transform(code,id){if(id.endsWith('.vue'))return code.replace(/<image\b/g,'<img');return null}},
 vue({template:{compilerOptions:{isCustomElement:t=>['view','text'].includes(t)}}})],
 resolve:{alias:[
 {find:'@/store/index.js',replacement:path.join(temp,'store.js')},
 {find:'@/utils/wishlist-reminder.js',replacement:path.join(temp,'wishlist.js')},
 {find:'vue',replacement:path.join(tools,'node_modules/vue/dist/vue.esm-bundler.js')},
 {find:'@',replacement:root}]},
 server:{host:'127.0.0.1',port:5187,strictPort:true,fs:{allow:[root,temp,tools]}}
})
await server.listen()
const browser=await chromium.launch({headless:true})
const errors=[],screens=[]
const originalContext=browser.newContext.bind(browser)
browser.newContext=async options=>{const c=await originalContext(options);c.setDefaultTimeout(12000);return c}
let checks=0
const check=(value,message)=>{assert.ok(value,message);checks++}
const settle=page=>page.waitForFunction(()=>!!document.querySelector('.fire-spotlight-next')&&!window.tour.busy())
const absent=page=>page.waitForFunction(()=>!document.querySelector('.fire-spotlight'))
async function next(page){await settle(page);await page.locator('.fire-spotlight-next').click();await settle(page)}
async function boxes(page){return page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{hole:r('.fire-spotlight-hole'),bubble:r('.fire-spotlight-anchor'),skip:r('.fire-spotlight-skip'),target:r(window.tour.step()===0?'#fire-guide-ledger':window.tour.step()===1?'#fire-guide-finance':'#fire-guide-tools')}})}
async function geometry(page,top,bottom){
 const b=await boxes(page),v=page.viewportSize()
 check(b.hole.top>=top&&b.hole.bottom<=v.height-bottom+1,'highlight respects system insets')
 check(b.bubble.left>=15&&b.bubble.right<=v.width-15&&b.bubble.top>=top+59&&b.bubble.bottom<=v.height-bottom+1,'bubble fits viewport '+JSON.stringify(b))
 check(b.bubble.bottom<=b.hole.top-8||b.bubble.top>=b.hole.bottom+8,'bubble does not cover target')
 check(b.skip.top>=top+11,'skip clears status bar')
 check(b.hole.left<=b.target.left+1&&b.hole.right>=b.target.right-1,'hole includes target horizontally')
 check(b.hole.top<=b.target.top+1&&b.hole.bottom>=b.target.bottom-1,'hole includes target vertically '+JSON.stringify({viewport:v,top,bottom,boxes:b,step:await page.evaluate(()=>window.tour.step())}))
}
async function preview(page,name){screens.push([name,(await page.screenshot({type:'jpeg',quality:72})).toString('base64')])}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1})
 const page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER ERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.error('BROWSER CONSOLE',m.text())})
 await page.goto('http://127.0.0.1:5187/?auto=false')
 await page.waitForFunction(()=>!!window.tour)
 const before=PNG.sync.read(await page.screenshot())
 await page.evaluate(()=>window.tour.ready());await settle(page)
 await geometry(page,47,34);await preview(page,'STEP_1')
 const after=PNG.sync.read(await page.screenshot()),pixel=(400*390+5)*4
 for(let c=0;c<3;c++)check(Math.abs(after.data[pixel+c]-before.data[pixel+c]*.3)<5,'mask is approximately 70 percent black')
 check(await page.locator('.quick-menu').evaluate(e=>e.classList.contains('open')),'fan menu opens without redesign')
 await page.evaluate(()=>{window.originalHole=document.querySelector('.fire-spotlight-hole');window.startHole=window.originalHole.getBoundingClientRect().toJSON()})
 await page.mouse.click(253,760)
 check(await page.evaluate(()=>window.routes.length===0),'highlight blocks accidental business navigation')
 await settle(page)
 await page.locator('.fire-spotlight-next').click()
 await page.waitForFunction(()=>window.tour.step()===1)
 await page.waitForTimeout(100)
 const mid=await page.evaluate(()=>({same:window.originalHole===document.querySelector('.fire-spotlight-hole'),top:document.querySelector('.fire-spotlight-hole').getBoundingClientRect().top,start:window.startHole.top,end:parseFloat(document.querySelector('.fire-spotlight-hole').style.top)}))
 check(mid.same&&mid.top<mid.start&&mid.top>mid.end,'same hole moves continuously between targets')
 await page.evaluate(()=>{for(let i=0;i<8;i++)document.querySelector('.fire-spotlight-next').dispatchEvent(new Event('tap',{bubbles:true}))})
 check(await page.evaluate(()=>window.tour.step()===1),'rapid taps cannot skip steps')
 await settle(page);await geometry(page,47,34);await preview(page,'STEP_2')
 await next(page);await geometry(page,47,34);await preview(page,'STEP_3')
 check(await page.locator('.fire-spotlight-next').textContent()==='知道了','last button label')
 await page.locator('.fire-spotlight-next').click();await absent(page)
 check(await page.evaluate(()=>window.tour.completed()&&document.body.style.overflow===''),'completion persists and releases scroll lock')
 await page.reload();await page.waitForFunction(()=>!!window.tour);await page.evaluate(()=>window.tour.ready());await page.waitForTimeout(1100)
 check(await page.locator('.fire-spotlight').count()===0,'completion does not replay after reload')
 await page.evaluate(()=>window.tour.replay());await settle(page)
 await page.locator('.fire-spotlight-skip').click();await absent(page)
 check(await page.evaluate(()=>window.tour.stored().reason==='skipped'),'skip persists')
 await page.evaluate(()=>window.tour.account('B'));await settle(page)
 check(await page.evaluate(()=>!window.tour.completed()),'new account gets its own guide')
 await page.evaluate(()=>window.tour.dialog(true));await absent(page)
 check(await page.evaluate(()=>!window.tour.completed()&&document.body.style.overflow===''),'higher priority dialog pauses guide without completing')
 await page.evaluate(()=>window.tour.dialog(false));await settle(page)
 await page.evaluate(()=>window.tour.cloud('conflict'));await absent(page)
 await page.evaluate(()=>window.tour.cloud('synced'));await settle(page)
 await page.evaluate(()=>window.tour.hide());await absent(page)
 await page.evaluate(()=>window.tour.show());await settle(page)
 await page.evaluate(()=>window.tour.back());await absent(page)
 check(await page.evaluate(()=>window.tour.completed()),'hardware back equivalent safely skips')
 await page.evaluate(()=>{window.tour.account('A');window.tour.replay();window.tour.configured(true)});await settle(page)
 await next(page)
 check(await page.locator('#fire-spotlight-title').textContent()==='查看你的自由计划','configured user highlights existing plan')
 await geometry(page,47,34)
 await page.setViewportSize({width:430,height:932});await page.evaluate(()=>window.tour.resize());await settle(page);await geometry(page,47,34)
 await page.evaluate(()=>window.tour.account('C'))
 await page.waitForFunction(()=>window.tour.busy())
 await page.evaluate(()=>window.tour.account('D'));await settle(page)
 check(await page.evaluate(()=>uni.getStorageSync('fire_account_uid')==='D'&&window.tour.step()===0&&!window.tour.completed()&&!uni.getStorageSync('fire_spotlight_guide_v1:account:C')),'account change cancels pending target measurement')
 await page.evaluate(()=>window.tour.unmount());await absent(page)
 check(await page.evaluate(()=>document.body.style.overflow===''),'unmount restores document')
 await context.close()
 for(const spec of [
  {width:360,height:640,top:24,bottom:0},
  {width:430,height:932,top:59,bottom:34},
  {width:844,height:390,top:24,bottom:20}
 ]){
  const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1})
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message))
  await p.goto('http://127.0.0.1:5187/?top='+spec.top+'&bottom='+spec.bottom);await settle(p)
  for(let step=0;step<3;step++){await geometry(p,spec.top,spec.bottom);if(step<2)await next(p)}
  await p.locator('.fire-spotlight-next').click();await absent(p);await ctx.close()
 }
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})
 const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5187/');await settle(p)
 check(await p.locator('.fire-spotlight-outline').evaluate(e=>getComputedStyle(e).animationName)==='none','reduced motion disables breathing')
 check(await p.locator('.fire-spotlight-hole').evaluate(e=>getComputedStyle(e).transitionDuration)==='0s','reduced motion disables sliding')
 await p.setViewportSize({width:844,height:390});await p.evaluate(()=>window.tour.resize());await settle(p)
 await p.addStyleTag({content:'.fire-spotlight-title{font-size:30px!important}.fire-spotlight-description{font-size:25px!important}'})
 await p.evaluate(()=>window.tour.resize());await settle(p);await geometry(p,47,34)
 const overflow=await p.locator('.fire-spotlight-copy').evaluate(e=>e.scrollHeight>e.clientHeight)
 check(overflow,'large type fixture exercises scrollable copy')
 await p.locator('.fire-spotlight-copy').hover();await p.mouse.wheel(0,120);await p.waitForTimeout(150)
 check(await p.locator('.fire-spotlight-copy').evaluate(e=>e.scrollTop>0),'large type explanation can scroll without moving underlying page')
 await next(p);await geometry(p,47,34);await next(p);await geometry(p,47,34);await p.locator('.fire-spotlight-next').click();await absent(p);await ctx.close()
 check(errors.length===0,'browser runtime errors: '+errors.join('; '))
 console.log(checks+' browser interaction, geometry, persistence and accessibility checks passed')
 for(const [name,data]of screens){console.log(name+'_PREVIEW_BEGIN');for(let n=0;n<data.length;n+=1000)console.log(data.slice(n,n+1000));console.log(name+'_PREVIEW_END')}
}finally{clearTimeout(testTimer);await browser.close();await server.close();fs.rmSync(temp,{recursive:true,force:true})}
