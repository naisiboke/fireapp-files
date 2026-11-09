import {accountId,readAccountCache,writeAccountCache} from './account-cache.js'
import {fetchCommunityPosts} from './api-service.js'
export function createFeedCache({owner,read,write,fetchPage,now=Date.now,ttl=60000}){
 const running=new Map(),epochs=new Map()
 const key=(uid,tab)=>uid+':'+tab
 const peek=tab=>{const uid=owner();return uid?read(tab,uid):null}
 async function get(tab,{force=false}={}){
  const uid=owner();if(!uid)throw Error('请先登录')
  const k=key(uid,tab),epoch=epochs.get(k)||0,old=read(tab,uid)
  if(!force&&old&&now()-old.at<ttl)return old
  if(running.has(k))return running.get(k)
  const promise=(async()=>{
   const page=await fetchPage(tab,0)
   if(owner()!==uid||(epochs.get(k)||0)!==epoch)return null
   const value={items:page.items||[],stats:page.stats||{doing:0,settled:0},nextCursor:page.nextCursor??null,at:now()}
   write(tab,value,uid);return value
  })()
  running.set(k,promise)
  try{return await promise}finally{if(running.get(k)===promise)running.delete(k)}
 }
 function invalidate(){const uid=owner();if(!uid)return;for(const tab of ['doing','settled']){
  const k=key(uid,tab);epochs.set(k,(epochs.get(k)||0)+1);running.delete(k)
  const old=read(tab,uid);if(old)write(tab,{...old,at:0},uid)
 }}
 function apply(post,deleted=false){
  const uid=owner();if(!uid)return;invalidate()
  for(const tab of ['doing','settled']){
   const old=read(tab,uid);if(!old)continue
   const ids=new Set([post.id,post.legacyId].filter(Boolean))
   const items=old.items.filter(x=>!ids.has(x.id)&&!ids.has(x.legacyId))
   if(!deleted&&!post.deleted&&post.status==='approved'&&(post.journey==='settled'?'settled':'doing')===tab)items.unshift(post)
   write(tab,{...old,items,at:0},uid)
  }
 }
 return {peek,get,invalidate,apply}
}
export const communityFeed=createFeedCache({
 owner:accountId,read:(tab,uid)=>readAccountCache('fire_public_feed_'+tab,null,uid),
 write:(tab,value,uid)=>writeAccountCache('fire_public_feed_'+tab,value,uid),fetchPage:fetchCommunityPosts,
})
