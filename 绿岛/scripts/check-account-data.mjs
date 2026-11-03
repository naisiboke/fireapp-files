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
const actionModule={exports:{}}
new Function('require','module',serverSource('action-rewards.js'))(name=>{if(name==='node:crypto')return crypto;throw Error(name)},actionModule)
const serverModule={exports:{}}
new Function('require','module','Buffer','process','console',serverSource('service.js'))(
 name=>{if(name==='node:crypto')return crypto;if(name==='./action-rewards.js')return actionModule.exports;throw Error(name)},serverModule,Buffer,{env:{}},{error(){}},
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
let transport='online',holdAction='',releaseHeld=null,beforeStateSave=null
const silent={warn(){},error(){}}
let clientTimers=new Map(),timerId=0
function createClient(){
 const cache=moduleOf(source('utils/account-cache.js'),['accountId','accountKey','activateAccount','readAccountCache','writeAccountCache','preserveLegacyCache','adoptVerifiedLegacyCache'],{uni,console:silent})
 const storage=moduleOf(source('utils/storage.js'),['storage'],cache).storage
 const callAccountData=async event=>{
  if(transport==='offline')throw Object.assign(Error('模拟网络失败'),{code:'OFFLINE'})
  if(event.action==='state.save'&&beforeStateSave){const hook=beforeStateSave;beforeStateSave=null;await hook()}
  const result=await handler(event)
  if(event.action===holdAction)await new Promise(resolve=>{releaseHeld=resolve})
  if(!result.ok)throw Object.assign(Error(result.message),{code:result.code})
  if(transport==='malformed'&&event.action==='bootstrap')return {...result,exists:true,state:{}}
  return result
 }
 const api=moduleOf(source('utils/api-service.js'),['fetchActionRewards','onActionRewards','fetchMembership','redeemMembershipCode','fetchAccountBootstrap','saveUserState','fetchUserCollection','saveUserCollection','submitCommunityPost','deleteCommunityPost','fetchCommunityPosts','isApiConfigured'],{...cache,callAccountData,uni})
 const store=moduleOf(source('store/index.js'),['state','refreshMembershipFromServer','redeemMembershipForAccount','bootstrap','hydrateFromServer','getAccountConflictSummary','readAccountConflictBackup','resolveAccountConflict','persistNow','persist','syncStateToServer','suspendAccountSync','endAccountSession'],{
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
clientTimers.clear();deviceStorage.delete(client.cache.accountKey('fire_sync_meta_v1'))
client=createClient();client.store.bootstrap()
check('pending changes survive restart even if the separate metadata value was lost',client.store.state.ledger.length===2&&client.cache.readAccountCache('fire_forge_state').__fireLocalSync.dirty===true)
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
check('conflicting device versions keep local edits rather than replacing them',restored.loaded&&restored.conflict&&client.store.state.finance.assets===15000)
check('conflicting local state does not overwrite remote changes',(await handler({action:'bootstrap'})).state.finance.assets===99999)
client.store.endAccountSession()
trustedUid='account-B';await client.store.hydrateFromServer()
check('switching accounts clears A private data from the active view',client.cache.accountId()==='account-B'&&client.store.state.ledger.length===0&&client.store.state.finance.assets===0)
check('switching accounts preserves A separate local backup',client.cache.readAccountCache('fire_forge_state',null,'account-A').finance.assets===15000)
client.store.endAccountSession()
trustedUid='account-A'
restored=await client.store.hydrateFromServer()
check('conflict remains protected after sign-out and sign-in',restored.loaded&&restored.conflict&&(await handler({action:'bootstrap'})).state.finance.assets===99999&&client.store.state.finance.assets===15000)
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
 safeReturnRoute:value=>value||'/pages/index/index',finishSessionRecovery:(uid,target)=>target||'/pages/index/index',
 ref:value=>({value}),watch(){},onMounted(){},onBeforeUnmount(){},AppFeedback:{},useFeedbackPage:()=>1,showNotice(){},
 state:client.store.state,persist:client.store.persist,hydrateFromServer:client.store.hydrateFromServer,endAccountSession:client.store.endAccountSession,
 signInWithCode:async()=>{trustedUid='account-B';return {}},saveAuthToken:async()=>{},sendVerificationCode:async()=>({}),uni,
 setTimeout:()=>1,clearTimeout(){},clearInterval(){},console:silent,
}
const loginPage=new Function(...Object.keys(loginDependencies),loginScript+'\nreturn {email,code,login,allowCode(){verificationInfo={};sentEmail=account()}};')(...Object.values(loginDependencies))
loginPage.email.value='account-b@example.com';loginPage.code.value='123456';loginPage.allowCode()
transport='offline'
await loginPage.login()
check('failed restoration after a new sign-in cannot leave the previous account visible',client.cache.accountId()===''&&client.store.state.finance.assets===0)
check('failed sign-in restoration still preserves the previous account cache',client.cache.readAccountCache('fire_forge_state',null,'account-A').finance.assets===16000)
transport='online'
check('production data transport does not use the old device-ID collection endpoints',!source('utils/api-service.js').includes("apiRequest('/v1/me/state")&&!source('utils/api-service.js').includes("apiRequest('/v1/me/collections/"))
check('client publish no longer overwrites an edited record with a fresh storage read',!source('pages/community/share.vue').includes('CS.saveUGC(CS.ugc())'))

deviceStorage=new Map();trustedUid='member-A'
client=createClient();client.store.bootstrap();await client.store.hydrateFromServer()
await db.collection('vip_codes').doc('client-voucher-1').set({code:'FIRE3D-CLIENT-A',durationDays:3,status:'unused'})
const redeemStart=Date.now()
const redeemed=await client.store.redeemMembershipForAccount('FIRE3D-CLIENT-A')
check('confirmed redemption updates current membership immediately',redeemed.membership.active&&client.store.state.membership.active)
check('client uses finite server expiry rather than unlimited local VIP',client.store.state.membership.expiresAt>=redeemStart+3*86400000&&client.store.state.membership.expiresAt<=Date.now()+3*86400000)
check('membership-only updates do not dirty financial snapshots',client.cache.readAccountCache('fire_sync_meta_v1',{}).dirty===false)
deviceStorage=new Map();client=createClient();client.store.bootstrap();await client.store.hydrateFromServer()
check('new device can restore membership with no financial archive',client.store.state.membership.active&&client.store.state.finance.assets===0)
transport='offline'
let offlineRedeem
try{await client.store.redeemMembershipForAccount('FIRE3D-UNCONFIRMED')}catch(error){offlineRedeem=error}
check('offline redemption never grants an unconfirmed extension',offlineRedeem&&client.store.state.membership.expiresAt===redeemed.membership.expiresAt)
transport='online'
await db.collection('vip_codes').doc('client-voucher-race').set({code:'FIRE3D-CLIENT-RACE',durationDays:3,status:'unused'})
holdAction='membership.redeem';releaseHeld=null
const lateMembership=client.store.redeemMembershipForAccount('FIRE3D-CLIENT-RACE').catch(error=>error)
for(let turn=0;turn<100&&!releaseHeld;turn++)await Promise.resolve()
check('membership request can be delayed after server confirmation',typeof releaseHeld==='function')
client.store.endAccountSession();trustedUid='member-B';holdAction=''
await client.store.hydrateFromServer()
releaseHeld();const oldMembershipResult=await lateMembership
check('late redemption does not grant membership to a newly active account',oldMembershipResult instanceof Error&&!client.store.state.membership.active&&client.cache.accountId()==='member-B')
client.store.endAccountSession();trustedUid='member-A';await client.store.hydrateFromServer()
check('old account grant remains recoverable after an account switch',client.store.state.membership.active&&client.store.state.membership.expiresAt===redeemed.membership.expiresAt+3*86400000)


clientTimers.clear();deviceStorage=new Map();trustedUid='conflict-user';transport='online';holdAction=''
client=createClient();client.store.bootstrap();await client.store.hydrateFromServer()
client.store.state.finance={...client.store.state.finance,assets:10000};client.store.state.financeEntered=true
client.store.persistNow();await client.store.syncStateToServer()
async function conflictFixture(localAssets,cloudAssets){
 await client.store.hydrateFromServer()
 client.store.suspendAccountSync()
 client.store.state.finance.assets=localAssets;client.store.persistNow()
 const cloud=await handler({action:'bootstrap'})
 await handler({action:'state.save',revision:cloud.revision,state:{...cloud.state,finance:{...cloud.state.finance,assets:cloudAssets}}})
 return client.store.hydrateFromServer()
}
restored=await conflictFixture(15000,20000)
check('conflicting archives allow the verified user to enter in local mode',restored.loaded&&restored.conflict&&client.store.state.finance.assets===15000)
let summary=client.store.getAccountConflictSummary()
check('conflict screen receives both balances and record counts',summary.local.assets===15000&&summary.cloud.assets===20000&&summary.local.ledgerCount===0)
const backup=client.store.readAccountConflictBackup(summary.id)
check('both original archives are backed up before any choice',summary.backupReady&&backup.pair.local.finance.assets===15000&&backup.pair.cloud.finance.assets===20000)
await client.store.syncStateToServer()
check('deferred conflict remains visible and blocks implicit cloud writes',client.store.state.cloudSync.status==='conflict'&&(await handler({action:'bootstrap'})).state.finance.assets===20000)
const cloudChoice=await client.store.resolveAccountConflict('cloud',summary)
check('explicit cloud choice restores sync and uses cloud records',cloudChoice.resolved&&cloudChoice.synced&&client.store.state.finance.assets===20000)
check('cloud choice keeps the prior local backup accessible',client.store.readAccountConflictBackup(cloudChoice.backupId).pair.local.finance.assets===15000)
check('cloud choice does not rewrite the server archive',(await handler({action:'bootstrap'})).state.finance.assets===20000)
const revisionBeforeReorder=(await handler({action:'bootstrap'})).revision
client.store.state.finance=Object.fromEntries(Object.entries(client.store.state.finance).reverse())
client.store.persistNow();await client.store.syncStateToServer()
check('object key order alone does not create a dirty edit or new cloud revision',(await handler({action:'bootstrap'})).revision===revisionBeforeReorder&&!client.cache.readAccountCache('fire_sync_meta_v1').dirty)
await conflictFixture(21000,22000)
summary=client.store.getAccountConflictSummary()
const localChoice=await client.store.resolveAccountConflict('local',summary)
check('explicit local choice synchronizes against the reviewed current revision',localChoice.resolved&&localChoice.synced&&(await handler({action:'bootstrap'})).state.finance.assets===21000)
check('local choice keeps the replaced cloud archive in a backup',client.store.readAccountConflictBackup(localChoice.backupId).pair.cloud.finance.assets===22000)
await conflictFixture(23000,24000)
summary=client.store.getAccountConflictSummary()
let newer=await handler({action:'bootstrap'})
await handler({action:'state.save',revision:newer.revision,state:{...newer.state,finance:{...newer.state.finance,assets:25000}}})
const staleChoice=await client.store.resolveAccountConflict('local',summary)
check('cloud changes after review require another review instead of overwrite',!staleChoice.resolved&&staleChoice.changed&&(await handler({action:'bootstrap'})).state.finance.assets===25000&&client.store.state.finance.assets===23000)
summary=client.store.getAccountConflictSummary()
client.store.state.finance.assets=23100;client.store.persistNow()
let staleError
try{await client.store.resolveAccountConflict('cloud',summary)}catch(error){staleError=error}
check('local edits after review invalidate the choice safely',staleError?.code==='CONFLICT_CHANGED'&&client.store.state.finance.assets===23100)
summary=client.store.getAccountConflictSummary()
const writeStorage=uni.setStorageSync
uni.setStorageSync=(key,value)=>{if(key.includes('fire_sync_conflict_backup'))throw Error('full');writeStorage(key,value)}
client.store.state.finance.assets=23200;client.store.persistNow()
summary=client.store.getAccountConflictSummary()
let backupFailure
try{await client.store.resolveAccountConflict('cloud',summary)}catch(error){backupFailure=error}
check('backup storage failure blocks version switching and preserves local records',backupFailure?.code==='BACKUP_FAILED'&&client.store.state.finance.assets===23200&&(await handler({action:'bootstrap'})).state.finance.assets===25000)
uni.setStorageSync=writeStorage
summary=client.store.getAccountConflictSummary()
const activeStorage=uni.setStorageSync
uni.setStorageSync=(key,value)=>{if(key.startsWith('fire_forge_state:account:'))throw Error('full');activeStorage(key,value)}
let cacheFailure
try{await client.store.resolveAccountConflict('cloud',summary)}catch(error){cacheFailure=error}
check('active cache storage failure rolls back the version choice',cacheFailure?.code==='LOCAL_SAVE_FAILED'&&client.store.state.finance.assets===23200&&client.store.getAccountConflictSummary()!==null)
uni.setStorageSync=activeStorage
summary=client.store.getAccountConflictSummary()
transport='offline'
let offlineChoice
try{await client.store.resolveAccountConflict('local',summary)}catch(error){offlineChoice=error}
check('offline choice does not overwrite either archive',offlineChoice&&client.store.state.finance.assets===23200&&(await handler({action:'bootstrap'})).state.finance.assets===25000)
transport='online'
summary=client.store.getAccountConflictSummary()
holdAction='bootstrap';releaseHeld=null
const delayedResolution=client.store.resolveAccountConflict('cloud',summary).catch(error=>error)
for(let turn=0;turn<100&&!releaseHeld;turn++)await Promise.resolve()
check('resolution can pause for a remote ownership check',typeof releaseHeld==='function')
client.store.endAccountSession();trustedUid='other-conflict-user';holdAction=''
await client.store.hydrateFromServer()
releaseHeld()
const switchedResolution=await delayedResolution
check('switching accounts cancels an old account conflict choice',switchedResolution.code==='ACCOUNT_MISMATCH'&&client.cache.accountId()==='other-conflict-user'&&client.store.state.finance.assets===0)
check('new account cannot read another account conflict backup',client.store.readAccountConflictBackup(backup.id)===null)
client.store.endAccountSession();trustedUid='conflict-user';await client.store.hydrateFromServer()

await conflictFixture(26000,27000)
summary=client.store.getAccountConflictSummary()
beforeStateSave=async()=>{
 const concurrent=await handler({action:'bootstrap'})
 await handler({action:'state.save',revision:concurrent.revision,state:{...concurrent.state,finance:{...concurrent.state.finance,assets:28000}}})
}
const racedChoice=await client.store.resolveAccountConflict('local',summary)
check('CAS rejects cloud changes between review fetch and local-version upload',!racedChoice.resolved&&racedChoice.changed&&(await handler({action:'bootstrap'})).state.finance.assets===28000&&client.store.state.finance.assets===26000)
check('a failed CAS returns to a reviewable conflict rather than false success',client.store.getAccountConflictSummary()?.cloud.assets===28000&&client.store.state.cloudSync.status==='conflict')



clientTimers.clear();deviceStorage=new Map();trustedUid='login-conflict-user';transport='online';holdAction=''
client=createClient();client.store.bootstrap();await client.store.hydrateFromServer()
client.store.state.finance={...client.store.state.finance,assets:10000};client.store.state.financeEntered=true
client.store.persistNow();await client.store.syncStateToServer()
await conflictFixture(11000,12000)
const loginRoutes=[];let signInCalls=0
uni.reLaunch=options=>{loginRoutes.push(options.url);options.success?.()}
const conflictLoginDeps={...loginDependencies,state:client.store.state,persist:client.store.persist,
 hydrateFromServer:client.store.hydrateFromServer,endAccountSession:client.store.endAccountSession,
 signInWithCode:async()=>{signInCalls++;return {}},
}
const resumableLoginScript=loginScript.replace("import('@/utils/community-store.js')","Promise.resolve({CS:{hydrate:async()=>{}}})")
const conflictLogin=new Function(...Object.keys(conflictLoginDeps),resumableLoginScript+'\nreturn {email,code,login,resumeLogin,canResume,allowCode(){verificationInfo={};sentEmail=account()}};')(...Object.values(conflictLoginDeps))
conflictLogin.email.value='login-conflict@example.com';conflictLogin.code.value='123456';conflictLogin.allowCode()
await conflictLogin.login()
check('actual login handler enters the conflict chooser after verified sign-in',loginRoutes.at(-1).startsWith('/pages/sync-conflict/index?next='))
check('conflicted login keeps both versions and a valid login flag',uni.getStorageSync('fire_login_status')===true&&client.store.state.finance.assets===11000&&(await handler({action:'bootstrap'})).state.finance.assets===12000)
await conflictLogin.resumeLogin()
check('retrying verified restore does not request another sign-in',signInCalls===1&&conflictLogin.canResume.value&&loginRoutes.at(-1).startsWith('/pages/sync-conflict/index?next='))
const chooserHooks={},dialogDecision={confirm:false}
const chooserDeps={
 ref:value=>({value}),onLoad:fn=>chooserHooks.load=fn,onShow:fn=>chooserHooks.show=fn,
 useFeedbackPage:()=>1,AppFeedback:{},showNotice(){},showDialog:async()=>dialogDecision,
 getAccountConflictSummary:client.store.getAccountConflictSummary,resolveAccountConflict:client.store.resolveAccountConflict,
 readAccountConflictBackup:client.store.readAccountConflictBackup,hydrateFromServer:client.store.hydrateFromServer,
 safeReturnRoute:value=>value||'/pages/index/index',uni,
}
const chooserScript=source('pages/sync-conflict/index.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1]
 .replace(/^\s*import\s+(?:(?:[\s\S]*?)\s+from\s+)?['"][^'"\n]+['"]\s*;?/gm,'')
const chooser=new Function(...Object.keys(chooserDeps),chooserScript+'\nreturn {choose,leave,busy,summary};')(...Object.values(chooserDeps))
chooserHooks.load({});chooserHooks.show()
await chooser.choose('cloud')
check('canceling the real chooser leaves both archives unchanged',client.store.state.finance.assets===11000&&(await handler({action:'bootstrap'})).state.finance.assets===12000&&!chooser.busy.value)
chooser.leave()
check('postponing version selection enters the app without syncing either version',loginRoutes.at(-1)==='/pages/index/index'&&client.store.state.cloudSync.status==='conflict')
dialogDecision.confirm=true
await chooser.choose('cloud')
check('confirmed real chooser resumes home with selected records',loginRoutes.at(-1)==='/pages/index/index'&&client.store.state.finance.assets===12000&&chooser.summary.value===null)

console.log(checks.length+' account data safety checks passed')
