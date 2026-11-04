// Run in 绿岛: node scripts/check-v104-features.mjs
// Real cloud handlers and client modules, isolated authenticated DB/storage/navigation mocks.
// No production database writes, no APK build, no external AI request.
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const serverSource=path=>readFileSync(new URL('../../cloudfunctions/accountData/'+path,import.meta.url),'utf8')
const checks=[],copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)),DAY=86400000
function check(name,value){assert.ok(value,name);checks.push(name)}
const clean=code=>code.replace(/^\s*import\s+(?:(?:[\s\S]*?)\s+from\s+)?['"][^'"\n]+['"]\s*;?/gm,'').replace(/\bexport\s+(?=(?:async\s+)?(?:function|const|let|class))/g,'')
function mod(path,names,deps={}){return new Function(...Object.keys(deps),clean(source(path))+';return {'+names.join(',')+'}')(...Object.values(deps))}
const reactive=v=>v,ref=value=>({value}),computed=get=>({get value(){return get()}})
let instant=Date.parse('2026-11-03T04:00:00Z')
class ClockDate extends Date{constructor(...args){super(...(args.length?args:[instant]))}static now(){return instant}}
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

const db=memoryDatabase(),actionModule={exports:{}},serverModule={exports:{}}
new Function('require','module','Date',serverSource('action-rewards.js'))(name=>crypto,actionModule,ClockDate)
const actions=actionModule.exports
new Function('require','module','Date','Buffer','process','console',serverSource('service.js'))(name=>name==='node:crypto'?crypto:actions,serverModule,ClockDate,Buffer,{env:{}},{error(){}})
let uid='A',verdict=true
const handler=serverModule.exports.createHandler({db,identity:async()=>({uid}),moderate:async()=>({approved:verdict,reason:'fixture'}),now:()=>instant})
const initial={financeEntered:true,finance:{assets:100,monthlyDeposit:1000,retirementExpense:1000},ledger:[],assetHistory:[],items:[],exp:40}
let snapshot=copy(initial),revision=0
async function save(){const result=await handler({action:'state.save',expectedUid:uid,state:copy(snapshot),revision});check('state save accepted at revision '+revision,result.ok);revision=result.revision;return result}
let result=await save()
check('legacy EXP preserved on first wallet creation',result.rewards.exp===40)
const addExpense=()=>snapshot.ledger.push({id:'ledger-'+instant,type:'expense',date:actions.day(instant),cents:500,updatedAt:instant,rewardVersion:1})
const confirmAsset=()=>snapshot.assetHistory=[{id:'asset',amount:100,date:actions.day(instant),confirmedAt:instant,rewardVersion:1}]
addExpense();confirmAsset();snapshot.goalPlan={id:'goal',name:'车子',reviewedAt:instant,rewardVersion:1}
result=await save()
check('ledger 5, assets 8 and goal 8 awarded',result.rewards.exp===61&&result.rewards.events.length===3)
check('single action never awards more than ten',result.rewards.events.every(e=>e.xp<=10))
snapshot.exp=999999;result=await save()
check('repeat save cannot mint client EXP',result.rewards.exp===61&&result.rewards.events.length===3)
let boot=await handler({action:'bootstrap'});check('bootstrap returns authoritative EXP',boot.state.exp===61)
const beforeRevision=boot.revision
result=await handler({action:'actions.get'});check('reward refresh leaves financial revision unchanged',(await handler({action:'bootstrap'})).revision===beforeRevision)
addExpense();result=await save();check('second expense on same day has no reward',result.rewards.exp===61)
instant+=DAY;snapshot.ledger.push({id:'income',type:'income',date:actions.day(instant),cents:100,updatedAt:instant,rewardVersion:1})
result=await save();check('income is not a spending task',result.rewards.exp===61)
addExpense();result=await save();check('next day spending has its own capped reward',result.rewards.exp===66)
snapshot.goalPlan.reviewedAt=instant;result=await save();check('goal review capped per calendar week',result.rewards.exp===66)
instant+=13*DAY;confirmAsset();result=await save();check('assets can reward after fourteen days',result.rewards.exp===74)
instant+=DAY;confirmAsset();result=await save();check('third asset save has no reward',result.rewards.exp===74)
snapshot.goalPlan.reviewedAt=instant;result=await save();check('new week goal review rewards once',result.rewards.exp===82)
let favoriteRevision=0
async function favorite(ids){const items=ids.map(postId=>({postId,snapshotAt:instant,rewardVersion:1}));const r=await handler({action:'collection.save',name:'favorites',items,revision:favoriteRevision});check('favorite collection saves',r.ok);favoriteRevision=r.revision;return r}
result=await favorite(['official-1','official-2','official-3','official-4'])
check('favorites capped at three daily',result.rewards.exp===88)
await favorite([]);result=await favorite(['official-1']);check('cancel and re-add cannot repeat reward',result.rewards.exp===88)
instant+=DAY;result=await favorite(['official-1','official-5']);check('same post stays claimed across dates',result.rewards.exp===90)
await db.collection('community_posts').doc('own').set({id:'own',ownerId:'A',status:'approved',deleted:false})
result=await favorite(['own','nonexistent','official-12']);check('own and nonexistent posts do not award',result.rewards.exp===90)
async function post(id,content='我开始记录每笔消费，慢慢积累自己的储蓄目标。'){const r=await handler({action:'posts.submit',post:{id,title:'我的自由生活经历',content,timeline:[{year:'2026',desc:'开始记录'}]}});check('post handler returns saved result',r.ok);return r}
const firstPost=await post('story'),firstPublished=instant
check('approved new post awards ten',firstPost.rewards.exp===100)
result=await post('story');check('post retry cannot repeat publish reward',result.rewards.exp===100)
result=await post('story-2');check('publish reward uses rolling ninety day limit',result.rewards.exp===100)
instant+=60*DAY
result=await post('story','这次我补充更多真实生活经历，记录每天的消费账本和新的储蓄进度，也总结了避免冲动消费的方法和详细的行动步骤。')
check('substantial approved edit after sixty days awards eight',result.rewards.exp===108)
result=await post('story','我又更新了非常多的生活细节，认真讲述每个阶段如何使用账本，让自己逐步建立长期目标，写下这段真实经历的变化和更多内容。')
check('edit reward cannot repeat inside sixty days',result.rewards.exp===108)
verdict=false;result=await post('rejected');check('rejected post has no reward',(await handler({action:'actions.get'})).rewards.exp===108)
verdict=true;instant=firstPublished+90*DAY;result=await post('new-after-ninety');check('publish becomes eligible after ninety days',result.rewards.exp===118)

