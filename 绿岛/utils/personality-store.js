import { saveUserCollection, fetchUserCollection } from './api-service.js'
import { accountId, readAccountCache, writeAccountCache } from './account-cache.js'
const KEY='fire_personality_history_v1'
export function personalityHistory(){const value=readAccountCache(KEY,[]);return Array.isArray(value)?value:[]}
function merge(remote,local){const map=new Map();for(const item of [...(remote||[]),...(local||[])])if(item?.id)map.set(item.id,item);return [...map.values()].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))}
export async function savePersonalityResult(type,result){
 const uid=accountId(),record={id:'personality-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),type,result,createdAt:Date.now()}
 const local=[record,...personalityHistory()]
 writeAccountCache(KEY,local,uid)
 const remote=await fetchUserCollection('personality-tests')
 if(accountId()!==uid)return record
 const value=merge(remote,local)
 await saveUserCollection('personality-tests',value)
 writeAccountCache(KEY,value,uid)
 return record
}
export async function hydratePersonalityHistory(){
 const uid=accountId(),remote=await fetchUserCollection('personality-tests')
 if(accountId()!==uid)return []
 const value=merge(remote,personalityHistory());writeAccountCache(KEY,value,uid);return value
}
