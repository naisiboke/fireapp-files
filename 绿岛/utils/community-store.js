import { reactive } from 'vue'
import { fetchUserCollection, saveUserCollection, submitCommunityPost, deleteCommunityPost, fetchCommunityPosts } from './api-service.js'
import { accountId, readAccountCache, writeAccountCache } from './account-cache.js'

const keys={favorites:'firelife_favorites_v1',ugc:'firelife_ugc_v1','net-worth':'firelife_assets_v1','applied-models':'firelife_applied_models_v1','post-draft':'firelife_post_draft_v1'}
const read=(name,fallback)=>{const value=readAccountCache(keys[name],fallback);return value===null||value===undefined?fallback:value}
const idOf=item=>String(item && (item.id||item.postId)||'')
const queues=new Map()
const syncState=reactive({message:''})
function mergedRecords(remote,local){
 const records=new Map()
 for(const item of [...(Array.isArray(remote)?remote:[]),...(Array.isArray(local)?local:[])]){
  const id=idOf(item);if(!id)continue
  const previous=records.get(id)
  if(!previous||Number(item.updatedAt||item.reviewedAt||item.snapshotAt||item.createdAt||0)>=Number(previous.updatedAt||previous.reviewedAt||previous.snapshotAt||previous.createdAt||0))records.set(id,item)
 }
 return [...records.values()]
}
function write(name,value){
 const uid=accountId()
 if(!uid)return false
 const old=read(name,[])
 let next=value
 if(['favorites','applied-models'].includes(name)){
  const items=(Array.isArray(value)?value:[]).map(item=>({...item,updatedAt:Date.now()}))
  const ids=new Set(items.map(idOf))
  for(const item of Array.isArray(old)?old:[])if(!ids.has(idOf(item)))items.push({...item,deleted:true,updatedAt:Date.now()})
  next=items
 }
 if(!writeAccountCache(keys[name],next,uid))return false
 writeAccountCache(keys[name]+':pending',{version:Date.now()+'-'+Math.random().toString(36).slice(2),dirty:true},uid)
 syncState.message='本机修改已保留，等待云端同步'
 flush(name).catch(error=>{if(accountId()===uid)syncState.message='部分修改尚未同步，本机内容已保留，请联网后重试';console.warn('[community-sync]',name,error.code||error.message)})
 return true
}
async function flush(name){
 const uid=accountId(),key=uid+':'+name
 const task=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(async()=>{
  if(accountId()!==uid)return
  const pending=readAccountCache(keys[name]+':pending',null,uid)
  if(!pending?.dirty)return
  const remote=await fetchUserCollection(name)
  if(accountId()!==uid)return
  const version=readAccountCache(keys[name]+':pending',null,uid)?.version
  const local=read(name,null)
  const value=Array.isArray(local)?mergedRecords(remote,local):local
  await saveUserCollection(name,value)
  if(accountId()!==uid)return
  if(readAccountCache(keys[name]+':pending',null,uid)?.version===version){
   writeAccountCache(keys[name],value,uid)
   writeAccountCache(keys[name]+':pending',{dirty:false},uid)
   if(!Object.keys(keys).some(key=>readAccountCache(keys[key]+':pending',null,uid)?.dirty))syncState.message=''
  }
 })
 queues.set(key,task);return task
}
function cachePost(post,previousId){
 const list=read('ugc',[]).filter(item=>item.id!==previousId&&item.id!==post.id&&item.id!==post.legacyId&&item.legacyId!==post.id)
 list.unshift(post)
 writeAccountCache(keys.ugc,list)
 return post
}
export const CS={
 syncState,
 favorites:()=>read('favorites',[]).filter(item=>!item.deleted),
 saveFavorites:value=>write('favorites',value),
 ugc:()=>{const value=read('ugc',[]);return (Array.isArray(value)?value:[]).map(item=>item.reviewAttempt||item.localOnly||item.status==='review_failed'?item:{...item,status:'review_failed',reviewStatus:'review_failed',reviewReason:'旧版本机内容已保留，请重试云端审核后发布'})},
 saveUGC:value=>writeAccountCache(keys.ugc,value),
 netWorth:()=>{const value=read('net-worth',null);return typeof value==='number'&&value>0?value:null},
 setNetWorth:value=>write('net-worth',value),
 applied:()=>read('applied-models',[]).filter(item=>!item.deleted),
 saveApplied:value=>write('applied-models',value),
 draft:()=>read('post-draft',null),
 saveDraft:value=>write('post-draft',value),
 clearDraft:()=>write('post-draft',null),
 async submitPost(post){
  const uid=accountId()
  if(!uid)throw new Error('请先登录')
  const local={...post,localOnly:true,ownerId:uid,updatedAt:Date.now(),status:'pending',reviewStatus:'pending',reviewReason:'本机已保存，等待云端确认'}
  cachePost(local,post.id)
  try{
   const saved=await submitCommunityPost(local)
   if(accountId()!==uid)throw new Error('账号已切换，已取消旧账号的界面更新')
   if(!saved||saved.ownerId!==uid||!saved.id)throw new Error('未确认云端保存，本机内容已保留')
   return cachePost(saved,post.id)
  }catch(error){
   if(accountId()===uid)cachePost({...local,status:'review_failed',reviewStatus:'review_failed',reviewReason:error.message||'尚未确认云端保存，请联网后重试'},post.id)
   throw error
  }
 },
 async deletePost(post){
  await deleteCommunityPost(post.id)
  CS.saveUGC(CS.ugc().filter(item=>item.id!==post.id))
 },
 async publicPage(journey,cursor=0){return fetchCommunityPosts(journey,cursor)},
 hydrate:async()=>{
  const uid=accountId()
  if(!uid)return {ok:false,errors:['请先登录后恢复数据']}
  const jobs=Object.keys(keys).map(async name=>{
   const remote=await fetchUserCollection(name)
   if(accountId()!==uid)return
   if(name==='ugc'){
    const local=CS.ugc()
    const remoteIds=new Set((remote||[]).flatMap(item=>[item.id,item.legacyId]).filter(Boolean))
    // Keep only unconfirmed local drafts beside authoritative server posts.
    const unsent=local.filter(item=>!remoteIds.has(item.id)&&(!item.ownerId||item.ownerId===uid)&&!item.reviewedAt)
    writeAccountCache(keys.ugc,[...(remote||[]),...unsent],uid)
   }else{
    const pending=readAccountCache(keys[name]+':pending',null,uid)
    if(pending?.dirty)await flush(name)
    else writeAccountCache(keys[name],remote,uid)
   }
  })
  const results=await Promise.allSettled(jobs)
  if(accountId()!==uid)return {ok:false,cancelled:true,errors:[]}
  const errors=results.filter(item=>item.status==='rejected').map(item=>item.reason.message||'部分数据恢复失败')
  syncState.message=errors.length?'部分修改尚未同步，本机内容已保留，请联网后重试':''
  return {ok:errors.length===0,errors}
 },
}
