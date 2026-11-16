import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {createHandler,SERVICE_BUILD}=require('../../cloudfunctions/accountData/service.js')
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value))
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
function merge(target,patch){
 const next=copy(target)||{}
 for(const [key,value] of Object.entries(patch))next[key]=plain(value)?merge(plain(next[key])?next[key]:{},value):copy(value)
 return next
}
function database(){
 const tables=new Map();let tail=Promise.resolve()
 const table=name=>{if(!tables.has(name))tables.set(name,new Map());return tables.get(name)}
 const db={collection:name=>({doc:id=>({
  get:async()=>({data:table(name).has(id)?[copy(table(name).get(id))]:[]}),
  set:async value=>{table(name).set(id,{...copy(value),_id:id});return {id}},
  update:async patch=>{if(!table(name).has(id))throw Error('missing doc');table(name).set(id,merge(table(name).get(id),patch));return {updated:1}},
 })})}
 db.runTransaction=fn=>{
  const result=tail.catch(()=>{}).then(async()=>{
   const snapshot=new Map([...tables].map(([name,rows])=>[name,new Map([...rows].map(([id,row])=>[id,copy(row)]))]))
   try{return await fn(db)}catch(error){tables.clear();for(const entry of snapshot)tables.set(...entry);throw error}
  })
  tail=result;return result
 }
 return db
}
let checks=0
const check=(ok,message)=>{assert.ok(ok,message);checks++}
const db=database(),id=uid=>crypto.createHash('sha256').update('state:'+uid).digest('hex')
const row=async uid=>(await db.collection('user_states').doc(id(uid)).get()).data[0]
const seed=async(uid,value)=>db.collection('user_states').doc(id(uid)).set({userId:uid,revision:7,state:{finance:{assets:80000},ledger:[]},...value})
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
let at=Date.parse('2026-11-16T10:00:00Z'),uid='sequential',calls=0
let generate=async()=> '先记录今天的支出。'
const handler=createHandler({db,identity:async()=>({uid}),now:()=>at,generateAIReply:async input=>{calls++;return generate(input)}})
const chat=question=>handler({action:'ai.chat',question})
await seed('merge-proof',{aiQuota:{date:'2026-11-16',count:0,pending:{id:'old'}}})
await db.collection('user_states').doc(id('merge-proof')).update({aiQuota:{count:1}})
check((await row('merge-proof')).aiQuota.pending.id==='old','mock preserves omitted nested fields, matching CloudBase update semantics')

await seed(uid,{})
const financeBefore=copy((await row(uid)).state)
for(let count=1;count<=3;count++){
 const result=await chat('连续问题 '+count)
 check(result.ok&&result.used===count,'successive completed requests count once without AI_BUSY')
 check((await row(uid)).aiQuota.pending===null,'successful settlement explicitly releases nested reservation')
}
const beforeLimit=calls
check((await chat('第四个问题')).code==='AI_DAILY_LIMIT'&&calls===beforeLimit,'three free answers remain enforced without extra provider requests')
check(JSON.stringify((await row(uid)).state)===JSON.stringify(financeBefore)&&(await row(uid)).revision===7,'chat does not modify financial data or revision')

uid='failed';generate=async()=>{throw Object.assign(Error('provider failed'),{code:'AI_UNAVAILABLE'})}
check((await chat('失败请求')).code==='AI_UNAVAILABLE','provider failure remains actionable')
check((await row(uid)).aiQuota.count===0&&(await row(uid)).aiQuota.pending===null,'failed generation releases lock and does not charge')
generate=async()=> '可以重试。'
check((await chat('立即重试')).ok&&(await row(uid)).aiQuota.count===1,'failed request can immediately retry')
uid='empty';generate=async()=> '   '
check((await chat('空返回')).code==='AI_UNAVAILABLE'&&(await row(uid)).aiQuota.pending===null&&(await row(uid)).aiQuota.count===0,'invalid answer also releases reservation without charge')

uid='concurrent';const started=deferred(),response=deferred()
generate=async()=>{started.resolve();return response.promise}
const first=chat('尚在处理的请求');await started.promise
const beforeBusy=calls,activeReservation=copy((await row(uid)).aiQuota.pending)
check((await chat('重复请求')).code==='AI_BUSY'&&calls===beforeBusy,'genuinely overlapping requests remain blocked')
check((await row(uid)).aiQuota.pending.id===activeReservation.id,'busy rejection leaves the real request lock intact')
response.resolve('已经完成。')
check((await first).ok&&(await row(uid)).aiQuota.pending===null,'real in-flight response clears its own reservation')
generate=async()=> '下一条正常。'
check((await chat('完成后立即提问')).ok&&(await row(uid)).aiQuota.count===2,'overlap rejection does not block later questions or charge quota')

uid='expired';const oldStarted=deferred(),newStarted=deferred(),oldResponse=deferred(),newResponse=deferred()
generate=async({question})=>{if(question==='旧请求'){oldStarted.resolve();return oldResponse.promise}newStarted.resolve();return newResponse.promise}
const oldRequest=chat('旧请求');await oldStarted.promise
at+=120001
const newRequest=chat('新请求');await newStarted.promise
const replacement=(await row(uid)).aiQuota.pending.id
oldResponse.resolve('旧响应')
check((await oldRequest).code==='AI_REQUEST_EXPIRED','expired original response cannot settle a replacement')
check((await row(uid)).aiQuota.pending.id===replacement&&(await row(uid)).aiQuota.count===0,'old finally cannot clear or charge newer reservation')
newResponse.resolve('新响应')
check((await newRequest).ok&&(await row(uid)).aiQuota.pending===null&&(await row(uid)).aiQuota.count===1,'replacement can settle once after timeout')

uid='sequential';at+=86400000;generate=async()=> '新的一天。'
check((await chat('隔日提问')).used===1&&(await row(uid)).aiQuota.pending===null,'new China calendar day resets count and clears completed lock')
uid='member';await seed(uid,{membership:{active:true}})
for(let i=0;i<4;i++)check((await chat('会员提问')).ok,'server membership keeps unlimited answers')
check((await row(uid)).aiQuota.count===0&&(await row(uid)).aiQuota.pending===null,'member completion releases lock without consuming free quota')
check((await row('concurrent')).aiQuota.count===2,'accounts retain independent quotas')
check((await handler({action:'service.info'})).serviceBuild===SERVICE_BUILD,'read-only deployment probe exposes the fixed build')
console.log('CloudBase nested AI reservation release: '+checks+' checks passed')
