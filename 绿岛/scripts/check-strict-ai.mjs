import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
import {validateNickname} from '../utils/nickname.js'
import {limitAIAnswer} from '../utils/ai-answer.js'
import {MBTI_QUESTIONS,scorePersonality,manualMbtiResult} from '../utils/personality-assessment.js'
const require=createRequire(import.meta.url)
const {createHandler}=require('../../cloudfunctions/accountData/service.js')
let checks=0
const check=(ok,label)=>{assert.ok(ok,label);checks++}
const copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v))
function memoryDatabase(){
 const tables=new Map()
 let tail=Promise.resolve()
 function table(name){if(!tables.has(name))tables.set(name,new Map());return tables.get(name)}
 function query(name,filter={},offset=0,maximum=100,order){
  const values=()=>[...table(name).values()].filter(row=>Object.entries(filter).every(([key,value])=>row[key]===value))
  return {
   where:criteria=>query(name,{...filter,...criteria},offset,maximum,order),
   skip:value=>query(name,filter,value,maximum,order),
   limit:value=>query(name,filter,offset,value,order),
   orderBy:(field,direction)=>query(name,filter,offset,maximum,{field,direction}),
   get:async()=>{const rows=values();if(order)rows.sort((a,b)=>(a[order.field]-b[order.field])*(order.direction==='desc'?-1:1));return {data:copy(rows.slice(offset,offset+maximum))}},
   count:async()=>({total:values().length}),
   update:async value=>{const rows=values();for(const row of rows)table(name).set(row._id,{...row,...copy(value)});return {updated:rows.length}},
   doc:id=>({
    get:async()=>({data:table(name).has(id)?[copy(table(name).get(id))]:[]}),
    set:async value=>{table(name).set(id,{...copy(value),_id:id});return {id}},
    update:async value=>{if(!table(name).has(id))throw Error('missing doc');table(name).set(id,{...table(name).get(id),...copy(value)});return {updated:1}},
   }),
  }
 }
 const db={collection:name=>query(name),tables}
 db.runTransaction=fn=>{const pending=tail.catch(()=>{}).then(()=>fn(db));tail=pending;return pending}
 return db
}


const db=memoryDatabase(),id=uid=>crypto.createHash('sha256').update('state:'+uid).digest('hex')
let uid='A',at=Date.parse('2026-11-08T15:59:50Z'),generated='保持合理预算，先记录一周的支出。',decision={approved:true},calls=0,reviewCalls=0,hold=null
const handler=createHandler({db,identity:async()=>uid?{uid}:null,now:()=>at,
 generateAIReply:async()=>{calls++;return hold?await hold:generated},
 moderateAIReply:async({answer})=>{reviewCalls++;check(Array.from(answer).length<=500,'server reviews only bounded output');return decision},
 moderateNickname:async()=>({approved:true})})
