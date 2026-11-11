const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.FIREDAY_PLAYWRIGHT_PATH||'playwright');
const {PNG}=require(process.env.FIREDAY_PNGJS_PATH||'pngjs');
const logo=fs.readFileSync('assets/fireday-leaf.png'),png=PNG.sync.read(logo),previews=[];
let checks=0;const check=(ok,label)=>{assert.ok(ok,label);checks++};
const pixel=(x,y)=>[...png.data.subarray((png.width*y+x)*4,(png.width*y+x)*4+4)];
for(const [x,y]of [[0,0],[png.width-1,0],[0,png.height-1],[png.width-1,png.height-1]])check(pixel(x,y)[3]===0,'logo corners fully transparent');
let transparent=0,opaqueBlack=0,visible=0;
for(let i=0;i<png.data.length;i+=4){
 const [r,g,b,a]=png.data.subarray(i,i+4);
 if(a===0)transparent++;if(a>200)visible++;
 if(a>200&&r<25&&g<25&&b<25)opaqueBlack++;
}
console.log('LOGO_ALPHA',JSON.stringify({width:png.width,height:png.height,transparent,visible,opaqueBlack}));
check(transparent>png.width*png.height*.20,'PNG has transparent background');
check(visible>png.width*png.height*.20,'leaf retained');
check(opaqueBlack<Math.max(10,visible*.0001),'no opaque black backdrop or central black slit');
check(fs.readFileSync('index.html','utf8')===fs.readFileSync('download.html','utf8'),'both HTML deployment entrypoints agree');
const routes={'/':'index.html','/index.html':'index.html','/download.html':'download.html','/privacy.html':'privacy.html','/assets/fireday-leaf.png':'assets/fireday-leaf.png'};
const server=http.createServer((req,res)=>{
 const pathname=req.url.split('?')[0];
 if(pathname==='/app-update.json'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({android:{published:false}}))}
 if(pathname==='/favicon.ico'){res.writeHead(204);return res.end()}
 const file=routes[pathname];if(!file){res.writeHead(404);return res.end('Not found')}
 res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'text/html; charset=utf-8');res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),errors=[];
 try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:360,height:640}]){
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin,{waitUntil:'networkidle'});
   await page.locator('.site-header .brand-logo').evaluate(el=>el instanceof HTMLImageElement?el.decode():Promise.resolve());
   check(await page.locator('.site-header .brand-logo').count()===1,'one header logo');
   check(await page.locator('.footer .brand-logo').count()===1,'one footer logo');
   for(const selector of ['.site-header .brand-mark','.footer .brand-mark']){
    check(await page.locator(selector).evaluate(el=>{const style=getComputedStyle(el);return style.backgroundColor==='rgba(0, 0, 0, 0)'&&style.boxShadow==='none'&&parseFloat(style.borderWidth)===0}),'brand mark has no colored plate '+viewport.width);
   }
   check(await page.locator('.site-header .brand').textContent().then(t=>t.trim()==='Fire生活'),'leaf stays beside existing brand text');
   check(await page.locator('.site-header .brand-logo').evaluate(el=>{const r=el.getBoundingClientRect();return r.width<=36&&r.height<=36&&el.tagName.toLowerCase()==='svg'&&document.querySelector('#brand-leaf image')?.getAttribute('href')?.startsWith('data:image/png;base64,')}),'logo remains small header icon');
   await page.locator('.footer').scrollIntoViewIfNeeded();await page.waitForTimeout(180);
   check(await page.locator('.footer-bottom a').allTextContents().then(t=>t.join(',')==='了解应用,下载应用,隐私条款'),'footer has requested three links');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no mobile horizontal overflow');
   if(viewport.width===390)previews.push(['LEAF_FOOTER',await page.locator('.footer').screenshot({type:'jpeg',quality:83})]);
   await page.locator('.footer-bottom a', {hasText:'隐私条款'}).click();
   await page.waitForURL('**/privacy.html');
   check(await page.locator('h1').textContent()==='隐私条款','privacy link opens real independent page');
   check(await page.locator('main section').count()>=14,'privacy document includes actual sections');
   check(await page.locator('body').textContent().then(t=>t.includes('500')&&t.includes('微信')),'privacy covers current AI behavior and contact channel');
   check(await page.locator('.legal-brand img').evaluate(el=>el.complete&&el.naturalWidth>0),'privacy page shares transparent logo');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'privacy fits mobile viewport');
   if(viewport.width===390)previews.push(['WEBSITE_PRIVACY',await page.screenshot({type:'jpeg',quality:78})]);
   await page.locator('.legal-back').click();await page.waitForURL('**/index.html');
   check(await page.locator('.site-header .brand-logo').count()===1,'privacy return goes back to website');
   if(viewport.width===390){await page.waitForTimeout(500);previews.push(['LEAF_HEADER',await page.screenshot({type:'jpeg',quality:82})]);}
   await page.close();
  }
  const noJS=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});
  await noJS.goto(origin+'/privacy.html');
  check(await noJS.locator('h1').textContent()==='隐私条款','privacy readable without JavaScript');
  await noJS.close();
  check(errors.length===0,errors.join('\n'));
  console.log('Transparent leaf brand and privacy navigation: '+checks+' checks passed');
 }finally{
  for(const[name,bytes]of previews){console.log(name+'_PREVIEW_BEGIN');const value=bytes.toString('base64');for(let i=0;i<value.length;i+=1000)console.log(value.slice(i,i+1000));console.log(name+'_PREVIEW_END');}
  console.log('Browser errors:',JSON.stringify(errors));await browser.close();server.close();
 }
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
