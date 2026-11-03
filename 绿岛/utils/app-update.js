import { feedbackState, showDialog, showNotice } from './feedback.js'
import { currentPageRoute } from './session-drafts.js'

export const OFFICIAL_DOWNLOAD_URL='https://fireday.cn/#download'
export const UPDATE_URL='https://fireday.cn/app-update.json'
export const BUILD_VERSION='1.0.3'
export const BUILD_CODE=103
const APP_ID='__UNI__6A9B0BE'
const DAY=86400000
export function validateUpdate(document,installed,platform) {
  const item=document?.[platform]
  if(document?.appId!==APP_ID || !item || item.published!==true)return null
  if(!Number.isSafeInteger(installed)||installed<=0 || !Number.isSafeInteger(item.versionCode)||item.versionCode<=installed)return null
  if(typeof item.versionName!=='string'||!/^\d+\.\d+\.\d+(?:[.-][a-zA-Z0-9]+)?$/.test(item.versionName))throw new Error('更新版本信息无效')
  const url=String(item.downloadUrl||'')
  const valid=platform==='android' ? /^https:\/\/fireday\.cn\/(?:downloads\/)?[a-zA-Z0-9._-]+\.apk$/.test(url) :
    /^https:\/\/apps\.apple\.com\/[a-zA-Z0-9/_.?=&%-]+$/.test(url)
  if(!valid)throw new Error('更新下载地址无效')
  const website=String(item.websiteUrl||OFFICIAL_DOWNLOAD_URL)
  if(!['https://fireday.cn','https://fireday.cn/',OFFICIAL_DOWNLOAD_URL].includes(website))throw new Error('更新官网地址无效')
  const notes=Array.isArray(item.notes)?item.notes.filter(note=>typeof note==='string').slice(0,5).map(note=>note.slice(0,100)):[]
  return {...item,downloadUrl:url,websiteUrl:OFFICIAL_DOWNLOAD_URL,notes}
}
export function createUpdateChecker(env) {
  let running=false,lastAttempt=-Infinity
  return async function check(manual=false) {
    if(!env.isNative()){if(manual)env.notice('请在安装的 App 中检查更新');return {status:'unsupported'}}
    if(running || (!manual && (!env.eligible() || env.now()-lastAttempt<6*60*60*1000)))return {status:'skipped'}
    running=true;lastAttempt=env.now()
    const owner=env.owner()
    try {
      const installed=env.installed()
      if(!Number.isSafeInteger(installed.code)||installed.code<=0)throw new Error('暂时无法读取安装版本，请稍后重试')
      const document=await env.fetch()
      const item=validateUpdate(document,installed.code,installed.platform)
      if(!env.eligible()||env.owner()!==owner)return {status:'skipped'}
      if(!item){if(manual)env.notice('当前版本 '+installed.name+'，暂无已发布更新');return {status:'current'}}
      const key='fire_update_prompt_'+installed.platform+'_'+item.versionCode
      if(!manual&&env.now()-Number(env.read(key)||0)<DAY)return {status:'skipped'}
      env.write(key,env.now())
      const result=await env.dialog({title:'发现新版本 '+item.versionName,content:(item.notes.join('\n')||'体验最新的 Fire生活。')+'\n\n'+'点击“立即更新”将打开官网 fireday.cn，请在“下载版本”中获取最新版。'+(installed.platform==='android'?'覆盖安装可保留本机记录。':''),confirmText:'立即更新',cancelText:'稍后再说',showCancel:true})
      if(result.confirm&&env.eligible()&&env.owner()===owner)env.open(item.websiteUrl)
      return {status:result.confirm?'offered':'dismissed',versionCode:item.versionCode}
    } catch(error) {
      if(manual&&env.owner()===owner)env.notice(error.message||'暂时无法检查更新，请稍后重试')
      return {status:'error'}
    } finally {running=false}
  }
}
function nativeRuntime() {
  // #ifdef APP-PLUS
  return typeof plus!=='undefined' && !!plus.runtime
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
}
export function installedVersion() {
  let info={}
  try {info=typeof uni.getAppBaseInfo==='function'?uni.getAppBaseInfo():uni.getSystemInfoSync()}catch(ignore){}
  let nativeCode=0,platform=String(info.platform||'').toLowerCase()
  // #ifdef APP-PLUS
  if(typeof plus!=='undefined'){
    nativeCode=Number(plus.runtime?.versionCode)||0
    platform=String(plus.os?.name||platform).toLowerCase()
  }
  // #endif
  return {code:Number(info.appVersionCode)||nativeCode,name:String(info.appVersion||BUILD_VERSION),platform:platform==='android'?'android':'ios'}
}
const check=createUpdateChecker({
  isNative:nativeRuntime,now:()=>Date.now(),installed:installedVersion,
  eligible:()=>feedbackState.owner!==null&&!/^\/pages\/(guide|launch|onboarding|sync-conflict)\//.test(currentPageRoute()),
  owner:()=>feedbackState.owner,
  read:key=>uni.getStorageSync(key),write:(key,value)=>uni.setStorageSync(key,value),
  fetch:()=>new Promise((resolve,reject)=>uni.request({
    url:UPDATE_URL+'?t='+Date.now(),method:'GET',timeout:8000,dataType:'json',header:{Accept:'application/json'},
    success(response){if(response.statusCode!==200)return reject(new Error('暂时无法检查更新，请稍后重试'));let body=response.data;if(typeof body==='string'){try{body=JSON.parse(body)}catch(ignore){return reject(new Error('更新信息暂不可用'))}}resolve(body)},
    fail:()=>reject(new Error('网络连接失败，请稍后检查更新')),
  })),
  dialog:showDialog,notice:title=>showNotice({title,icon:'none'}),
  open:url=>{
    // #ifdef APP-PLUS
    plus.runtime.openURL(url,()=>showNotice({title:'未能打开官网，请使用浏览器访问 fireday.cn',icon:'none'}))
    // #endif
  },
})
export function checkAppUpdate() { return check(true) }
export function maybeCheckAppUpdate() { if(feedbackState.dialog)return;check(false) }