// Recover an approved publication whose reward transaction failed after content saved.
const orphanId='approved-awaiting-reward'
await db.collection('community_posts').doc(orphanId).set({id:orphanId,ownerId:'recover-post',status:'approved',deleted:false,reviewAttempt:'attempt',updatedAt:instant,pendingActionReward:{kind:'publish',firstPublishedAt:instant,hash:'publication'}})
uid='recover-post'
const recoveredPost=await handler({action:'actions.get'})
check('approved post reward recovers after an interrupted response',recoveredPost.ok&&recoveredPost.rewards.exp===10)
const recoveredAgain=await handler({action:'actions.get'})
check('post reward recovery is idempotent',recoveredAgain.rewards.exp===10)
uid='A'
const owned=await handler({action:'posts.public'});check('public feed hides previous moderation content',owned.items.every(p=>!('approvedContent'in p)))
uid='B';result=await handler({action:'actions.get'});check('different accounts have separate rewards',result.rewards.exp===0)
await actions.award(db,'boundary','assets','nov',Date.parse('2026-11-30T04:00:00Z'))
const boundary=await actions.award(db,'boundary','assets','dec',Date.parse('2026-12-01T04:00:00Z'))
check('calendar month change does not bypass fourteen day asset gap',boundary.awarded===0)
const parallel=await Promise.all(Array.from({length:8},()=>actions.award(db,'race','ledger','entry',instant)))
check('concurrent repeat action has one reward',parallel.reduce((n,r)=>n+r.awarded,0)===5)
uid='deleting';revision=0;snapshot={finance:{},ledger:[],items:[{id:'only',name:'想买'}],exp:0};await save()
snapshot={finance:{},ledger:[],items:[],deletions:[{kind:'wishlist',id:'only',at:instant}]}
result=await save();check('explicit last item deletion can sync',result.ok)
const emptyAttempt=await handler({action:'state.save',revision,state:{finance:{},ledger:[],items:[]}})
check('empty reinstall still cannot erase prior state',emptyAttempt.code==='EMPTY_OVERWRITE')

