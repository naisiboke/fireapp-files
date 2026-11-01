// Run with Node.js 18+: node scripts/check-account-data.mjs
// Real client/server modules with in-memory storage and authenticated CloudBase context mocks.
// No production database or network request is made by this check.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const serverSource=path=>readFileSync(new URL('../../cloudfunctions/accountData/'+path,import.meta.url),'utf8')
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value))
const checks=[]
function check(name,condition){assert.ok(condition,name);checks.push(name)}
function moduleOf(code,names,dependencies={}){
 const clean=code.replace(/^\s*import\s+(?:(?:[\s\S]*?)\s+from\s+)?['"][^'"\n]+['"]\s*;?/gm,'')
  .replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class))/g,'')
 return new Function(...Object.keys(dependencies),clean+'\nreturn {'+names.join(',')+'};')(...Object.values(dependencies))
}
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
const db=memoryDatabase()
let trustedUid='account-A',decision={approved:true,reason:'正常经历'}
const serverModule={exports:{}}
new Function('require','module','Buffer','process','console',serverSource('service.js'))(
 name=>{if(name==='node:crypto')return crypto;throw Error(name)},serverModule,Buffer,{env:{}},{error(){}},
)
const handler=serverModule.exports.createHandler({db,identity:async()=>trustedUid?{uid:trustedUid,email:trustedUid.toLowerCase()+'@example.com'}:null,moderate:async()=>copy(decision)})
const stateA={financeEntered:true,finance:{assets:12000,monthlyDeposit:2000,retirementExpense:1000},ledger:[{id:'entry-1',date:'2026-11-01',type:'expense',category:'food',cents:12345}],items:[],assetHistory:[],monthlyTargets:{'2026-11':{expense:200000,income:800000}},personalityTests:{},profile:{name:'测试用户'}}
let result=await handler({action:'bootstrap',userId:'someone-else',clientId:'random-device'})
check('new authenticated account has an explicit absent archive',result.ok&&result.uid==='account-A'&&!result.exists&&result.state===null&&result.revision===0)
result=await handler({action:'state.save',userId:'account-B',state:{...stateA,membership:{active:true}},revision:0})
check('save uses authenticated UID and returns revision',result.ok&&result.uid==='account-A'&&result.revision===1)
result=await handler({action:'bootstrap'})
check('archive contains real financial and ledger data',result.state.finance.assets===12000&&result.state.ledger.length===1)
check('client cannot grant membership through state upload',result.state.membership.active===false)
result=await handler({action:'state.save',state:{...stateA,finance:{...stateA.finance,assets:13000}},revision:1})
check('next revision saves',result.ok&&result.revision===2)
check('overwritten version has a server backup',[...db.tables.get('data_backups').values()].some(row=>row.snapshot?.state?.finance?.assets===12000))
result=await handler({action:'state.save',state:stateA,revision:1})
check('stale snapshot is rejected',!result.ok&&result.code==='SYNC_CONFLICT')
result=await handler({action:'state.save',state:{financeEntered:false,finance:{assets:0},ledger:[],items:[],assetHistory:[],monthlyTargets:{}},revision:2})
check('empty reinstall snapshot cannot erase an existing archive',!result.ok&&result.code==='EMPTY_OVERWRITE')
check('previous state survives rejected writes',(await handler({action:'bootstrap'})).state.finance.assets===13000)
trustedUid='account-B'
result=await handler({action:'bootstrap',userId:'account-A'})
check('another account cannot read A through a supplied user ID',result.ok&&!result.exists)
check('authenticated account cannot receive an old account write intent',(await handler({action:'state.save',expectedUid:'account-A',revision:0,state:stateA})).code==='ACCOUNT_MISMATCH')
check('write-intent mismatch leaves the new account empty',!(await handler({action:'bootstrap'})).exists)
trustedUid=null
check('anonymous context cannot read private data',(await handler({action:'bootstrap'})).code==='AUTH_REQUIRED')
trustedUid='account-A'
const post={id:'local-post-1',title:'记录消费后的改变',content:'我开始每天记录支出，发现外卖费用较高，现在每周自己做饭三次。',timeline:[{year:'2025',desc:'开始记录消费'}],journey:'doing'}
result=await handler({action:'posts.submit',post:{...post,ownerId:'account-B',status:'approved'}})
const postId=result.post.id
check('post ownership comes from authenticated context',result.ok&&result.post.ownerId==='account-A')
check('server verdict is persisted in community_posts',result.post.status==='approved'&&db.tables.get('community_posts').get(postId).status==='approved')
result=await handler({action:'posts.mine'})
check('author can restore own published content',result.items.some(item=>item.id===postId))
trustedUid='account-B'
check('other account does not see private author records',(await handler({action:'posts.mine'})).items.length===0)
check('approved content appears to another logged-in account',(await handler({action:'posts.public',journey:'doing'})).items.some(item=>item.id===postId))
check('public feed omits review attempts and author UID',!('ownerId' in (await handler({action:'posts.public'})).items[0])&&!('reviewAttempt' in (await handler({action:'posts.public'})).items[0]))
check('other account cannot edit the post',(await handler({action:'posts.submit',post:{...post,id:postId}})).code==='FORBIDDEN')
check('other account cannot delete the post',(await handler({action:'posts.delete',id:postId})).code==='FORBIDDEN')
trustedUid='account-A';decision={approved:false,reason:'乱码无意义'}
result=await handler({action:'posts.submit',post:{...post,id:'rejected',status:'approved'}})
check('client approved flag cannot bypass server review',result.post.status==='rejected')
decision=null
result=await handler({action:'posts.submit',post:{...post,id:'review-down'}})
check('moderation outage preserves a recoverable cloud post',result.ok&&result.post.status==='review_failed')
check('unapproved posts do not appear in public feed',(await handler({action:'posts.public'})).items.length===1)
result=await handler({action:'posts.delete',id:'local-post-1'})
check('delete resolves an unacknowledged local ID to its cloud record',result.ok)
check('deletion hides rather than destroys cloud content',db.tables.get('community_posts').get(postId).deleted===true)
check('deleted post is absent from the public feed',(await handler({action:'posts.public'})).items.length===0)

