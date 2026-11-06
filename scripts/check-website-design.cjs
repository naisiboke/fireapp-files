// Browser checks: npm install playwright; node scripts/check-website-design.cjs
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.FIREDAY_PLAYWRIGHT_PATH||'playwright');
const html=fs.readFileSync('index.html','utf8');
assert.equal(html,fs.readFileSync('download.html','utf8'),'both deploy entrypoints agree');
const pending={appId:'__UNI__6A9B0BE',android:{published:false,versionCode:105,versionName:'1.0.5',downloadUrl:'https://fireday.cn/fireday-1.0.5.apk'},ios:null};
const checks=[],errors=[];
function check(name,value){assert.ok(value,name);checks.push(name)}
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/app-update.json')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(pending))}
 if(req.url==='/fireday.apk'){res.setHeader('Content-Type','application/vnd.android.package-archive');res.setHeader('Content-Disposition','attachment; filename="fireday.apk"');return res.end('test download response')}
 if(req.url==='/favicon.ico'){res.writeHead(204);return res.end()}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true});
 async function revealAll(page){
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto'});
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<height;y+=480){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(90)}
  await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(1050)
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin,{waitUntil:'networkidle'});await page.waitForTimeout(1200);
 check('title and brand appear',await page.title()==='Fire生活 · 把生活，握在自己手里');
 check('only Android and iOS download choices',await page.locator('.download-card').count()===2);
 check('unpublished iOS stays disabled',await page.locator('[data-platform="ios"] [aria-disabled="true"]').count()===1);
 const download=page.waitForEvent('download');await page.locator('[data-platform="android"] a.download-btn').click();
 check('APK button initiates a download', (await download).suggestedFilename()==='fireday.apk');
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.locator('.nav-links a[href="#download"]').click();
 await page.waitForTimeout(1200);
 const target=await page.locator('#download').boundingBox(),header=await page.locator('.site-header').boundingBox();
 check('sticky header does not hide download heading',target.y>=header.height-1);
 for(const width of [1440,1280,1024,768,390,360]){
  await page.setViewportSize({width,height:900});await page.waitForTimeout(150);
  check('no horizontal overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  const h1=await page.locator('h1').boundingBox(),last=await page.locator('h1 span').last().boundingBox();
  check('headline stays within its column at '+width,last.x+last.width<=width+1&&h1.width>0);
 }
 const contrast=await page.evaluate(()=>{
  const rgb=s=>s.match(/\d+/g).slice(0,3).map(Number),lum=a=>a.map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
  const fg=lum(rgb(getComputedStyle(document.querySelector('.hero-description')).color)),bg=lum(rgb(getComputedStyle(document.body).backgroundColor));
  return(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)
 });
 check('muted text meets normal-text contrast',contrast>=4.5);
 const featureContrast=await page.evaluate(()=>{
  const rgb=s=>s.match(/\d+/g).slice(0,3).map(Number),lum=a=>a.map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
  const fg=lum(rgb(getComputedStyle(document.querySelector('.feature-copy')).color)),bg=lum(rgb(getComputedStyle(document.querySelector('.features-section')).backgroundColor));
  return(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)
 });
 check('feature descriptions meet normal-text contrast',featureContrast>=4.5);
 const published={appId:pending.appId,android:{published:true,versionCode:106,versionName:'1.0.6',downloadUrl:'https://fireday.cn/fireday-1.0.6.apk'},ios:{published:true,versionCode:106,versionName:'1.0.6',downloadUrl:'https://apps.apple.com/cn/app/id123456789'}};
 await page.route('**/app-update.json?*',route=>route.fulfill({json:published}));
 await page.reload({waitUntil:'networkidle'});
 check('published release updates the hero APK link',await page.locator('[data-android-download]').getAttribute('href')===published.android.downloadUrl);
 check('published release updates the Android card',await page.locator('[data-platform="android"] a').getAttribute('href')===published.android.downloadUrl);
 check('published iOS uses the App Store',await page.locator('[data-platform="ios"] a').getAttribute('href')===published.ios.downloadUrl);
 check('published iOS status is consistent',await page.locator('[data-platform-status="ios"]').textContent()==='iOS 已开放下载');
 await page.unroute('**/app-update.json?*');
 await page.route('**/app-update.json?*',route=>route.fulfill({json:{...published,android:{...published.android,downloadUrl:'https://evil.example/app.apk'}}}));
 await page.reload({waitUntil:'networkidle'});
 check('untrusted metadata cannot replace APK links',await page.locator('[data-android-download]').getAttribute('href')==='./fireday.apk');
 await page.unroute('**/app-update.json?*');
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),plain=await nojs.newPage();
 await plain.goto(origin);await plain.waitForTimeout(1200);
 check('no-JS fallback remains a real APK link',await plain.locator('[data-platform="android"] a').getAttribute('href')==='./fireday.apk');
 check('features are visible without JS',await plain.locator('.feature').first().evaluate(el=>getComputedStyle(el).opacity)==='1');
 await nojs.close();
 const reduced=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}}),quiet=await reduced.newPage();
 await quiet.goto(origin,{waitUntil:'networkidle'});
 check('reduced motion disables hero animation',await quiet.locator('.hero-copy').evaluate(el=>getComputedStyle(el).animationName)==='none');
 check('reduced motion keeps sections visible',await quiet.locator('.feature').first().evaluate(el=>getComputedStyle(el).opacity)==='1');
 await reduced.close();
 await page.setViewportSize({width:1440,height:1000});await page.reload({waitUntil:'networkidle'});await revealAll(page);
 fs.mkdirSync('/tmp/fireday-web-preview',{recursive:true});
 const desktop=await page.screenshot({fullPage:true,type:'jpeg',quality:77,path:'/tmp/fireday-web-preview/desktop.jpg'});
 await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});await revealAll(page);
 const mobile=await page.screenshot({fullPage:true,type:'jpeg',quality:77,path:'/tmp/fireday-web-preview/mobile.jpg'});
 check('no browser runtime errors',errors.length===0);
 console.log('WEBSITE_CHECKS='+JSON.stringify({passed:checks.length,textContrast:Number(contrast.toFixed(2)),errors}));
 for(const [key,bytes]of [['DESKTOP',desktop],['MOBILE',mobile]]){
  console.log(key+'_PREVIEW_BEGIN');const b64=bytes.toString('base64');for(let i=0;i<b64.length;i+=1000)console.log(b64.slice(i,i+1000));console.log(key+'_PREVIEW_END');
 }
 await browser.close();await new Promise(resolve=>server.close(resolve));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