const wish=mod('utils/wishlist.js',['wishlistBucket','wishlistDue','wishlistReason','createWishlist','decideWishlist','removeWishlist'])
const engine=mod('utils/engine.js',['WishlistSaved','SaveAssetRecord','SaveExpense','GoalEngine','ReelCalendarParts'])
let local={items:[],deletions:[]},writes=0
const persist=()=>{writes++;return true}
const item=wish.createWishlist(local,{name:'相机',amount:'500',days:7},persist,instant-8*DAY)
check('create persists before navigation',item&&writes===1&&local.items.length===1)
check('expiry alone does not declare success',wish.wishlistDue(item,instant)&&wish.wishlistBucket(item)==='active')
wish.decideWishlist(local,item.id,false,persist,instant)
check('not purchased at expiry becomes success',item.status==='success'&&item.resolution==='expired'&&engine.WishlistSaved(local)===500)
const early=wish.createWishlist(local,{name:'耳机',amount:100,days:7},persist,instant)
wish.decideWishlist(local,early.id,false,persist,instant)
check('early not-buy decision is success',early.resolution==='early'&&wish.wishlistBucket(early)==='success')
const bought=wish.createWishlist(local,{name:'鞋',amount:300,days:3},persist,instant)
wish.decideWishlist(local,bought.id,true,persist,instant)
check('purchased amount never counts as saved',bought.status==='bought'&&engine.WishlistSaved(local)===600)
for(const status of ['ended','abandoned','transferred'])check('legacy '+status+' remains success',wish.wishlistBucket({status})==='success')
check('legacy failed needs user confirmation',wish.wishlistBucket({status:'failed'})==='active'&&wish.wishlistDue({status:'failed',created:instant,days:30},instant))
let before=JSON.stringify(local)
check('failed create rolls back without losing older items',!wish.createWishlist(local,{name:'新物品',amount:10,days:7},()=>false,instant)&&JSON.stringify(local)===before)
check('failed delete rolls back record and tombstone',!wish.removeWishlist(local,item.id,()=>false)&&JSON.stringify(local)===before)
check('confirmed delete writes a tombstone',wish.removeWishlist(local,item.id,persist)&&local.deletions.length===1&&!local.items.some(x=>x.id===item.id))
local.items.push({id:123,name:'旧数字编号',status:'active',created:instant,days:7,amount:20})
check('legacy numeric identifiers can be resolved',wish.decideWishlist(local,'123',false,persist,instant))
let currentUid='A',route='/pages/index/index',blocked=false,saveWorks=true
const state={items:[{id:'one',name:'第一件',status:'active',created:Date.now()-8*DAY,days:7,amount:10},{id:'two',name:'第二件',status:'failed',created:Date.now(),days:7,amount:20}],ready:true,cloudSync:{status:'synced'}}
const feedbackState={owner:9}
const reminder=mod('utils/wishlist-reminder.js',['wishlistReminder','beginWishlistVisit','maybePromptWishlist','closeWishlistReminder','answerWishlistReminder'],{reactive,state,persistNow:()=>saveWorks,accountId:()=>currentUid,feedbackState,hasOpenFeedback:()=>blocked,showNotice(){},currentPageRoute:()=>route,...wish,uni:{getStorageSync:()=>true}})
const begin=()=>{reminder.beginWishlistVisit();return reminder.maybePromptWishlist(9)}
check('due items prompt on normal home',begin()&&reminder.wishlistReminder.remaining===2)
before=JSON.stringify(state.items);reminder.closeWishlistReminder()
check('closing reminder never records purchase',JSON.stringify(state.items)===before&&reminder.wishlistReminder.owner===null)
check('later defers entire pending batch for this visit',!reminder.maybePromptWishlist(9))
check('next app foreground visit reminds again',begin())
saveWorks=false
check('failed reminder decision remains visible and unchanged',!reminder.answerWishlistReminder(false)&&reminder.wishlistReminder.id==='one'&&state.items[0].status==='active')
saveWorks=true;reminder.answerWishlistReminder(false)
check('not bought advances to next pending item',state.items[0].status==='success'&&reminder.wishlistReminder.id==='two')
reminder.answerWishlistReminder(true)
check('bought explicitly fails challenge and closes last item',state.items[1].status==='bought'&&reminder.wishlistReminder.owner===null)
state.items[0].status='active';begin();currentUid='B'
check('account switch rejects an old reminder decision',!reminder.answerWishlistReminder(true)&&state.items[0].status==='active')
currentUid='A';route='/pages/ledger/edit';check('reminders never interrupt active data entry',!begin())
route='/pages/index/index';blocked=true;check('reminders do not stack on another dialog',!begin())
blocked=false;state.cloudSync.status='restoring';check('reminders wait for account restoration',!begin())
state.cloudSync.status='synced'

