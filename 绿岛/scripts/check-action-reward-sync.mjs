// node scripts/check-action-reward-sync.mjs
// Real handlers/client modules. Isolated CloudBase-style immutable IDs, atomic rollback and network faults.
// Does not contact production, validate credentials or build an APK.
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const serverSource=path=>readFileSync(new URL('../../cloudfunctions/accountData/'+path,import.meta.url),'utf8')
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value)),checks=[]
function check(name,value){assert.ok(value,name);checks.push(name)}
const clean=code=>code.replace(/^\s*import\s+(?:(?:[\s\S]*?)\s+from\s+)?['"][^'"\n]+['"]\s*;?/gm,'').replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class))/g,'')
function mod(path,names,deps={}){return new Function(...Object.keys(deps),clean(source(path))+';return {'+names.join(',')+'}')(...Object.values(deps))}
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
    set:async value=>{if(Object.prototype.hasOwnProperty.call(value,'_id')){const error=Error('Cannot update _id');error.code='INVALID_DATA';throw error}if(resultName===name){resultName='';return {code:'DATABASE_REQUEST_FAILED',message:'database returned an error result'}}if(failName===name){failName='';const error=Error('temporary reward write failure');error.code='DATABASE_REQUEST_FAILED';throw error}table(name).set(id,{...copy(value),_id:id});return {id}},
    update:async value=>{if(!table(name).has(id))throw Error('missing doc');table(name).set(id,{...table(name).get(id),...copy(value)});return {updated:1}},
   }),
  }
 }
 let failName='',resultName=''
 const db={collection:name=>query(name),tables,failNext(name){failName=name},errorResultNext(name){resultName=name}}
 db.runTransaction=fn=>{const pending=tail.catch(()=>{}).then(async()=>{const before=new Map([...tables].map(([name,rows])=>[name,new Map([...rows].map(([id,row])=>[id,copy(row)]))]));try{return await fn(db)}catch(error){tables.clear();for(const [name,rows]of before)tables.set(name,rows);throw error}});tail=pending;return pending}
 return db
}