for(const value of ['一二三四五六七八九','S B','傻B','草泥马','NMSL','S13','a\u200bb','旅人🌱','<script>','私信@我']){
 check(!validateNickname(value).ok,'client rejects prohibited nickname '+value)
 const result=await handler({action:'profile.nickname',name:value})
 check(result.code==='NICKNAME_INVALID','server independently rejects nickname')
}
check(validateNickname('一路向阳天天开心').ok,'eight-character boundary accepted')
check(validateNickname('旅人1').ok,'normal short nickname accepted')
let result=await handler({action:'profile.nickname',name:'一路向阳天天开心'})
check(result.ok&&result.profile.nicknamePolicyVersion===2,'strict approval tagged on server')
uid='legacy'
await db.collection('user_states').doc(id(uid)).set({userId:uid,revision:7,state:{finance:{assets:999},ledger:[],profile:{name:'旧审核昵称'}},publicProfile:{name:'旧审核昵称',status:'approved',updatedAt:at,reviewedAt:at}})
await db.collection('community_posts').doc('legacy-post').set({id:'legacy-post',ownerId:uid,status:'approved',deleted:false,createdAt:at})
check((await handler({action:'bootstrap'})).profile.nicknameReviewStatus==='needs_review','old policy needs re-review')
check((await handler({action:'posts.public'})).items[0].displayName==='社区用户','old review not treated as strict approval')
result=await handler({action:'profile.nickname',name:'清风旅人'})
check(result.ok&&result.profile.nicknameReviewStatus==='approved','policy migration permits review despite previous cooldown')
check((await handler({action:'bootstrap'})).revision===7,'migration leaves financial revision intact')
uid='A'
for(const text of ['建'.repeat(900),'🌱'.repeat(700),'第一条。'.repeat(150),'x'.repeat(499)+'𠀀'+'x','line\n'.repeat(150)]){
 generated=text;result=await handler({action:'ai.chat',question:'请给我一个建议'})
 check(result.ok&&result.reviewed===true&&Array.from(result.reply).length<=500,'reviewed server reply at most five hundred Unicode characters')
 check(result.reply===limitAIAnswer(text),'server and client use consistent truncation')
 // Use a new private account to isolate the existing three-free-reply limit.
 uid+='x'
}
uid='blocked';decision={approved:false};generated='不应展示的原始回答'
result=await handler({action:'ai.chat',question:'测试拒绝'})
check(result.code==='AI_REVIEW_REJECTED'&&!JSON.stringify(result).includes(generated),'unapproved reply never returned')
check((await db.collection('user_states').doc(id(uid)).get()).data[0].aiQuota.count===0,'rejection does not consume free reply')
decision={approved:'true'}
result=await handler({action:'ai.chat',question:'测试非布尔结果'})
check(!result.ok,'malformed moderation does not approve')
uid='free';decision={approved:true};generated='先记账，再复盘。'
for(let i=1;i<=3;i++){result=await handler({action:'ai.chat',question:'给我建议'});check(result.ok&&result.used===i,'server counts approved free replies')}
const before=calls
result=await handler({action:'ai.chat',question:'第四次'})
check(result.code==='AI_DAILY_LIMIT'&&calls===before,'free limit cannot be bypassed by client membership claim')
at+=20000 // Cross midnight in China, while still the same UTC calendar date.
result=await handler({action:'ai.chat',question:'新一天'})
check(result.ok&&result.used===1,'daily limit uses China calendar day')
uid='member'
await db.collection('user_states').doc(id(uid)).set({userId:uid,revision:3,state:{finance:{assets:123},ledger:[]},membership:{active:true}})
for(let i=0;i<4;i++)check((await handler({action:'ai.chat',question:'建议'})).ok,'server-verified member may exceed three')
check((await handler({action:'bootstrap'})).revision===3,'chat quota never advances financial snapshot revision')
uid='concurrent';let release;hold=new Promise(resolve=>release=resolve)
const first=handler({action:'ai.chat',question:'第一个问题'})
for(let i=0;i<20;i++)await Promise.resolve()
result=await handler({action:'ai.chat',question:'重复问题'})
check(result.code==='AI_BUSY','concurrent duplicate request rejected')
release('整理预算。');await first;hold=null
uid=null;result=await handler({action:'ai.chat',question:'测试'});check(result.code==='AUTH_REQUIRED','AI requires authenticated UID')
uid='A';result=await handler({action:'ai.chat',question:'测试',expectedUid:'B'});check(result.code==='ACCOUNT_MISMATCH','AI rejects old-account intent')
result=await handler({action:'ai.chat',question:'字'.repeat(2001)});check(result.code==='AI_INPUT_INVALID','input bounded independently of UI')
const oldFetch=globalThis.fetch,oldKey=process.env.DEEPSEEK_API_KEY
try{
 process.env.DEEPSEEK_API_KEY='isolated-provider-test'
 let requests=[]
 globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body);requests.push(body)
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(requests.length%2?{reply:'建议'.repeat(360)}:{approved:true})}}]})}
 }
 const real=createHandler({db,identity:async()=>({uid:'adapter'}),now:()=>at})
 result=await real({action:'ai.chat',question:'写超过两千字',finance:{assets:1234}})
 check(result.ok&&Array.from(result.reply).length<=500&&requests.length===2,'actual generation and separate moderation adapters applied')
 check(requests[0].messages[0].content.includes('500')&&requests[0].messages[0].content.includes('中国大陆'),'server imposes concise mainland-platform instruction')
 check(!JSON.stringify(requests[1]).includes('1234'),'output moderation excludes financial context')
 requests=[]
 globalThis.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({choices:[{message:{content:'{"approved":false,"reason":"拒绝"}'}}]})}}
 const nick=createHandler({db,identity:async()=>({uid:'semantic'}),now:()=>at})
 result=await nick({action:'profile.nickname',name:'伞兵旅人'})
 check(result.code==='NICKNAME_REJECTED','AI semantic refusal is binding')
 check(['潜台词','谐音','缩写','繁简变体','中国大陆','2至8'].every(word=>requests[0].messages[0].content.includes(word)),'strict nickname review covers coded and implied abuse')
 globalThis.fetch=async()=>{throw Error('provider unavailable')}
 const offline=createHandler({db,identity:async()=>({uid:'offline'}),now:()=>at})
 result=await offline({action:'ai.chat',question:'给我建议'})
 check(result.code==='AI_UNAVAILABLE'&&(await db.collection('user_states').doc(id('offline')).get()).data[0].aiQuota.count===0,'provider failure releases reservation without charging')
}finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=oldKey}
const axes=['EI','SN','TF','JP']
check(MBTI_QUESTIONS.length===100,'reviewed MBTI question count')
for(const axis of axes){
 const q=MBTI_QUESTIONS.filter(q=>q.axis===axis)
 check(q.length===25&&q.filter(x=>x.reverse).length===12,'explicit balanced axis '+axis)
}
for(let i=0;i<100;i++){
 const neutral=Array(100).fill(3);neutral[i]=4
 const result=scorePersonality('mbti',neutral),q=MBTI_QUESTIONS[i]
 check(result.rows[axes.indexOf(q.axis)].score===(q.reverse?49:51),'single-question polarity and dimension '+q.id)
 check(result.rows.filter(row=>row.axis!==q.axis).every(row=>row.score===50),'answer changes only its own axis')
}
for(const e of 'EI')for(const s of 'SN')for(const t of 'TF')for(const j of 'JP'){
 const expected=e+s+t+j
 const answers=MBTI_QUESTIONS.map(q=>{const index=axes.indexOf(q.axis),positive=expected[index]===axes[index][0];return q.reverse?(positive?1:5):(positive?5:1)})
 check(scorePersonality('mbti',answers).mbtiType===expected,'sixteen-type exact mapping '+expected)
 check(manualMbtiResult(expected.toLowerCase()).rows.length===0,'manual type remains separate')
}
check(scorePersonality('mbti',Array(100).fill(3)).mbtiType===null,'neutral answers never force a label')
console.log('Strict nickname, reviewed AI limits and all MBTI axes: '+checks+' checks passed')
