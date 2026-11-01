import { fetchUserCollection, saveUserCollection } from './api-service.js'
import { accountId, readAccountCache, writeAccountCache } from './account-cache.js'
import { state } from '../store/index.js'
const KEY='fire_ai_chats_v1'
function mergeChats(...sources){
 const map=new Map()
 for(const chat of sources.flat().filter(item=>item&&item.id)){
  const old=map.get(String(chat.id))
  if(!old||Number(chat.updatedAt||0)>=Number(old.updatedAt||0))map.set(String(chat.id),chat)
 }
 return [...map.values()].sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0))
}
export async function loadAIChats(fallback=[]){
 const uid=accountId(),local=mergeChats(fallback,readAccountCache(KEY,[])||[])
 try{
  const remote=await fetchUserCollection('ai-chats')
  if(accountId()!==uid)return []
  const merged=mergeChats(remote||[],local)
  writeAccountCache(KEY,merged,uid)
  return merged
 }catch(error){return accountId()===uid?local:[]}
}
export async function saveAIChats(chats){
 const uid=accountId(),value=mergeChats(chats||[])
 writeAccountCache(KEY,value,uid)
 try{
  const remote=await fetchUserCollection('ai-chats')
  if(accountId()!==uid)return []
  const merged=mergeChats(remote||[],value)
  await saveUserCollection('ai-chats',merged)
  writeAccountCache(KEY,merged,uid)
  return merged
 }catch(error){
  if(accountId()===uid)state.cloudSync={status:'error',message:'聊天已保留在本机，尚未同步，请联网后重试'}
  return accountId()===uid?value:[]
 }
}
