const assert=require('node:assert/strict')
const {chromium}=require('playwright')
const http=require('node:http'),fs=require('node:fs'),path=require('node:path')
;(async()=>{
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');const p=path.join(process.cwd(),decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname))
 if(!p.startsWith(process.cwd())){res.writeHead(403).end();return}
 fs.readFile(p,(err,body)=>{if(err){res.writeHead(404).end();return}const type=p.endsWith('.html')?'text/html; charset=utf-8':p.endsWith('.png')?'image/png':p.endsWith('.json')?'application/json':'text/plain';res.writeHead(200,{'Content-Type':type});res.end(body)})
}).listen(0,'127.0.0.1')
await new Promise(r=>server.once('listening',r))
const base='http://127.0.0.1:'+server.address().port
const browser=await chromium.launch({headless:true})
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(base)
  await page.locator('.nav-links .about-link').click()
  await page.locator('#about').waitFor({state:'visible'})
  assert.equal(await page.locator('#main').isVisible(),false)
  assert.match(await page.locator('#about').innerText(),/版本与反馈/)
  assert.equal(await page.locator('#about a[href="./privacy.html"]').count(),1)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'About must not overflow viewport')
  await page.screenshot({path:'/tmp/fire-about-'+width+'.png',fullPage:true})
  await page.locator('[data-about-back]').click()
  await page.locator('#main').waitFor({state:'visible'})
  assert.equal(await page.locator('#about').isVisible(),false)
  await page.goto(base+'/#about')
  await page.locator('#about').waitFor({state:'visible'})
  await page.locator('#about a[href="#download"]').click()
  await page.locator('#download').waitFor({state:'visible'})
  assert.equal(errors.length,0,errors.join('\n'))
  await page.close()
 }
 // File:// use: the About route must work without an HTTP server.
 const local=await browser.newPage({viewport:{width:390,height:844}})
 await local.goto('file://'+path.join(process.cwd(),'index.html')+'#about')
 assert(await local.locator('#about').isVisible())
 await local.close()
 console.log('About browser verification passed: 390px, 1280px, direct hash, return, download, local HTML')
}finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exit(1)})
