import { isApiConfigured, fetchUserCollection, saveUserCollection } from './api-service.js'

const KEY='fire_ai_chats_v1'
function read(){try{const value=uni.getStorageSync(KEY);return Array.isArray(value)?value:[]}catch(e){return[]}}
function write(value){try{uni.setStorageSync(KEY,JSON.stringify(value));return true}catch(e){return false}}
function mergeChats(...sources){
 const map=new Map()
 sources.flat().filter(x=>x&&x.id).forEach(chat=>map.set(String(chat.id),chat))
 return Array.from(map.values()).sort((a,b)=>Number(b.updatedAt||0)-Number(a.updatedAt||0)).slice(0,50)
}
export async function loadAIChats(fallback=[]){
 const local=mergeChats(Array.isArray(fallback)?fallback:[],read())
 if(!isApiConfigured()){write(local);return local}
 try{
  const remote=await fetchUserCollection('ai-chats')
  const merged=mergeChats(Array.isArray(remote)?remote:[],local)
  write(merged)
  try{await saveUserCollection('ai-chats',merged)}catch(error){console.warn('[ai-chat-cloud-merge]',error)}
  return merged
 }catch(error){
  console.warn('[ai-chat-cloud-load]',error)
  write(local)
  return local
 }
}
export async function saveAIChats(chats){
 const value=mergeChats(Array.isArray(chats)?chats:[])
 write(value)
 if(isApiConfigured()){
  try{await saveUserCollection('ai-chats',value)}catch(error){console.warn('[ai-chat-cloud-save]',error)}
 }
 return value
}