let rewardsCallback=null,cache={},storageData=null,storageWorks=true
const store=mod('store/index.js',['state','deleteGoalPlan','bootstrap'],{
 reactive,toRaw:v=>v,accountId:()=>currentUid,activateAccount(){},readAccountCache:(k,f)=>cache[k]??f,writeAccountCache:(k,v)=>{cache[k]=copy(v);return true},preserveLegacyCache(){},adoptVerifiedLegacyCache(){},
 storage:{get:(_k,f)=>copy(storageData)||f,set:(_k,v)=>{if(!storageWorks)return false;storageData=copy(v);return true}},
 uni:{setStorageSync(){},removeStorageSync(){}},HeroDay(){},createFreedomPlan:()=>({}),financeSignature:JSON.stringify,hasValidFinance:()=>false,
 isApiConfigured:()=>false,onActionSync(){},onActionRewards:fn=>{rewardsCallback=fn},validateNickname:()=>({ok:true}),clearTimeout(){},setTimeout(){},console,
})
Object.assign(store.state,{ready:true,finance:{assets:900},freedomPlan:{deadline:12345},exp:50,goalPlan:{id:'g',name:'车子'},goalDraft:{name:'车子'},homeCountdown:'goal'})
storageWorks=false;before=JSON.stringify(store.state)
check('failed goal deletion preserves goal and finance',!store.deleteGoalPlan()&&JSON.stringify(store.state)===before)
storageWorks=true;check('goal deletion succeeds after local persistence',store.deleteGoalPlan())
check('deletion only clears selected goal, draft and homepage toggle',store.state.goalPlan===null&&store.state.goalDraft===null&&store.state.homeCountdown==='fire')
check('FIRE deadline, assets and earned experience survive goal deletion',store.state.finance.assets===900&&store.state.freedomPlan.deadline===12345&&store.state.exp===50)
Object.assign(store.state,{goalPlan:{id:'g2',name:'房子'},goalDraft:{id:'other',name:'旅行'}});store.deleteGoalPlan()
check('unrelated draft remains after deleting published goal',store.state.goalDraft.name==='旅行')
rewardsCallback({exp:60,events:[],counters:{}},'A');rewardsCallback({exp:55,events:[],counters:{}},'A')
check('late reward response cannot lower account balance',store.state.exp===60)
rewardsCallback({exp:999,events:[],counters:{}},'B')
check('reward listener rejects another account',store.state.exp===60)
const task=mod('utils/action-tasks.js',['ACTION_RULES','todayActions','actionWeek'])
check('exactly six accepted action types',task.ACTION_RULES.map(x=>x.id).join(',')==='ledger,assets,goal,favorite,publish,edit')
check('all advertised rewards are at most ten',task.ACTION_RULES.every(x=>x.xp>0&&x.xp<=10))
check('no unavailable goal or member-only task for basic account',task.todayActions({actionRewards:{events:[],counters:{}}},{at:instant}).every(t=>!['goal','publish','edit'].includes(t.id)))
const withGoal={goalPlan:{name:'车子',assets:10,amount:100},actionRewards:{events:[],counters:{}}}
check('home task pool never exceeds three',task.todayActions(withGoal,{member:true,at:instant}).length<=3)
check('completed task uses server reward receipt',task.todayActions({actionRewards:{events:[{kind:'ledger',day:actions.day(instant)}]}},{at:instant}).find(t=>t.id==='ledger').done)
const computedHook={},detailState={items:[],ready:true,cloudSync:{status:'synced'}},hooks={}
const detailScript=clean(source('pages/wishlist/detail.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1])
const detailDeps={ref,computed,state:detailState,useFeedbackPage:()=>1,...wish,AppFeedback:{},pageLayoutStyle:{},showDialog:async()=>({confirm:true}),showNotice(){},persistNow:()=>true,accountId:()=>currentUid,hydrateFromServer:async()=>{},uni:{navigateBack(){}},setInterval:()=>1,clearInterval(){}}
for(const name of ['onLoad','onShow','onHide','onUnload'])detailDeps[name]=fn=>{hooks[name]=fn}
const detail=new Function(...Object.keys(detailDeps),detailScript+';return {item,id,missingText}')(...Object.values(detailDeps))
hooks.onLoad({id:'123'});check('detail reads route ID before resolving data',detail.id.value==='123'&&detail.item.value===null)
detailState.items=[{id:123,name:'旧项目'}];check('late restore resolves numeric legacy ID reactively',detail.item.value?.name==='旧项目')
detailState.items=[];check('reactive detail disappears after actual deletion',detail.item.value===null)

// Execute the actual home countdown and goal delete handlers.
const homeDeps={state:store.state,AppFeedback:{},BottomTabs:{},AnimatedNumber:{},feedbackPageMixin:{},pageEntryMixin:{},...engine,
 todayActions:task.todayActions,CS:{ugc:()=>[]},isMembershipActive:()=>false,LocalDay:()=>actions.day(instant),hasValidFinance:()=>true,freedomResult:()=>({progress:20,months:10,date:new Date(instant+100*DAY)}),
 persistNow:()=>true,setInterval:()=>1,clearInterval(){},setTimeout:fn=>fn(),refreshActions:async()=>null,refreshFinance(){},...wish,
 uni:{navigateTo:o=>homeRoutes.push(o.url)}}
const homeRoutes=[]
const homeScript=clean(source('pages/index/index.vue').match(/<script>([\s\S]*?)<\/script>/)[1]).replace('export default','return')
const Home=new Function(...Object.keys(homeDeps),homeScript)(...Object.values(homeDeps))
const vm={...Home.data()}
for(const [key,get]of Object.entries(Home.computed))Object.defineProperty(vm,key,{get:()=>get.call(vm)})
for(const [key,fn]of Object.entries(Home.methods))vm[key]=fn.bind(vm)
Object.assign(store.state,{goalPlan:{id:'home-goal',name:'车子',assets:0,amount:12000,monthlyDeposit:1000,expectedMonths:12,rate:0,calculatedAt:instant},homeCountdown:'goal'})
check('published goal uses the large home countdown',vm.activeGoal&&vm.displayResult.months===12)
const fixedGoalDate=vm.displayResult.date.getTime()
vm.tick();const expectedGoalParts=engine.ReelCalendarParts(vm.displayResult.date);check('goal calendar and clock show the selected goal rather than FIRE', ['years','months','days','hours','minutes','seconds'].every(key=>vm[key]===expectedGoalParts[key]))
vm.goResult();check('home goal opens its own details',homeRoutes.at(-1)==='/pages/calculator/index?mode=goal&from=home')
vm.selectCountdown('fire');check('switching to FIRE keeps the goal and finances',!vm.activeGoal&&store.state.goalPlan.name==='车子'&&store.state.finance.assets===900)
vm.selectCountdown('goal');check('switching back does not push the saved goal deadline',vm.displayResult.date.getTime()===fixedGoalDate)
store.state.goalPlan.calculatedAt=Date.now()-400*DAY;vm.actionNow=Date.now()
check('estimated date alone never declares financial success',Home.computed.targetText.call(vm).includes('更新目标进度'))
const calcHooks={},calcRoutes=[],calcState={finance:{assets:900},goalPlan:{id:'protected',name:'车子'},goalDraft:{name:'车子'},freedomPlan:{deadline:777},exp:88}
let deletionConfirm=false,deletionCalls=0
const calcDeps={ref,reactive,computed,state:calcState,AppFeedback:{},AnimatedNumber:{},useFeedbackPage:()=>1,useSessionDraft:()=>({clear(){}}),
 refreshFinance(){},isMembershipActive:()=>false,showNotice(){},dismissFeedback(){},accountId:()=>currentUid,showDialog:async()=>({confirm:deletionConfirm}),
 deleteGoalPlan(){deletionCalls++;calcState.goalPlan=null;return true},...engine,hasValidFinance:()=>false,
 uni:{reLaunch:o=>calcRoutes.push(o.url)},onUnmounted(){},getCurrentPages:()=>[],setInterval:()=>1,clearInterval(){},setTimeout:fn=>fn()}
for(const name of ['onLoad','onShow','onHide','onUnload','onBackPress'])calcDeps[name]=fn=>{calcHooks[name]=fn}
const calcScript=clean(source('pages/calculator/index.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1])
const calc=new Function(...Object.keys(calcDeps),calcScript+';return {removeGoal}')(...Object.values(calcDeps))
await calc.removeGoal();check('cancel goal deletion leaves everything unchanged',deletionCalls===0&&calcState.goalPlan.id==='protected'&&calcRoutes.length===0)
deletionConfirm=true;await calc.removeGoal();check('confirmed deletion returns to home after save',deletionCalls===1&&calcRoutes.at(-1)==='/pages/index/index')
check('delete UI leaves FIRE, assets and EXP untouched',calcState.finance.assets===900&&calcState.freedomPlan.deadline===777&&calcState.exp===88)
check('wishlist list only exposes three tabs',source('pages/wishlist/index.vue').includes("tabs:[{id:'active',name:'进行中'},{id:'success',name:'挑战成功'},{id:'bought',name:'已购买'}]"))
check('list deletion cannot open detail through bubbling',source('pages/wishlist/index.vue').includes('@tap.stop="removeItem(item)"'))
check('goal-only delete button leaves FIRE calculator without delete',source('pages/calculator/index.vue').includes('v-if="mode===\'goal\' && state.goalPlan"'))
check('current release is 105',source('manifest.json').includes('"versionCode" : "105"'))
console.log(checks.length+' v104 feature checks passed')
