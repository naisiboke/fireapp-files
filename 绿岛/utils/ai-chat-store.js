import { isApiConfigured, fetchUserCollection, saveUserCollection } from './api-service.js'
const KEY='fire_ai_chats_v1'
function read(){try{const value=uni.getStorageSync(KEY);return Array.isArray(value)?value:[]}catch(e){return[]}}
function write(value){try{uni.setStorageSync(KEY,JSON.stringify(value));return true}catch(e){return false}}
export async function loadAIChats(){
  let local=read()
  if(isApiConfigured()){
    try{const remote=await fetchUserCollection('ai-chats');if(Array.isArray(remote)){local=remote;write(local)}}catch(e){}
  }
  return local
}
export async function saveAIChats(chats){
  const value=(Array.isArray(chats)?chats:[]).slice(0,30)
  write(value)
  if(isApiConfigured()) await saveUserCollection('ai-chats',value)
  return value
}