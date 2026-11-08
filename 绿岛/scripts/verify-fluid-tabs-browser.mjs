import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {fileURLToPath,pathToFileURL} from 'node:url'
const tools=process.env.ENTRY_TOOLS||'/tmp/fire-entry-tools'
const root=fileURLToPath(new URL('..',import.meta.url)),temp=fs.mkdtempSync(path.join(os.tmpdir(),'fire-tabs-'))
fs.symlinkSync(path.join(tools,'node_modules'),path.join(temp,'node_modules'),'dir')
const timer=setTimeout(()=>{console.error('Fluid tabs browser deadline');process.exit(1)},180000)
const {createServer}=await import(pathToFileURL(path.join(tools,'node_modules/vite/dist/node/index.js')))
const {default:vue}=await import(pathToFileURL(path.join(tools,'node_modules/@vitejs/plugin-vue/dist/index.mjs')))
const {chromium}=await import(pathToFileURL(path.join(tools,'node_modules/playwright/index.mjs')))
fs.writeFileSync(path.join(temp,'index.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div><script type="module" src="/main.js"></script>')
fs.writeFileSync(path.join(temp,'store.js'),"export const state={monthlyTargets:{'2026-11':{expense:300000,income:800000}}}")

fs.writeFileSync(path.join(temp,'main.js'),"\nimport{createApp,defineComponent,ref,nextTick,KeepAlive,h}from'vue'\nimport BottomTabs from '@APP@/components/BottomTabs.vue'\nimport{pageEntryMixin}from'@APP@/utils/page-entry.js'\nimport{tabMotion}from'@APP@/utils/tab-motion.js'\nimport{TAB_KEYS,TAB_PATHS}from'@APP@/utils/tab-motion-core.js'\nimport '@APP@/utils/tab-content.css'\nimport './style.css'\nwindow.paths=TAB_PATHS;window.actual=TAB_PATHS[0];window.routes=[];window.nativeCalls=[];window.navDelay=60;window.failNext=false\nconst active=ref('home'),listeners=new Set()\nwindow.getCurrentPages=()=>[{route:window.actual.slice(1)}]\nwindow.uni={\n hideTabBar(){},getSystemInfoSync:()=>({windowWidth:innerWidth,windowHeight:innerHeight}),\n onWindowResize:f=>listeners.add(f),offWindowResize:f=>listeners.delete(f),\n navigateTo:o=>window.routes.push(o.url),showToast:o=>window.routes.push(o.title),\n switchTab(o){window.nativeCalls.push(o.url);setTimeout(async()=>{\n if(window.failNext){window.failNext=false;o.fail?.({errMsg:'cancel'});return}\n window.actual=o.url;active.value=TAB_KEYS[TAB_PATHS.indexOf(o.url)];await nextTick();o.success?.()\n },window.navDelay)},\n createSelectorQuery(){let vm,selector,cb;return{in(v){vm=v;return this},select(s){selector=s;return this},boundingClientRect(fn){cb=fn;return this},exec(){const el=vm.$el.querySelector(selector);cb?.(el?.getBoundingClientRect().toJSON())}}}\n}\nwindow.addEventListener('resize',()=>listeners.forEach(f=>f()))\ndocument.addEventListener('click',e=>e.target.dispatchEvent(new Event('tap',{bubbles:true,cancelable:true})),true)\nconst titles={home:'我的自由计划',tools:'工具',community:'FIRE 人生样本',profile:'我的'}\nconst Content=defineComponent({\n props:['tab'],components:{BottomTabs},mixins:[pageEntryMixin],\n data:()=>({note:'',count:0}),\n activated(){[].concat(this.$options.onShow||[]).forEach(f=>f.call(this))},\n deactivated(){[].concat(this.$options.onHide||[]).forEach(f=>f.call(this))},\n computed:{title(){return titles[this.tab]}},\n template:'<view class=\"test-page\"><view class=\"fire-tab-content\" :class=\"{\\'tab-content-reset\\':pageEntryReset,\\'tab-content-slide\\':!pageEntryReset}\" :style=\"tabEntryStyle\"><text class=\"headline\">{{title}}</text><text class=\"site\">fireday.cn</text><view class=\"sample\"><text class=\"eyebrow\">{{tab===\\'home\\'?\\'预计自由日\\':\\'让每一小步，都有方向。\\'}}</text><text class=\"countdown\">4 年 5 月 28 天</text><view class=\"track\"><view/></view><text class=\"summary\">当前资产 ¥ 15,000</text></view><view class=\"sample\"><text class=\"section-title\">今日行动</text><view class=\"task\">记录本月资产 <text>+ 5 EXP</text></view><view class=\"task\">记录今天的消费 <text>+ 3 EXP</text></view><input v-model=\"note\" placeholder=\"测试页面状态保留\"/><button @click=\"count++\">已操作 {{count}} 次</button></view><view class=\"below\">页面底部</view></view><BottomTabs ref=\"bottomNav\" :current=\"tab\"/></view>'\n})\nconst App=defineComponent({setup(){return()=>h(KeepAlive,null,{default:()=>h(Content,{key:active.value,tab:active.value})})}})\ncreateApp(App).mount('#app')\nwindow.test={get selected(){return tabMotion.selected},get motion(){return tabMotion.motion},get active(){return active.value},ready:true}\n".replaceAll('@APP@',root))
fs.writeFileSync(path.join(temp,'style.css'),"\nhtml,body{margin:0;background:#f5f6f2;color:#243830;font:14px -apple-system,BlinkMacSystemFont,\"Noto Sans CJK SC\",sans-serif}\nview{display:block;box-sizing:border-box}text{display:inline}image,img{object-fit:contain}button,input{font:inherit}button{background:#e6ece5;border:0;padding:8px;border-radius:8px}input{display:block;border:1px solid #dde3dc;border-radius:9px;padding:12px;width:100%;box-sizing:border-box;margin:14px 0}\n.test-page{padding:calc(24px + 47px) 20px 110px;min-height:100vh}\n.headline{display:block;font-size:27px;font-weight:700;color:#173d35;letter-spacing:1px}.site{display:block;color:#819085;margin-top:8px}\n.sample{background:#fff;padding:22px;border-radius:20px;margin-top:28px;border:1px solid #e1e6df}\n.eyebrow,.summary{display:block;font-size:13px;color:#768476}.countdown{display:block;font-size:30px;font-weight:650;margin:18px 0 24px}.track{height:5px;border-radius:8px;background:#e6ebe2;margin-bottom:20px}.track view{width:32%;height:5px;background:#63846e;border-radius:8px}.section-title{font-size:20px;font-weight:600}.task{padding:21px 0;border-bottom:1px solid #edf0e9}.task text{float:right;color:#748b79;font-size:11px}\n.below{margin-top:900px;color:#8a9389}\n.bottom-tabs{height:calc(60px + 34px)!important;padding-bottom:calc(6px + 34px)!important}.quick-menu{bottom:calc(36px + 34px)!important}\n@media(max-width:390px){.bottom-tabs{height:calc(56px + 34px)!important;padding-bottom:calc(4px + 34px)!important}.quick-menu{bottom:calc(32px + 34px)!important}}\n")

const server=await createServer({root:temp,configFile:false,plugins:[
{name:'uni-image',enforce:'pre',transform(s,id){if(id.endsWith('.vue'))return s.replace(/<image\b/g,'<img')}},
vue({template:{compilerOptions:{isCustomElement:t=>['view','text','scroll-view'].includes(t)}}})
],resolve:{alias:[{find:/^vue$/,replacement:path.join(tools,'node_modules/vue/dist/vue.esm-bundler.js')},{find:'@/store/index.js',replacement:path.join(temp,'store.js')},{find:'@',replacement:root}]},server:{host:'127.0.0.1',port:0,fs:{allow:[root,temp,tools]}}})
await server.listen()
const url='http://127.0.0.1:'+server.httpServer.address().port
const browser=await chromium.launch({headless:true})
let checks=0,preview=null,page=null
const check=(ok,label)=>{assert.ok(ok,label);checks++}
const errors=[]
try{
 page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1})
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(url);await page.waitForFunction(()=>window.test?.ready);await page.waitForTimeout(500)
 const nav=()=>page.locator('.bottom-tabs:visible')
 const tap=key=>nav().locator('[aria-label="'+key+'"]').click()
 const state=()=>page.evaluate(()=>{
  const bar=document.querySelector('.test-page .bottom-tabs'),flow=bar.querySelector('.tab-flow'),rect=flow.getBoundingClientRect()
  return {actual:window.actual,selected:window.test.selected,active:window.test.active,x:rect.x,width:rect.width,height:rect.height,bar:bar.getBoundingClientRect().toJSON(),opacity:getComputedStyle(bar).opacity,transform:getComputedStyle(document.querySelector('.fire-tab-content')).transform}
 })
 check(await nav().locator('.tab-label').allTextContents().then(t=>t.join(',')==='首页,工具,社区,我的'),'four labels')
 const initial=await state()
 await tap('我的');await page.waitForTimeout(100)
 const middle=await state()
 check(middle.width>initial.width+5&&middle.height<initial.height,'capsule stretches/flattens after native footer replacement')
 check(middle.opacity==='1','footer never fades with content')
 check(middle.active==='profile','native page arrived')
 check(await page.locator('.fire-tab-content').evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--tab-enter-x')))>0,'rightward content direction')
 await page.waitForTimeout(450)
 const end=await state()
 check(end.selected==='profile'&&end.x>initial.x+250&&Math.abs(end.width-initial.width)<1,'capsule settles on destination')
 await tap('首页');await page.waitForTimeout(110)
 check(await page.locator('.fire-tab-content').evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--tab-enter-x')))<0,'leftward content direction')
 await page.waitForTimeout(420)
 await tap('我的');await page.waitForTimeout(100)
 const continuity=await page.evaluate(async()=>{
  const before=document.querySelector('.bottom-tabs .tab-flow').getBoundingClientRect().toJSON()
  document.querySelector('.bottom-tabs [aria-label="首页"]').dispatchEvent(new Event('tap',{bubbles:true}))
  await new Promise(requestAnimationFrame)
  const after=document.querySelector('.bottom-tabs .tab-flow').getBoundingClientRect().toJSON()
  return {before,after}
 })
 check(Math.abs(continuity.after.x-continuity.before.x)<32&&Math.abs(continuity.after.width-continuity.before.width)<32,'interrupted capsule continues from current body')
 await page.waitForTimeout(600)
 await page.locator('input').fill('保留草稿')
 await page.evaluate(()=>{window.navDelay=160;const tabs=document.querySelectorAll('.bottom-tabs .tab-item');for(const i of [1,2,3])tabs[i].dispatchEvent(new Event('tap',{bubbles:true}))})
 await page.waitForTimeout(800)
 check((await state()).selected==='profile'&&(await state()).active==='profile','rapid taps last selection wins')
 check(await page.evaluate(()=>window.nativeCalls.slice(-2).join(',').includes('tools/index')&&!window.nativeCalls.slice(-2).join(',').includes('community/index')),'obsolete queued route skipped')
 await tap('首页');await page.waitForTimeout(650)
 check(await page.locator('input').inputValue()==='保留草稿','cached page data retained')
 await page.evaluate(()=>{window.navDelay=100;const tabs=document.querySelectorAll('.bottom-tabs .tab-item');for(const i of [3,1])tabs[i].dispatchEvent(new Event('tap',{bubbles:true}))})
 await page.waitForTimeout(650)
 check((await state()).selected==='tools'&&(await state()).active==='tools','rapid reversal lands on last tab')
 check(await page.locator('.fire-tab-content').evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue('--tab-enter-x')))<0,'queued reversal uses actual departing page direction')
 await tap('首页');await page.waitForTimeout(600)
 const before=await state()
 await page.evaluate(()=>{window.failNext=true})
 await tap('社区');await page.waitForTimeout(800)
 check((await state()).selected==='home'&&(await state()).active==='home','native failure restores selected tab')
 check(Math.abs((await state()).x-before.x)<1,'failed capsule returns to actual page')
 const calls=await page.evaluate(()=>window.nativeCalls.length)
 await tap('首页');await page.waitForTimeout(100)
 check(await page.evaluate(()=>window.nativeCalls.length)===calls,'same tab no native request')
 await nav().locator('.center-action').click()
 check(await nav().locator('.quick-menu').evaluate(el=>el.classList.contains('open')),'center fan retained')
 await nav().locator('#fire-guide-ledger').click()
 check(await page.evaluate(()=>window.routes.at(-1))==='/pages/ledger/edit','classic category-first ledger retained')
 await page.evaluate(()=>{window.navDelay=60})
 await tap('我的');await page.waitForTimeout(90)
 const centerHit=await nav().locator('.center-action').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})
 check(centerHit,'plus remains above flowing capsule')
 await page.waitForTimeout(450)
 for(const width of [360,430,844,390]){
  await page.setViewportSize({width,height:width===844?390:844});await page.waitForTimeout(120)
  const s=await state()
  check(s.x>=0&&s.x+s.width<=width,'capsule fits '+width)
  check(s.bar.bottom<= (width===844?390:844)+1,'safe inset stays in viewport '+width)
  check(await nav().locator('.tab-item').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect();return r.height>=40&&r.width>=44})),'hit targets '+width)
 }
 await tap('首页');await page.waitForTimeout(600)
 preview=await page.screenshot({type:'jpeg',quality:72})
 await page.emulateMedia({reducedMotion:'reduce'})
 await tap('工具');await page.waitForTimeout(90)
 check(await nav().locator('.tab-flow').evaluate(el=>getComputedStyle(el).animationName)==='none','reduced motion static capsule')
 check(await page.locator('.fire-tab-content').evaluate(el=>getComputedStyle(el).animationName)==='none','reduced motion no page push')
 await page.waitForTimeout(450)
 check((await state()).active==='tools'&&(await state()).selected==='tools','reduced motion routes normally')
 check(errors.length===0,errors.join('\n'))
 console.log('Fluid tabs real Vue mobile browser: '+checks+' checks passed')
}finally{
 if(!preview&&page){preview=await page.screenshot({type:'jpeg',quality:72});console.log('Failure state:',JSON.stringify(await page.evaluate(()=>({labels:[...document.querySelectorAll('.tab-label')].map(x=>x.textContent),body:document.body.innerText.slice(0,500),actual:window.actual,selected:window.test?.selected}))))}
 if(preview){console.log('FLUID_TABS_PREVIEW_BEGIN');const data=preview.toString('base64');for(let i=0;i<data.length;i+=1000)console.log(data.slice(i,i+1000));console.log('FLUID_TABS_PREVIEW_END')}
 console.log('Browser errors:',JSON.stringify(errors))
 await browser.close();await server.close();clearTimeout(timer);fs.rmSync(temp,{recursive:true,force:true})
}
