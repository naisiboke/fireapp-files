// Run in 绿岛: node scripts/check-website-update.mjs
// Execute the real update module and website script with isolated browser/native APIs.
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const websiteSource=readFileSync(new URL('../../download.html',import.meta.url),'utf8')
const releaseSource=readFileSync(new URL('../../app-update.json',import.meta.url),'utf8')
const legacyModuleSource=readFileSync(new URL('./fixtures/app-update-legacy.txt',import.meta.url),'utf8')
const checks=[]
function check(name,value){assert.ok(value,name);checks.push(name)}
const clean=code=>code.replace(/^import .*$/gm,'').replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let))/g,'')
function moduleWith(deps={}){
 return new Function(...Object.keys(deps),clean(source('utils/app-update.js'))+'\nreturn {validateUpdate,createUpdateChecker,OFFICIAL_DOWNLOAD_URL,checkAppUpdate};')(...Object.values(deps))
}
const moduleDeps={feedbackState:{owner:1},showDialog:async()=>({confirm:true}),showNotice(){},currentPageRoute:()=>'/pages/index/index'}
const {validateUpdate,createUpdateChecker,OFFICIAL_DOWNLOAD_URL}=moduleWith(moduleDeps)
const meta={appId:'__UNI__6A9B0BE',android:{published:true,versionCode:103,versionName:'1.0.3',downloadUrl:'https://fireday.cn/fireday-1.0.3.apk',websiteUrl:OFFICIAL_DOWNLOAD_URL,notes:['前往官网下载最新版']}}
check('manifest contains the new installable release number',source('manifest.json').includes('"versionName" : "1.0.5"')&&source('manifest.json').includes('"versionCode" : "105"'))
check('release metadata matches the new version code',JSON.parse(releaseSource).android.versionCode===105)
check('new release stays unpublished until its APK is uploaded',JSON.parse(releaseSource).android.published===false)
check('update destination is the official download section',OFFICIAL_DOWNLOAD_URL==='https://fireday.cn/#download')
check('release metadata advertises the website destination',JSON.parse(releaseSource).android.websiteUrl===OFFICIAL_DOWNLOAD_URL)
check('legacy APK metadata still directs new clients to the website',validateUpdate({...meta,android:{...meta.android,websiteUrl:undefined}},102,'android').websiteUrl===OFFICIAL_DOWNLOAD_URL)
check('APK URL stays available for older released clients',validateUpdate(meta,102,'android').downloadUrl.endsWith('fireday-1.0.3.apk'))
for(const websiteUrl of ['http://fireday.cn/','https://fireday.cn.evil.example/','https://evil.example/','javascript:alert(1)','https://fireday.cn/file.apk']){
 let rejected=false
 try{validateUpdate({...meta,android:{...meta.android,websiteUrl}},102,'android')}catch(error){rejected=true}
 check('untrusted website destination is rejected: '+websiteUrl,rejected)
}
for(const websiteUrl of ['https://fireday.cn','https://fireday.cn/',OFFICIAL_DOWNLOAD_URL]){
 check('official homepage normalizes to downloads: '+websiteUrl,validateUpdate({...meta,android:{...meta.android,websiteUrl}},102,'android').websiteUrl===OFFICIAL_DOWNLOAD_URL)
}
const oldValidate=new Function(...Object.keys(moduleDeps),clean(legacyModuleSource)+'\nreturn validateUpdate;')(...Object.values(moduleDeps))
check('already released clients still recognize the new metadata',oldValidate({...JSON.parse(releaseSource),android:{...JSON.parse(releaseSource).android,published:true}},102,'android').versionCode===105)
function fixture(){
 const values={now:172800000,owner:1,eligible:true,confirm:true,native:true,metadata:meta,fetches:0,platform:'android'}
 const opened=[],dialogs=[],notices=[],cache=new Map()
 const env={now:()=>values.now,isNative:()=>values.native,eligible:()=>values.eligible,owner:()=>values.owner,
  installed:()=>({code:102,name:'1.0.2',platform:values.platform}),
  read:key=>cache.get(key),write:(key,value)=>cache.set(key,value),
  fetch:async()=>{values.fetches++;return values.metadata},
  dialog:async options=>{dialogs.push(options);return {confirm:values.confirm}},
  notice:message=>notices.push(message),open:url=>opened.push(url),
 }
 return {values,opened,dialogs,notices,env,check:createUpdateChecker(env)}
}
let f=fixture()
await f.check()
check('automatic update confirmation opens the official website',f.opened.length===1&&f.opened[0]===OFFICIAL_DOWNLOAD_URL)
check('automatic update never opens a raw APK',f.opened.every(url=>!url.endsWith('.apk')))
check('prompt has an immediate-update action and a later option',f.dialogs[0].confirmText==='立即更新'&&f.dialogs[0].cancelText==='稍后再说')
check('prompt explains the browser destination',f.dialogs[0].content.includes('fireday.cn')&&f.dialogs[0].content.includes('下载版本'))
await f.check()
check('repeated page shows do not repeatedly open the browser',f.values.fetches===1&&f.opened.length===1)
await f.check(true)
check('settings manual check opens the same website',f.opened.length===2&&f.opened[1]===OFFICIAL_DOWNLOAD_URL)
f=fixture();f.values.confirm=false
await f.check()
check('later leaves the user in the app',f.dialogs.length===1&&f.opened.length===0)
f.values.now+=7*3600000
await f.check()
check('a canceled version does not prompt again within one day',f.values.fetches===2&&f.dialogs.length===1)
f.values.now+=18*3600000
await f.check()
check('a canceled update may be offered on a later day',f.dialogs.length===2&&f.opened.length===0)
f=fixture()
f.values.metadata={...meta,android:{...meta.android,versionCode:102,versionName:'1.0.2'}}
await f.check(true)
check('current version gives manual feedback without browser launch',f.dialogs.length===0&&f.opened.length===0&&f.notices.length===1)
f=fixture();f.values.metadata={...meta,android:{...meta.android,published:false}}
await f.check()
check('an unpublished release never prompts or navigates',f.dialogs.length===0&&f.opened.length===0)
f=fixture();f.env.fetch=async()=>{throw Error('offline')};f.check=createUpdateChecker(f.env)
await f.check()
check('automatic network failure stays silent',f.notices.length===0&&f.opened.length===0)
await f.check(true)
check('manual network failure gives feedback',f.notices.length===1&&f.opened.length===0)
f=fixture();f.values.native=false
await f.check(true)
check('web runtime does not call native browser navigation',f.values.fetches===0&&f.opened.length===0)
f=fixture();f.env.fetch=async()=>{f.values.owner=2;return meta};f.check=createUpdateChecker(f.env)
await f.check()
check('a response for a departed page does not show or open an update',f.dialogs.length===0&&f.opened.length===0)
f=fixture();f.env.dialog=async options=>{f.dialogs.push(options);f.values.owner=2;return {confirm:true}};f.check=createUpdateChecker(f.env)
await f.check()
check('page changes while the prompt is open suppress browser navigation',f.opened.length===0)
f=fixture()
await Promise.all([f.check(),f.check(),f.check()])
check('simultaneous page checks have one request and one browser launch',f.values.fetches===1&&f.dialogs.length===1&&f.opened.length===1)
f=fixture();f.values.platform='ios';f.values.metadata={appId:meta.appId,ios:{...meta.android,downloadUrl:'https://apps.apple.com/cn/app/id123456789'}}
await f.check()
check('a published iOS release also follows the official website destination',f.opened[0]===OFFICIAL_DOWNLOAD_URL)

