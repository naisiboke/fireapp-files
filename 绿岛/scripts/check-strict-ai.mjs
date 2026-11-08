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
let uid='A',at=Date.parse('2026-11-08T15:59:50Z'),generated='保持合理预算，先记录一周的支出。',generationError=false,calls=0,hold=null
const handler=createHandler({db,identity:async()=>uid?{uid}:null,now:()=>at,
 generateAIReply:async()=>{calls++;if(generationError)throw Object.assign(Error('模拟生成失败'),{code:'AI_UNAVAILABLE'});return hold?await hold:generated},
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
 check(result.ok&&result.reviewed===false&&result.maxTokens===500&&Array.from(result.reply).length<=500,'single-call generation keeps token budget plus display fallback')
 check(result.reply===limitAIAnswer(text),'server and client use consistent truncation')
 // Use a new private account to isolate the existing three-free-reply limit.
 uid+='x'
}
uid='failed';generationError=true
result=await handler({action:'ai.chat',question:'测试生成失败'})
check(result.code==='AI_UNAVAILABLE','generation failure is reported')
check((await db.collection('user_states').doc(id(uid)).get()).data[0].aiQuota.count===0,'generation failure does not consume free reply')
generationError=false;generated={reply:'错误的适配器返回格式'}
result=await handler({action:'ai.chat',question:'测试非字符串结果'})
check(!result.ok,'malformed generation is rejected without a repair request')
uid='free';generated='先记账，再复盘。'
for(let i=1;i<=3;i++){result=await handler({action:'ai.chat',question:'给我建议'});check(result.ok&&result.used===i,'server counts successful free replies')}
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
 let requests=[],providerText='建议'.repeat(360),finishReason='stop'
 globalThis.fetch=async(url,options)=>{
  requests.push(JSON.parse(options.body))
  return {ok:true,json:async()=>({choices:[{finish_reason:finishReason,message:{content:providerText}}]})}
 }
 const real=createHandler({db,identity:async()=>({uid:'adapter'}),now:()=>at})
 result=await real({action:'ai.chat',question:'写超过两千字',finance:{assets:1234},max_tokens:99999})
 check(result.ok&&result.maxTokens===500&&result.reviewed===false&&requests.length===1,'one chat message uses exactly one provider request')
 check(requests[0].max_tokens===500&&requests[0].stream===false,'hard provider generation budget cannot be overridden by client')
 check(!('response_format'in requests[0]),'plain text avoids JSON envelope overhead and token-limit parse repair')
 check(requests[0].messages[0].content.includes('500 tokens')&&requests[0].messages[0].content.includes('简洁'),'short generation instruction')
 check(Array.from(result.reply).length<=500,'display fallback remains secondary protection')
 requests=[];providerText='先记录支出，再安排储蓄。然后';finishReason='length'
 result=await real({action:'ai.chat',question:'请继续生成很多内容'})
 check(result.ok&&result.reply===providerText&&requests.length===1,'token-limited partial answer is not automatically continued or regenerated')
 requests=[];providerText='{"reply":"这是在预算处被截断的普通文本'
 result=await real({action:'ai.chat',question:'给我建议'})
 check(result.ok&&result.reply===providerText&&requests.length===1,'plain text never causes JSON repair request')
 requests=[]
 globalThis.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({choices:[{message:{content:'{"approved":false,"reason":"拒绝"}'}}]})}}
 const nick=createHandler({db,identity:async()=>({uid:'semantic'}),now:()=>at})
 result=await nick({action:'profile.nickname',name:'伞兵旅人'})
 check(result.code==='NICKNAME_REJECTED'&&requests.length===1,'nickname still requires its own strict AI review')
 check(['潜台词','谐音','缩写','繁简变体','中国大陆','2至8'].every(word=>requests[0].messages[0].content.includes(word)),'strict nickname rules unchanged')
 check(requests[0].max_tokens===220&&requests[0].response_format.type==='json_object','nickname review settings unchanged')
 requests=[]
 const community=createHandler({db,identity:async()=>({uid:'community-review'}),now:()=>at})
 result=await community({action:'posts.submit',post:{id:'budget-review',title:'生活的点滴记录',content:'我开始记录生活中的消费和储蓄目标。',timeline:[]}})
 check(result.ok&&result.post.status==='rejected'&&requests.length===1,'community post still waits for AI review and honors rejection')
 check(requests[0].max_tokens===350&&requests[0].response_format.type==='json_object','community review settings unchanged')
 requests=[]
 globalThis.fetch=async()=>{requests.push({});throw Error('provider unavailable')}
 const offline=createHandler({db,identity:async()=>({uid:'offline'}),now:()=>at})
 result=await offline({action:'ai.chat',question:'给我建议'})
 check(result.code==='AI_UNAVAILABLE'&&requests.length===1&&(await db.collection('user_states').doc(id('offline')).get()).data[0].aiQuota.count===0,'network failure never retries or charges')
 requests=[]
 globalThis.fetch=async()=>{requests.push({});return {ok:false,status:429}}
 const limited=createHandler({db,identity:async()=>({uid:'provider-rate-limit'}),now:()=>at})
 result=await limited({action:'ai.chat',question:'给我建议'})
 check(result.code==='AI_UNAVAILABLE'&&requests.length===1,'provider rejection does not trigger paid automatic retry')
 requests=[]
 globalThis.fetch=async()=>{requests.push({});return {ok:true,json:async()=>({choices:[{message:{content:''}}]})}}
 const empty=createHandler({db,identity:async()=>({uid:'empty'}),now:()=>at})
 result=await empty({action:'ai.chat',question:'给我建议'})
 check(result.code==='AI_UNAVAILABLE'&&requests.length===1&&(await db.collection('user_states').doc(id('empty')).get()).data[0].aiQuota.count===0,'empty answer never triggers repair or consumes allowance')
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
console.log('Single-call AI token budget, unchanged moderation and all MBTI axes: '+checks+' checks passed')
