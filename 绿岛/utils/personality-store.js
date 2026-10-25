import { isApiConfigured, saveUserCollection, fetchUserCollection } from './api-service.js'
const KEY='fire_personality_history_v1'
function read(){try{const value=uni.getStorageSync(KEY);return Array.isArray(value)?value:[]}catch(e){return[]}}
function write(value){try{uni.setStorageSync(KEY,JSON.stringify(value));return true}catch(e){return false}}
export function personalityHistory(){return read()}
export async function savePersonalityResult(type,result){
  const record={id:'personality-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),type,result,createdAt:Date.now()}
  const list=[record,...read()].slice(0,50)
  write(list)
  if(isApiConfigured()) await saveUserCollection('personality-tests',list)
  return record
}
export async function hydratePersonalityHistory(){
  if(!isApiConfigured()) return []
  const remote=await fetchUserCollection('personality-tests')
  if(Array.isArray(remote)){write(remote);return remote}
  return read()
}