const nativeOpened=[]
const native=moduleWith({...moduleDeps,plus:{os:{name:'Android'},runtime:{versionCode:'102',openURL:url=>nativeOpened.push(url)}},
 uni:{getAppBaseInfo:()=>({appVersionCode:'102',appVersion:'1.0.2'}),getStorageSync:key=>key==='fire_login_status'?true:'',setStorageSync(){},
  request:options=>options.success({statusCode:200,data:meta})},
})
await native.checkAppUpdate()
check('actual native adapter uses the system browser for the official website',nativeOpened[0]===OFFICIAL_DOWNLOAD_URL)

const loggedOutOpened=[]
const loggedOut=moduleWith({...moduleDeps,plus:{os:{name:'Android'},runtime:{versionCode:'102',openURL:url=>loggedOutOpened.push(url)}},
 uni:{getAppBaseInfo:()=>({appVersionCode:'102',appVersion:'1.0.2'}),getStorageSync:()=>'',setStorageSync(){},
  request:options=>options.success({statusCode:200,data:meta})},
})
await loggedOut.checkAppUpdate()
check('a signed-out user can reach the website update too',loggedOutOpened[0]===OFFICIAL_DOWNLOAD_URL)
function runWebsite(fetchImpl){
 const cards={}
 for(const platform of ['android','ios']){
  const card={dataset:{platform}}
  function attach(link){link.replaceWith=next=>attach(next);card.current=link}
  attach({href:platform==='android'?'./fireday.apk':'',className:platform==='android'?'download-btn ready':'download-btn disabled'})
  card.querySelector=()=>card.current
  cards[platform]=card
 }
 const document={
  querySelectorAll:selector=>selector==='.download-card[data-platform]'?Object.values(cards):[],
  querySelector:selector=>cards[selector.includes('"android"')?'android':'ios'],
  createElement:()=>({setAttribute(name,value){this[name]=value}}),
 }
 const script=websiteSource.match(/<script>([\s\S]*?)<\/script>/)[1]
 const api=new Function('document','window','fetch',script+'\nreturn {configurePublishedDownloads};')(document,{},fetchImpl)
 return {cards,...api}
}
check('website keeps a real APK anchor without JavaScript',/href="\.\/fireday\.apk" download="fireday.apk"/.test(websiteSource))
let site=runWebsite(undefined)
check('without fetch support the Android fallback remains enabled',site.cards.android.current.href==='./fireday.apk'&&site.cards.android.current.className.includes('ready'))
site.configurePublishedDownloads(meta)
check('website uses the latest published versioned APK URL',site.cards.android.current.href===meta.android.downloadUrl)
check('website shows the current published version name',site.cards.android.current.textContent==='下载 Android v1.0.3')
check('unpublished iOS remains pending',site.cards.ios.current.className.includes('disabled'))
site=runWebsite(undefined);site.configurePublishedDownloads({...meta,android:{...meta.android,published:false}})
check('unpublished metadata does not remove the fallback button',site.cards.android.current.href==='./fireday.apk')
site=runWebsite(undefined);site.configurePublishedDownloads({...meta,appId:'another-app'})
check('another app cannot change the website download link',site.cards.android.current.href==='./fireday.apk')
for(const downloadUrl of ['https://evil.example/app.apk','http://fireday.cn/app.apk','https://fireday.cn.evil.example/app.apk','javascript:alert(1)']){
 site=runWebsite(undefined);site.configurePublishedDownloads({...meta,android:{...meta.android,downloadUrl}})
 check('website rejects an untrusted APK link: '+downloadUrl,site.cards.android.current.href==='./fireday.apk')
}
site=runWebsite(()=>Promise.reject(Error('offline')))
for(let i=0;i<10;i++)await Promise.resolve()
check('website metadata network failure never disables Android downloads',site.cards.android.current.href==='./fireday.apk'&&site.cards.android.current.className.includes('ready'))
site=runWebsite(()=>Promise.resolve({ok:false}))
for(let i=0;i<10;i++)await Promise.resolve()
check('website metadata 404 leaves the existing APK usable',site.cards.android.current.href==='./fireday.apk')
site=runWebsite(()=>Promise.resolve({ok:true,json:async()=>meta}))
for(let i=0;i<10;i++)await Promise.resolve()
check('real website fetch updates the download link to the newest release',site.cards.android.current.href===meta.android.downloadUrl)
site=runWebsite(()=>Promise.resolve({ok:true,json:async()=>{throw Error('bad json')}}))
for(let i=0;i<10;i++)await Promise.resolve()
check('malformed website metadata leaves the working download button in place',site.cards.android.current.href==='./fireday.apk')
console.log(checks.length+' website update checks passed')
