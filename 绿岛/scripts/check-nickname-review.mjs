import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {createHandler}=require('../../cloudfunctions/accountData/service.js')
let checks=0
const check=(ok,message)=>{assert.ok(ok,message);checks++}
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value))
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

const db=memoryDatabase(),stateId=uid=>crypto.createHash('sha256').update('state:'+uid).digest('hex')
let uid='A',at=Date.parse('2026-11-08T04:00:00Z'),calls=0,verdict={approved:true,reason:'通过'},pending=null
const handler=createHandler({db,identity:async()=>uid?{uid,email:'private@example.com'}:null,now:()=>at,moderate:async()=>({approved:true}),moderateNickname:async name=>{calls++;if(pending)return pending;return verdict}})
const base={finance:{assets:12345},ledger:[],profile:{name:'旧昵称'},financeEntered:true}
let result=await handler({action:'state.save',state:base,revision:0})
check(result.ok,'initial account archive')
uid=null;result=await handler({action:'profile.nickname',name:'新的旅人'});check(result.code==='AUTH_REQUIRED'&&calls===0,'nickname requires verified account')
uid='A';result=await handler({action:'profile.nickname',name:'新的旅人',expectedUid:'B'});check(result.code==='ACCOUNT_MISMATCH'&&calls===0,'stale account intent rejected')
for(const name of ['','a','http://site.cn','mail@example.com','旅人13800138000','a\u200bb','一二三四五六七八九','S B','傻B','nmsl']){
 result=await handler({action:'profile.nickname',name});check(!result.ok&&calls===0,'invalid nickname never sent to AI')
}
await db.collection('community_posts').doc('old-post').set({id:'old-post',ownerId:'A',displayName:'伪造旧名',title:'过去的经历',content:'我的一段真实生活经历',status:'approved',deleted:false,journey:'doing',createdAt:at})
let release
pending=new Promise(resolve=>release=resolve)
const approving=handler({action:'profile.nickname',name:'新的旅人'})
for(let i=0;i<12;i++)await Promise.resolve()
check(!(await handler({action:'bootstrap'})).profile?.nicknameReviewStatus,'no public nickname before AI verdict')
release({approved:true});result=await approving;pending=null
check(result.ok&&result.profile.name==='新的旅人'&&result.profile.nicknameReviewStatus==='approved','approval changes canonical public name')
const approvedAt=result.profile.nicknameUpdatedAt
const bootstrap=await handler({action:'bootstrap'})
check(bootstrap.revision===1&&bootstrap.state.finance.assets===12345&&bootstrap.profile.name==='新的旅人','nickname review leaves financial revision and data intact')
let feed=await handler({action:'posts.public'})
check(feed.items[0].displayName==='新的旅人'&&!('ownerId'in feed.items[0])&&!JSON.stringify(feed.items).includes('private@example.com'),'existing posts reflect approved name without leaking owner or email')
result=await handler({action:'state.save',state:{...base,profile:{name:'绕过审核',nicknameReviewStatus:'approved',nicknameUpdatedAt:at+999999}},revision:1})
check(result.ok&&(await handler({action:'bootstrap'})).profile.name==='新的旅人','generic archive save cannot replace reviewed public name')
result=await handler({action:'posts.submit',post:{id:'new',displayName:'伪造作者',title:'新的生活经历',content:'这是我的真实生活记录，持续前进。',timeline:[]}})
check(result.ok&&result.post.displayName==='新的旅人','post ignores forged client author name')
const priorCalls=calls
result=await handler({action:'profile.nickname',name:'第二个昵称'})
check(result.code==='NICKNAME_COOLDOWN'&&calls===priorCalls,'non-member cooldown enforced before model cost')
await db.collection('user_states').doc(stateId('A')).update({membership:{active:true}})
verdict={approved:false,reason:'昵称含辱骂，请修改'}
result=await handler({action:'profile.nickname',name:'不合适昵称'})
check(result.code==='NICKNAME_REJECTED'&&(await handler({action:'bootstrap'})).profile.nicknameUpdatedAt===approvedAt,'rejected nickname keeps name and cooldown timestamp')
verdict=null
result=await handler({action:'profile.nickname',name:'正常旅人'})
check(result.code==='REVIEW_UNAVAILABLE'&&(await handler({action:'bootstrap'})).profile.name==='新的旅人','invalid AI response never counts as approval')
at+=600001;verdict={approved:true}
let releases=[]
const racing=createHandler({db,identity:async()=>({uid:'A'}),now:()=>at,moderateNickname:()=>new Promise(resolve=>releases.push(resolve))})
const first=racing({action:'profile.nickname',name:'远方的旅人'}),second=racing({action:'profile.nickname',name:'安静的旅人'})
for(let i=0;i<30&&releases.length<2;i++)await Promise.resolve()
check(releases.length===2,'both member requests reached isolated review')
for(const resolve of releases)resolve({approved:true})
const race=await Promise.all([first,second])
check(race.filter(v=>v.ok).length===1&&race.some(v=>v.code==='NICKNAME_CHANGED'),'concurrent approval does not overwrite newer name')
const winner=(await handler({action:'bootstrap'})).profile.name
feed=await handler({action:'posts.public'})
check(feed.items.every(post=>post.displayName===winner),'all old and new posts resolve current reviewed name')
uid='B';result=await handler({action:'profile.nickname',name:'另一位用户'})
check(result.ok&&(await db.collection('user_states').doc(stateId('A')).get()).data[0].publicProfile.name===winner,'another account cannot change A public profile')
const savedFetch=globalThis.fetch,savedKey=process.env.DEEPSEEK_API_KEY
try{
 process.env.DEEPSEEK_API_KEY='isolated-test-placeholder'
 let sent
 globalThis.fetch=async(url,options)=>{sent=JSON.parse(options.body);return{ok:true,json:async()=>({choices:[{message:{content:'{"approved":true,"reason":"通过"}'}}]})}}
 const realReview=createHandler({db,identity:async()=>({uid:'C'}),now:()=>at})
 result=await realReview({action:'profile.nickname',name:'云端旅人'})
 check(result.ok&&JSON.parse(sent.messages[1].content).nickname==='云端旅人','actual server AI adapter uses strict JSON review')
 check(!JSON.stringify(sent).includes('12345')&&!JSON.stringify(sent).includes('private@example.com'),'nickname request excludes financial data and email')
 globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"approved":"true"}'}}]})})
 const malformed=createHandler({db,identity:async()=>({uid:'D'}),now:()=>at})
 result=await malformed({action:'profile.nickname',name:'云端旅人'})
 check(result.code==='REVIEW_UNAVAILABLE','string approval is rejected')
 delete process.env.DEEPSEEK_API_KEY
 const unconfigured=createHandler({db,identity:async()=>({uid:'E'}),now:()=>at})
 result=await unconfigured({action:'profile.nickname',name:'云端旅人'})
 check(result.code==='REVIEW_UNAVAILABLE','missing key fails clearly without exposing credentials')
}finally{globalThis.fetch=savedFetch;if(savedKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=savedKey}
console.log('Server-reviewed nicknames, author names and account isolation: '+checks+' checks passed')