let deviceStorage=new Map()
const uni={
 getStorageSync:key=>copy(deviceStorage.get(key)??''),
 setStorageSync:(key,value)=>deviceStorage.set(key,copy(value)),
 removeStorageSync:key=>deviceStorage.delete(key),
 request(){throw Error('Unexpected legacy HTTP request')},
}
let transport='online',holdAction='',releaseHeld=null
const silent={warn(){},error(){}}
let clientTimers=new Map(),timerId=0
function createClient(){
 const cache=moduleOf(source('utils/account-cache.js'),['accountId','accountKey','activateAccount','readAccountCache','writeAccountCache','preserveLegacyCache','adoptVerifiedLegacyCache'],{uni,console:silent})
 const storage=moduleOf(source('utils/storage.js'),['storage'],cache).storage
 const callAccountData=async event=>{
  if(transport==='offline')throw Object.assign(Error('模拟网络失败'),{code:'OFFLINE'})
  const result=await handler(event)
  if(event.action===holdAction)await new Promise(resolve=>{releaseHeld=resolve})
  if(!result.ok)throw Object.assign(Error(result.message),{code:result.code})
  if(transport==='malformed'&&event.action==='bootstrap')return {...result,exists:true,state:{}}
  return result
 }
 const api=moduleOf(source('utils/api-service.js'),['fetchAccountBootstrap','saveUserState','fetchUserCollection','saveUserCollection','submitCommunityPost','deleteCommunityPost','fetchCommunityPosts','isApiConfigured'],{...cache,callAccountData,uni})
 const store=moduleOf(source('store/index.js'),['state','bootstrap','hydrateFromServer','persistNow','persist','syncStateToServer','suspendAccountSync','endAccountSession'],{
  ...api,...cache,storage,uni,reactive:value=>value,toRaw:value=>value,HeroDay(){},createFreedomPlan(){return {}},financeSignature:JSON.stringify,hasValidFinance(){return false},validateNickname(){return {ok:true}},
  console:silent,setTimeout:callback=>{const id=++timerId;clientTimers.set(id,callback);return id},clearTimeout:id=>clientTimers.delete(id),
 })
 const community=moduleOf(source('utils/community-store.js'),['CS'],{...cache,...api,uni,console:silent,reactive:value=>value}).CS
 return {cache,api,store,community}
}
trustedUid='account-A';decision={approved:true,reason:'正常经历'}
let client=createClient()
client.store.bootstrap()
check('signed-out cache does not pretend to have account data',client.store.state.ledger.length===0)
let restored=await client.store.hydrateFromServer()
check('verified account bootstrap restores financial data',restored.loaded&&client.cache.accountId()==='account-A'&&client.store.state.finance.assets===13000&&client.store.state.ledger.length===1)
client.store.state.finance.assets=14000
client.store.persistNow()
await client.store.syncStateToServer()
check('local edits reach the account cloud archive',(await handler({action:'bootstrap'})).state.finance.assets===14000)
clientTimers.clear();deviceStorage=new Map()
client=createClient();client.store.bootstrap();restored=await client.store.hydrateFromServer()
check('reinstall plus the same authenticated UID restores the archive',restored.loaded&&client.store.state.finance.assets===14000&&client.store.state.ledger.length===1)
transport='offline'
restored=await client.store.hydrateFromServer()
check('restore failure leaves existing local data intact',!restored.loaded&&client.store.state.finance.assets===14000)
client.store.state.ledger.push({id:'offline-entry',type:'expense',category:'food',date:'2026-11-02',cents:9900})
client.store.persistNow();await client.store.syncStateToServer()
check('failed restore blocks subsequent cloud writes',(await handler({action:'bootstrap'})).state.ledger.length===1)
check('offline edit is durable in the account cache',client.cache.readAccountCache('fire_forge_state').ledger.length===2)
transport='online';restored=await client.store.hydrateFromServer()
check('reconnection restores and uploads the pending same-version edit',restored.loaded&&(await handler({action:'bootstrap'})).state.ledger.length===2)
transport='malformed';restored=await client.store.hydrateFromServer()
check('malformed cloud state never resets the local archive',!restored.loaded&&client.store.state.ledger.length===2&&client.store.state.finance.assets===14000)
transport='online';await client.store.hydrateFromServer()
const cloudBeforeConflict=await handler({action:'bootstrap'})
await handler({action:'state.save',revision:cloudBeforeConflict.revision,state:{...cloudBeforeConflict.state,finance:{...cloudBeforeConflict.state.finance,assets:99999}}})
client.store.state.finance.assets=15000
client.store.persistNow()
restored=await client.store.hydrateFromServer()
check('conflicting device versions keep local edits rather than replacing them',!restored.loaded&&client.store.state.finance.assets===15000)
check('conflicting local state does not overwrite remote changes',(await handler({action:'bootstrap'})).state.finance.assets===99999)
client.store.endAccountSession()
trustedUid='account-B';await client.store.hydrateFromServer()
check('switching accounts clears A private data from the active view',client.cache.accountId()==='account-B'&&client.store.state.ledger.length===0&&client.store.state.finance.assets===0)
check('switching accounts preserves A separate local backup',client.cache.readAccountCache('fire_forge_state',null,'account-A').finance.assets===15000)
client.store.endAccountSession()
trustedUid='account-A'
restored=await client.store.hydrateFromServer()
check('conflict remains protected after sign-out and sign-in',!restored.loaded&&(await handler({action:'bootstrap'})).state.finance.assets===99999&&client.store.state.finance.assets===15000)
check('conflict does not advance the unacknowledged local base revision',client.cache.readAccountCache('fire_sync_meta_v1').revision< (await handler({action:'bootstrap'})).revision)
client.cache.activateAccount('account-A')
transport='offline'
check('draft save reports a local copy',client.community.saveDraft({title:'离线草稿',content:'尚未确认云端保存'}))
await client.community.hydrate()
check('failed collection restoration preserves the offline draft',client.community.draft().title==='离线草稿')
transport='online';await client.community.hydrate()
clientTimers.clear();deviceStorage=new Map();client=createClient();client.store.bootstrap();await client.store.hydrateFromServer()
await client.community.hydrate()
check('draft confirmed in the cloud restores after reinstall',client.community.draft().title==='离线草稿')
const published=await client.community.submitPost({...post,id:'new-sdk-post'})
check('publish success is based on the actual saved cloud verdict',published.status==='approved'&&client.community.ugc().some(item=>item.id===published.id&&item.reviewAttempt))
transport='offline'
let failed=false
try{await client.community.submitPost({...post,id:'offline-post'})}catch(error){failed=true}
check('offline publish fails visibly while preserving its local content',failed&&client.community.ugc().some(item=>item.id==='offline-post'&&item.status==='review_failed'))
transport='online'
await client.community.hydrate()
check('one failed draft does not erase already published records',client.community.ugc().some(item=>item.id===published.id&&item.status==='approved'))
const accountBeforeLegacy=client.cache.accountId()
deviceStorage.set('fire_forge_state',JSON.stringify({...stateA,profile:{email:'owner@example.com'}}))
deviceStorage.set('fire_account_email','owner@example.com')
deviceStorage.delete('fire_legacy_cache_backup_v1')
client.cache.preserveLegacyCache()
check('legacy cache is not adopted by a different verified email',!client.cache.adoptVerifiedLegacyCache('different','other@example.com'))
check('legacy cache with verified matching email is copied into that account namespace',client.cache.adoptVerifiedLegacyCache('owner','owner@example.com')&&client.cache.readAccountCache('fire_forge_state',null,'owner').finance.assets===12000)
check('legacy original is retained instead of removed',deviceStorage.has('fire_forge_state')&&deviceStorage.has('fire_legacy_cache_backup_v1'))
check('legacy import does not change the active account',client.cache.accountId()===accountBeforeLegacy)
clientTimers.clear();deviceStorage=new Map();transport='online';trustedUid='account-A'
client=createClient();client.store.bootstrap();await client.store.hydrateFromServer()
holdAction='bootstrap';releaseHeld=null
const lateRestore=client.store.hydrateFromServer()
for(let turn=0;turn<100&&!releaseHeld;turn++)await Promise.resolve()
check('delayed restore is in flight',typeof releaseHeld==='function')
client.store.endAccountSession();trustedUid='account-B';holdAction=''
await client.store.hydrateFromServer()
releaseHeld();const ignored=await lateRestore
check('old account restore response cannot replace a newly signed-in account',ignored.cancelled&&client.cache.accountId()==='account-B'&&client.store.state.finance.assets===0)
client.store.endAccountSession();trustedUid='account-A';await client.store.hydrateFromServer()
client.store.state.finance.assets=16000
holdAction='state.save';releaseHeld=null
client.store.persistNow()
const pendingSave=client.store.syncStateToServer()
for(let turn=0;turn<100&&!releaseHeld;turn++)await Promise.resolve()
check('delayed save has reached the server',typeof releaseHeld==='function')
client.store.endAccountSession();trustedUid='account-B';holdAction=''
await client.store.hydrateFromServer()
releaseHeld();await pendingSave
check('old account save acknowledgement does not change the active account',client.cache.accountId()==='account-B'&&client.store.state.finance.assets===0)
client.store.endAccountSession();trustedUid='account-A'
restored=await client.store.hydrateFromServer()
check('lost save acknowledgement is recognized when cloud and local content match',restored.loaded&&client.store.state.finance.assets===16000)
const loginScript=source('pages/login/login.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1]
  .replace(/^\s*import\s+(?:(?:[\s\S]*?)\s+from\s+)?['"][^'"\n]+['"]\s*;?/gm,'')
  .replace(/import\.meta/g,'({env:{DEV:false}})')
const loginDependencies={
 ref:value=>({value}),watch(){},onMounted(){},onBeforeUnmount(){},AppFeedback:{},useFeedbackPage:()=>1,showNotice(){},
 state:client.store.state,persist:client.store.persist,hydrateFromServer:client.store.hydrateFromServer,endAccountSession:client.store.endAccountSession,
 signInWithCode:async()=>{trustedUid='account-B';return {}},saveAuthToken:async()=>{},sendVerificationCode:async()=>({}),uni,
 setTimeout:()=>1,clearTimeout(){},clearInterval(){},console:silent,
}
const loginPage=new Function(...Object.keys(loginDependencies),loginScript+'\nreturn {email,code,login,allowCode(){verificationInfo={}}};')(...Object.values(loginDependencies))
loginPage.email.value='account-b@example.com';loginPage.code.value='123456';loginPage.allowCode()
transport='offline'
await loginPage.login()
check('failed restoration after a new sign-in cannot leave the previous account visible',client.cache.accountId()===''&&client.store.state.finance.assets===0)
check('failed sign-in restoration still preserves the previous account cache',client.cache.readAccountCache('fire_forge_state',null,'account-A').finance.assets===16000)
transport='online'
check('production data transport does not use the old device-ID collection endpoints',!source('utils/api-service.js').includes("apiRequest('/v1/me/state")&&!source('utils/api-service.js').includes("apiRequest('/v1/me/collections/"))
check('client publish no longer overwrites an edited record with a fresh storage read',!source('pages/community/share.vue').includes('CS.saveUGC(CS.ugc())'))
console.log(checks.length+' account data safety checks passed')
