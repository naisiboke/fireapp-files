const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict')
const {parse,compileTemplate}=require(process.cwd()+'/绿岛/node_modules/@vue/compiler-sfc')
const {chromium}=require('playwright')
const read=p=>fs.readFileSync(p,'utf8')
const files=['绿岛/pages/index/index.vue','绿岛/components/CountdownSwitch.vue','绿岛/pages/messages/index.vue']
const bundles=files.map((p,i)=>{
 const d=parse(read(p)).descriptor
 let script=d.script.content.replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/gm,'').replace('export default','return')
 const compiled=compileTemplate({source:d.template.content.replace(/<image\b/g,'<img').replace(/<\/image>/g,'</img>'),id:'test'+i,compilerOptions:{isCustomElement:t=>['view','text','image'].includes(t)}})
 assert.equal(compiled.errors.length,0,JSON.stringify(compiled.errors))
 return {script,render:compiled.code.replace(/from "vue"/g,'from "/vue.js"').replace('export function render','function render')+';export default render',css:d.styles.map(x=>x.content.replace(/@import[^;]+;/g,'')).join('\n')}
})
const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#fdfdfb;font-family:Arial}view{display:block}button{font:inherit;box-sizing:border-box}button:after{border:0}'+bundles.map(x=>x.css).join('\n')+read('绿岛/styles/press-feedback.css')+'</style><div id="app"></div><script type="module" src="/preview.js"></script>'
const preview=read('tools/compact-home-preview-client.js').replace('__BUNDLES__',JSON.stringify(bundles)).replace('__NOTIFICATION_SOURCE__',JSON.stringify(read('绿岛/utils/notifications.js').replace(/^import .*$/gm,'').replace(/^export /gm,'')))
const routes={'/':html,'/preview.js':preview,'/vue.js':read('绿岛/node_modules/vue/dist/vue.esm-browser.prod.js'),'/task-model.js':read('绿岛/utils/action-tasks.js'),'/engine.js':read('绿岛/utils/engine.js'),'/wishlist.js':read('绿岛/utils/wishlist.js'),'/actions.js':read('绿岛/utils/action-navigation.js'),'/navigation.js':read('绿岛/utils/message-navigation.js'),'/membership.js':read('绿岛/utils/membership.js')}
bundles.forEach((x,i)=>routes['/render'+i+'.js']=x.render)
;(async()=>{
 const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;if(!routes[p]){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':p==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8'}).end(routes[p])}).listen(0,'127.0.0.1')
 await new Promise(r=>server.once('listening',r))
 const browser=await chromium.launch({headless:true})
 try{
  for(const width of [320,390,430]){
   const page=await browser.newPage({viewport:{width,height:844}})
   const errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready)
   await page.evaluate(()=>window.prepare());await page.waitForTimeout(450)
   assert.equal(await page.locator('.masthead-bg,.masthead-fade,.countdown-clock').count(),0,'no hero gradient or seconds clock')
   assert.equal(await page.locator('.home-metrics .metric').count(),3)
   assert.equal(await page.locator('.task-row').count(),3)
   assert.match(await page.locator('.metric-expense').innerText(),/6,150/)
   assert.match(await page.locator('.metric-income').innerText(),/15,000/)
   assert.equal(await page.locator('.metric-status').innerText(),'已超额')
   assert.match(await page.locator('.freedom-summary').innerText(),/距离自由还有/)
   assert.match(await page.locator('.summary-stat-value').first().innerText(),/80,000/)
   assert.match(await page.locator('.wishlist-home-sub').innerText(),/待确认是否购买/)
   assert.equal(await page.locator('.account-sync-banner').count(),0)
   assert(await page.locator('.home-masthead').evaluate(el=>{const s=getComputedStyle(el);return s.backgroundImage==='none'}))
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'home fits '+width)
   await page.locator('.metric').first().evaluate(el=>el.scrollIntoView({block:'center'}))
   const metric=page.locator('.metric').first(),box=await metric.boundingBox()
   const routeCount=await page.evaluate(()=>window.routes.length)
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(220)
   assert(await metric.evaluate(el=>Number(getComputedStyle(el).transform.match(/matrix\(([^,]+)/)?.[1])<.99),'metric shrinks during press')
   await page.mouse.up();await page.waitForTimeout(250)
   assert(await metric.evaluate(el=>['none','matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(el).transform)),'metric rebounds')
   assert.equal(await page.evaluate(()=>window.routes.length),routeCount+1,'press retains one original navigation')
   assert.equal(await page.evaluate(()=>window.routes.at(-1)),'/pages/ledger/index')
   await page.evaluate(()=>window.scrollTo(0,0))
   const layout=await page.evaluate(()=>{
    const bounds=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom}}
    return {panel:bounds('.financial-panel'),summary:bounds('.freedom-summary'),metrics:bounds('.home-metrics'),wish:bounds('.wishlist-home-card'),tasks:bounds('.tasks-card')}
   })
   assert(layout.panel.top<=layout.summary.top&&layout.summary.bottom<=layout.metrics.top&&layout.metrics.bottom<=layout.panel.bottom,'summary and unboxed metrics share one panel')
   assert(layout.panel.bottom<=layout.wish.top&&layout.wish.bottom<=layout.tasks.top,'financial first reading order')
   assert.equal(await page.locator('.wishlist-home-card').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px')
   if(width===390){assert(layout.tasks.bottom<=844-76,'three actions fit above bottom navigation');await page.screenshot({path:'/tmp/fire-home-compact-390.png',fullPage:true})}
   await page.locator('.countdown-switch-option').nth(1).click()
   assert.equal(await page.evaluate(()=>window.state.homeCountdown),'goal')
   assert.match(await page.locator('.freedom-label').innerText(),/车子/)
   assert.match(await page.locator('.summary-stat-label').last().innerText(),/目标金额/)
   await page.evaluate(()=>window.state.goalPlan.assets=1234)
   assert.match(await page.locator('.summary-stat-value').first().innerText(),/1,234/)
   await page.locator('.countdown-switch-option').first().click()
   assert.equal(await page.evaluate(()=>window.state.finance.assets),80000,'mode switch preserves actual assets')
   await page.evaluate(()=>{window.state.finance.assets=1234567890;window.state.goalPlan.name='这是一个比较长的购车储蓄目标名称';window.state.ledger[0].cents=98765432109;window.state.ledger[1].cents=123456789012})
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'large money does not overflow '+width)
   await page.locator('.message-entry').click();await page.locator('.messages-page').waitFor()
   await page.locator('.messages-head .back').click();await page.locator('.home-view').waitFor()
   await page.evaluate(()=>{window.state.goalPlan=null;window.state.financeEntered=false;window.state.cloudSync.status='error'})
   await page.locator('.account-sync-banner').waitFor()
   assert.equal(errors.length,0,errors.join('\n'))
   await page.close()
  }
  console.log('COMPACT_HOME_VERIFIED: 320/390/430px, financial-first layout, real amounts, over-budget badge, three actions, mode integrity, large values and message navigation')
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exit(1)})