const db=memoryDatabase(),actionsModule={exports:{}},serviceModule={exports:{}}
new Function('require','module',serverSource('action-rewards.js'))(()=>crypto,actionsModule)
const actions=actionsModule.exports,now=Date.now(),today=actions.day(now)
new Function('require','module','Buffer','console','process',serverSource('service.js'))(name=>name==='node:crypto'?crypto:actions,serviceModule,Buffer,{error(){}},{env:{}})
let owner='owner-A'
const handler=serviceModule.exports.createHandler({db,identity:async()=>({uid:owner}),now:()=>now,moderate:async()=>({approved:true})})
const state={financeEntered:true,finance:{assets:1000},ledger:[],items:[],assetHistory:[],exp:20}
let saved=await handler({action:'state.save',state,revision:0})
check('normal save returns cloud revision',saved.ok&&saved.revision===1&&saved.rewards.exp===20)
state.ledger.push({id:'spend',type:'expense',date:today,cents:1000,rewardVersion:1,updatedAt:now})
saved=await handler({action:'state.save',state,revision:1})
check('immutable database IDs do not block the first reward',saved.ok&&saved.rewards.exp===25)
const walletRow=db.tables.get('action_rewards').get(actions.key('actions',owner))
check('wallet remains owned and keeps its database ID',walletRow.userId===owner&&walletRow._id===actions.key('actions',owner))
let again=await handler({action:'actions.get'})
check('opening home again does not duplicate experience',again.ok&&again.rewards.exp===25&&again.rewards.events.length===1)
state.assetHistory.push({id:'assets',date:today,amount:1000,rewardVersion:1,confirmedAt:now})
db.failNext('action_reward_claims')
saved=await handler({action:'state.save',state,revision:2})
check('reward failure still acknowledges successful financial upload',saved.ok&&saved.revision===3&&saved.rewardsError?.code==='REWARD_SYNC_PENDING')
check('failed transaction cannot leave half a reward',db.tables.get('action_rewards').get(actions.key('actions',owner)).earned===5&&db.tables.get('action_reward_claims').size===1)
const remote=await handler({action:'bootstrap'})
check('financial data is already saved at the acknowledged revision',remote.revision===3&&remote.state.assetHistory[0].id==='assets')
again=await handler({action:'actions.get'})
check('next refresh repairs a saved but unawarded asset action',again.ok&&again.rewards.exp===33&&again.rewards.events.some(e=>e.kind==='assets'))
again=await handler({action:'actions.get'})
check('asset repair remains idempotent',again.rewards.exp===33&&again.rewards.events.filter(e=>e.kind==='assets').length===1)
state.goalPlan={id:'car',name:'车子',reviewedAt:now,rewardVersion:1}
saved=await handler({action:'state.save',state,revision:3})
check('following save uses correct revision and does not enter false conflict',saved.ok&&saved.revision===4&&saved.rewards.exp===41)
db.failNext('action_reward_claims')
saved=await handler({action:'collection.save',name:'favorites',revision:0,items:[{postId:'official-1',snapshotAt:now,rewardVersion:1}]})
check('favorite persistence acknowledgement survives reward failure',saved.ok&&saved.revision===1&&saved.rewardsError?.code==='REWARD_SYNC_PENDING')
again=await handler({action:'actions.get'})
check('favorite reward repairs from saved collection',again.ok&&again.rewards.exp===43)
db.failNext('action_reward_claims')
saved=await handler({action:'posts.submit',post:{id:'story',title:'我的生活记录',content:'最近开始记录每日消费，也给自己制定了清晰的储蓄目标。',timeline:[]}})
check('approved publication remains saved when reward write fails',saved.ok&&saved.post.status==='approved'&&saved.rewardsError?.code==='REWARD_SYNC_PENDING')
again=await handler({action:'actions.get'})
check('approved publication reward repairs on next refresh',again.ok&&again.rewards.exp===53)
again=await handler({action:'actions.get'})
check('all repaired rewards issue exactly once',again.rewards.exp===53&&again.rewards.events.length===5)
db.errorResultNext('action_reward_claims')
saved=await handler({action:'collection.save',name:'favorites',revision:1,items:[{postId:'official-2',snapshotAt:now,rewardVersion:1}]})
check('SDK error result is not mistaken for a successful reward write',saved.ok&&saved.revision===2&&saved.rewardsError?.code==='REWARD_SYNC_PENDING')
check('error-result transaction leaves no partial wallet change',db.tables.get('action_rewards').get(actions.key('actions',owner)).baseExp+db.tables.get('action_rewards').get(actions.key('actions',owner)).earned===53)
again=await handler({action:'actions.get'})
check('retry also repairs SDK error-result failures',again.ok&&again.rewards.exp===55)
again=await handler({action:'actions.get'})
check('error-result repair cannot issue duplicate rewards',again.rewards.exp===55)
owner='owner-B';again=await handler({action:'actions.get'})
check('other account cannot see repaired rewards',again.ok&&again.rewards.exp===0)
owner='owner-A'
const apiStatuses=[],apiRewards=[]
let uid='client-A',mode='ok',calls=0
const good={exp:55,version:1,events:[{kind:'ledger',day:today,xp:5}],counters:{}}
const api=mod('utils/api-service.js',['fetchActionRewards','onActionRewards','onActionSync','saveUserState'],{
 accountId:()=>uid,callAccountData:async payload=>{calls++;if(mode==='network')throw Object.assign(Error('offline'),{code:'NETWORK_ERROR'});if(mode==='old')return{ok:true,revision:5};if(mode==='partial')return{ok:true,revision:6,rewardsError:{code:'REWARD_SYNC_PENDING',message:'操作已保存，经验尚未同步，请稍后重试'}};return{ok:true,uid,revision:7,rewards:copy(good)}},
 uni:{getStorageSync:()=>''},console,
})
api.onActionSync((value,owner)=>apiStatuses.push({value,owner}))
api.onActionRewards((value,owner)=>apiRewards.push({value,owner}))
await api.fetchActionRewards()
check('real API publishes syncing and confirmed states',apiStatuses.at(-2).value.status==='syncing'&&apiStatuses.at(-1).value.status==='synced'&&apiRewards[0].value.exp===55)
mode='network';try{await api.fetchActionRewards()}catch(error){}
check('network failure becomes visible instead of silent',apiStatuses.at(-1).value.status==='error'&&apiStatuses.at(-1).value.code==='NETWORK_ERROR')
check('failed refresh leaves confirmed rewards intact',apiRewards.length===1)
mode='old';try{await api.fetchActionRewards()}catch(error){}
check('incomplete old backend response is rejected clearly',apiStatuses.at(-1).value.status==='error')
await api.saveUserState({},4)
check('old backend save is acknowledged but marks rewards unavailable',apiStatuses.at(-1).value.code==='REWARDS_NOT_SUPPORTED')
mode='partial';const partial=await api.saveUserState({},5)
check('partial reward response preserves financial revision in client',partial.revision===6&&apiStatuses.at(-1).value.code==='REWARD_SYNC_PENDING')
mode='ok'
api.onActionRewards(()=>{throw Error('UI listener failure')})
const acknowledged=await api.saveUserState({},6)
check('UI callback error cannot invalidate acknowledged save',acknowledged.revision===7&&apiStatuses.at(-1).value.status==='synced')

