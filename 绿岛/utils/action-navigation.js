export const ACTION_TAB_ROUTES=new Set(['/pages/index/index','/pages/tools/index','/pages/community/index','/pages/profile/index'])
export function openActionRoute(url,api,onFailure){
 if(typeof url!=='string'||!url.startsWith('/pages/'))return false
 const method=ACTION_TAB_ROUTES.has(url.split('?')[0])?'switchTab':'navigateTo'
 api[method]({url:method==='switchTab'?url.split('?')[0]:url,fail:onFailure})
 return true
}
export function createDailyRefresh({refresh,day,now=Date.now,retryAfter=30000}){
 const done=new Map(),pending=new Map(),attempts=new Map()
 return function check(uid,at=now(),force=false){
  if(!uid)return Promise.resolve(null)
  const key=uid+':'+day(at)
  if(pending.has(key))return pending.get(key)
  if(!force&&(done.has(key)||(attempts.has(key)&&now()-attempts.get(key)<retryAfter)))return Promise.resolve(null)
  attempts.set(key,now())
  const task=Promise.resolve().then(()=>refresh()).then(value=>{if(value)done.set(key,true);return value})
  pending.set(key,task)
  return task.finally(()=>{if(pending.get(key)===task)pending.delete(key)})
 }
}
