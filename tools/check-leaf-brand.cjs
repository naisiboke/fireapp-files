const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict')
const {chromium}=require('playwright'),{PNG}=require('pngjs')
const png=fs.readFileSync('assets/fireday-leaf.png'),app=fs.readFileSync('绿岛/static/fireday-leaf.png')
assert(png.equals(app),'website and App use the same generated mark')
const image=PNG.sync.read(png)
for(const[x,y]of[[0,0],[image.width-1,0],[0,image.height-1],[image.width-1,image.height-1]])assert.equal(image.data[(y*image.width+x)*4+3],0,'transparent corners')
let visible=0,black=0
for(let i=0;i<image.data.length;i+=4){if(image.data[i+3]>200){visible++;if(image.data[i]<20&&image.data[i+1]<20&&image.data[i+2]<20)black++}}
assert(visible>image.width*image.height*.2&&black<visible*.001,'leaf without black background')
const html=fs.readFileSync('index.html','utf8')
assert.equal(html,fs.readFileSync('download.html','utf8'))
assert(!html.includes('src="./assets/fireday-leaf.png"'),'standalone HTML no longer depends on missing asset directory')
const dist='绿岛/dist/build/h5'
assert(fs.existsSync(dist+'/index.html'),'compiled H5 output exists')
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname)
 if(name==='/assets/fireday-leaf.png'){res.writeHead(404).end();return}
 let p=name==='/'?'index.html':name.slice(1)
 if(name.startsWith('/app/'))p=path.join(dist,name.slice(5)||'index.html')
 else if(!fs.existsSync(p))p=path.join(dist,name.slice(1))
 if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.writeHead(404).end();return}
 const type=p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':p.endsWith('.svg')?'image/svg+xml':'application/octet-stream'
 res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(p))
})
;(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 const browser=await chromium.launch({headless:true}),origin='http://127.0.0.1:'+server.address().port
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:844}})
   for(const target of [origin+'/',origin+'/download.html','file://'+path.join(process.cwd(),'index.html')]){
    await page.goto(target)
    assert.equal(await page.locator('.brand-logo').count(),2)
    assert(await page.locator('#brand-leaf image').evaluate(el=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth>0);img.onerror=()=>resolve(false);img.src=el.getAttribute('href')})),'inline leaf decodes without asset requests')
    for(const selector of ['.site-header .brand-mark','.footer .brand-mark']){
     assert(await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.boxShadow==='none'&&parseFloat(s.borderWidth)===0}))
    }
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
   }
   if(width===390){
    await page.goto(origin);await page.waitForTimeout(700)
    console.log('SITE_LEAF_PREVIEW_BASE64='+(await page.screenshot({type:'jpeg',quality:82})).toString('base64'))
   }
   await page.close()
  }
  const page=await browser.newPage({viewport:{width:390,height:844}})
  await page.goto(origin+'/app/index.html#/pages/login/login')
  await page.locator('.login-brand-logo').waitFor({timeout:30000})
  await page.waitForFunction(()=>{const el=document.querySelector('.login-brand-logo'),img=el&&el.querySelector('img');return img&&img.complete&&img.naturalWidth>0})
  assert(!await page.locator('.login-shell .avatar').count(),'old island circle removed')
  assert(await page.locator('.login-brand-logo').evaluate(el=>{const s=getComputedStyle(el);return parseFloat(s.borderWidth)===0&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.borderRadius==='0px'}))
  assert.equal(await page.locator('.consent-check').getAttribute('aria-checked'),'false')
  assert(await page.locator('.login-button').isVisible())
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  console.log('LOGIN_LEAF_PREVIEW_BASE64='+(await page.screenshot({type:'jpeg',quality:82})).toString('base64'))
  await page.close()
  console.log('LEAF_BRAND_VERIFIED: alpha, same mark, standalone HTML, missing-assets simulation, local file, 390/1280px, compiled login and unchecked consent')
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);server.close();process.exit(1)})
