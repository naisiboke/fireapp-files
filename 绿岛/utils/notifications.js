import {reactive} from 'vue'
import {accountId,readAccountCache,writeAccountCache} from './account-cache.js'
import {wishlistDue,coolingEnd} from './wishlist.js'
export const notificationState=reactive({revision:0})
const KEY='fire_notifications_v1'
export function notificationCandidates({items=[],posts=[],rewards=null,release=null,installed=0}={},at=Date.now()){
 const list=[]
 for(const item of items)if(item.id&&wishlistDue(item,at))list.push({id:'wishlist:'+item.id+':'+coolingEnd(item),kind:'wishlist',title:'冷静期已到',body:'「'+String(item.name||'消费计划').slice(0,80)+'」等待你确认是否购买',at:Math.min(at,coolingEnd(item)),route:'/pages/wishlist/index'})
 for(const post of posts)if(!post.localOnly&&post.id&&post.reviewedAt&&['approved','rejected','review_failed'].includes(post.status))list.push({id:'review:'+post.id+':'+post.reviewedAt+':'+post.status,kind:'review',title:post.status==='approved'?'社区经历审核通过':post.status==='rejected'?'社区经历需要修改':'社区审核暂未完成',body:String(post.title||'我的经历').slice(0,80),at:post.reviewedAt,route:'/pages/community/manage'})
 for(const e of rewards?.events||[])if(e.id&&Number(e.xp)>0)list.push({id:'reward:'+e.id,kind:'reward',title:'经验已到账',body:({ledger:'记账',assets:'资产记录',goal:'储蓄目标',favorite:'社区收藏',publish:'社区发帖',edit:'社区更新'}[e.kind]||'行动')+' +'+e.xp+' EXP',at:e.at,route:'/pages/index/index'})
 if(release?.published===true&&release.versionCode>installed)list.push({id:'update:'+release.versionCode,kind:'update',title:'发现新版本 '+release.versionName,body:'前往官网下载最新版 Fire生活',at,route:'/pages/settings/index'})
 return list.filter(x=>Number.isFinite(x.at)&&x.at>0)
}
export function mergeNotifications(saved,candidates,at=Date.now()){
 const rows=new Map((saved||[]).map(x=>[x.id,x]))
 for(const value of candidates)if(!rows.has(value.id))rows.set(value.id,{...value,read:false,receivedAt:at})
 return [...rows.values()].sort((a,b)=>b.at-a.at).slice(0,500)
}
export function inbox(uid=accountId()){
 void notificationState.revision
 if(!uid||uid!==accountId())return []
 const rows=readAccountCache(KEY,[],uid)
 return Array.isArray(rows)?rows:[]
}
export function collectNotifications(source,uid=accountId(),at=Date.now()){
 if(!uid||uid!==accountId())return []
 const old=inbox(uid),next=mergeNotifications(old,notificationCandidates(source,at),at)
 if(JSON.stringify(old)!==JSON.stringify(next)&&writeAccountCache(KEY,next,uid))notificationState.revision++
 return inbox(uid)
}
export function readNotifications(ids,uid=accountId()){
 if(!uid||uid!==accountId())return false
 const set=ids?new Set(ids):null
 const next=inbox(uid).map(x=>!set||set.has(x.id)?{...x,read:true}:x)
 if(!writeAccountCache(KEY,next,uid))return false
 notificationState.revision++;return true
}