const cached=new Map(),cacheData=new Map(),routes=[],reactive=v=>v
let saveWorks=true,rewardListener,syncListener,readCount=0,uploadCount=0,waitUpload=null,releaseUpload=null
const serverState={financeEntered:true,finance:{assets:1000},ledger:[],items:[],exp:20}
const store=mod('store/index.js',['state','bootstrap','hydrateFromServer','persistNow','refreshActions','suspendAccountSync'],{
 reactive,toRaw:v=>v,accountId:()=>uid,activateAccount(){},readAccountCache:(key,f)=>copy(cacheData.get(key))??f,writeAccountCache:(key,v)=>{cacheData.set(key,copy(v));return true},
 preserveLegacyCache(){},adoptVerifiedLegacyCache:()=>false,validateNickname:()=>({ok:true}),
 storage:{get:(key,f)=>copy(cached.get(key))??f,set:(key,v)=>{if(!saveWorks)return false;cached.set(key,copy(v));return true}},
 uni:{setStorageSync(){},removeStorageSync(){}},HeroDay(){},hasValidFinance:()=>false,createFreedomPlan:()=>({}),financeSignature:JSON.stringify,
 onActionRewards:fn=>{rewardListener=fn},onActionSync:fn=>{syncListener=fn},
 fetchAccountBootstrap:async()=>({uid,exists:true,state:copy(serverState),revision:1}),
 saveUserState:async()=>{uploadCount++;if(waitUpload)await waitUpload;return{ok:true,revision:uploadCount+1}},
 fetchActionRewards:async()=>{readCount++;syncListener({status:'synced',message:''},uid);return copy(good)},isApiConfigured:()=>true,
 console,setTimeout:()=>1,clearTimeout(){},
})
store.bootstrap();await store.hydrateFromServer();await store.refreshActions()
check('store accepts confirmed cloud rewards',store.state.exp===55)
waitUpload=new Promise(resolve=>releaseUpload=resolve)
store.state.ledger.push({id:'local',type:'expense',cents:100,date:today})
store.persistNow()
const readsBefore=readCount,refreshOne=store.refreshActions(),refreshTwo=store.refreshActions()
await Promise.resolve();await Promise.resolve()
check('home refresh waits for pending upload before reading old receipts',readCount===readsBefore)
releaseUpload();await Promise.all([refreshOne,refreshTwo]);waitUpload=null
check('concurrent home refreshes coalesce into one rewards request',readCount===readsBefore+1)
syncListener({status:'error',message:'重试'},uid)
check('reward failures are visible without overwriting finance sync state',store.state.actionSync.status==='error'&&store.state.cloudSync.status==='synced')
rewardListener(copy(good),uid);syncListener({status:'synced',message:''},uid)
check('retry recovers balance and clears task error',store.state.exp===55&&store.state.actionSync.status==='synced')
const snapshot=cached.get('state')
check('temporary reward sync status is not uploaded or persisted as finances',!('actionSync'in snapshot)&&!('actionRewards'in snapshot))
syncListener({status:'error',message:'wrong user'},'other')
check('another account cannot alter the current task status',store.state.actionSync.status==='synced')
const tasks=mod('utils/action-tasks.js',['todayActions'])
const completed={goalPlan:{name:'车子',assets:0,amount:1000},actionRewards:{events:[{kind:'edit',day:today,xp:8}],counters:{}}}
const rows=tasks.todayActions(completed,{member:true,posts:[],at:now})
check('a completed action remains visible when the task pool rotates',rows[0].id==='edit'&&rows[0].done&&rows.length<=3)
check('home has an explicit task retry control',source('pages/index/index.vue').includes('@tap="retryActions"')&&source('pages/index/index.vue').includes('state.actionSync.message'))
check('hero page has the same retry control',source('pages/hero/index.vue').includes('@tap="retryActions"'))
console.log(checks.length+' action reward sync checks passed')
