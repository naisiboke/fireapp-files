// Run in 绿岛: node scripts/check-asset-task.mjs
// Real engine and Vue page scripts with isolated state/storage/navigation mocks.
// No production account or cloud write is performed.
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const checks=[]
function check(name,value){assert.ok(value,name);checks.push(name)}
const engine=new Function(source('utils/engine.js').replace(/\bexport (const|function)/g,'$1')+
 '\nreturn {HeroDay,HeroComplete,SaveAssetRecord,LocalDay,HeroLevel};')()
const {HeroDay,HeroComplete,SaveAssetRecord,HeroLevel}=engine
const {commitAssetRecord}=new Function('SaveAssetRecord',source('utils/asset-action.js').replace(/^import .*$/gm,'').replace('export function','function')+'\nreturn {commitAssetRecord};')(SaveAssetRecord)
const day='2026-11-20'
function fresh(){const s={finance:{assets:15000},assetHistory:[],exp:0,hero:null};HeroDay(s,day);return s}
let s=fresh()
HeroComplete(s,'ledger',day)
const first=SaveAssetRecord(s,{amount:'15000',date:day},day)
check('valid current month save completes the selected asset task',first.rewarded&&s.hero.slots.find(x=>x.id==='assets').done)
check('asset action adds exactly 10 EXP',s.exp===20&&s.hero.log.filter(x=>x.id==='assets').length===1)
check('the ledger reward remains intact',s.hero.ledgerDone&&s.hero.log.some(x=>x.id==='ledger'))
const same=SaveAssetRecord(s,{amount:'15000',date:day},day)
check('same amount save does not issue duplicate EXP',!same.rewarded&&s.exp===20&&s.assetHistory.length===1)
const changed=SaveAssetRecord(s,{amount:'18000',date:day},day)
check('editing saved amount does not issue duplicate EXP',!changed.rewarded&&s.exp===20&&s.finance.assets===18000&&s.assetHistory.length===1)
s=fresh();s.assetHistory=[{id:'pre-fix-record',date:day,amount:15000,createdAt:1}]
const repair=SaveAssetRecord(s,{amount:'15000',date:day},day)
check('confirming an unchanged pre-fix record can complete the missing task',!repair.changed&&repair.rewarded&&s.exp===10&&s.assetHistory.length===1)
s=fresh()
check('earlier date in the current month qualifies',SaveAssetRecord(s,{amount:'16000',date:'2026-11-01'},day).rewarded)
s=fresh()
const historic=SaveAssetRecord(s,{amount:'10000',date:'2026-10-31'},day)
check('previous month record is saved without awarding this month task',historic&&!historic.rewarded&&s.exp===0&&!s.hero.slots[0].done)
s=fresh()
SaveAssetRecord(s,{amount:'15000',date:day},day)
SaveAssetRecord(s,{amount:'9000',date:'2026-10-01'},day)
check('backfill does not replace latest assets or duplicate rewards',s.finance.assets===15000&&s.exp===10)
s=fresh()
const zero=SaveAssetRecord(s,{amount:'0',date:day},day)
check('zero is a valid asset balance and can finish the task',zero.rewarded&&s.finance.assets===0&&s.exp===10)
for(const entry of [
 {amount:'',date:day},{amount:'-1',date:day},{amount:'abc',date:day},
 {amount:'1.234',date:day},{amount:'1000000001',date:day},
 {amount:'10',date:'2026-11-21'},{amount:'10',date:'2026-11-00'},
 {amount:'10',date:'2026-02-30'},{amount:'10',date:'bad-date'},
 {id:'missing-record',amount:'10',date:day},
]){
 const invalid=fresh(),before=JSON.stringify(invalid)
 check('invalid save has no record or reward: '+JSON.stringify(entry),SaveAssetRecord(invalid,entry,day)===null&&JSON.stringify(invalid)===before)
}
s=fresh();s.hero.slots=[{id:'savings',done:false},{id:'read',done:false}]
const absent=SaveAssetRecord(s,{amount:'100',date:day},day)
check('asset save does not complete a different selected task',absent&&!absent.rewarded&&s.exp===0&&s.hero.slots.every(x=>!x.done))
s=fresh();s.assetHistory=[{id:'move-date',date:'2026-10-31',amount:100,createdAt:1}]
const moved=SaveAssetRecord(s,{id:'move-date',amount:'100',date:day},day)
check('same amount with edited date updates the actual record before rewarding',moved.changed&&moved.rewarded&&s.assetHistory[0].date===day)
function component(path,deps){
 const script=source(path).match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm,'').replace('export default','return')
 return new Function(...Object.keys(deps),script)(...Object.values(deps))
}
function assetPage(state,clock,saveWorks=true){
 const snapshots=[],notices=[],shows=[],routes=[]
 const deps={AppFeedback:{},useFeedbackPage:()=>1,showNotice:value=>notices.push(value),
  ref:value=>({value}),computed:get=>({get value(){return get()}}),onShow:fn=>shows.push(fn),
    state,persistNow:()=>{if(!saveWorks)return false;snapshots.push(JSON.parse(JSON.stringify(state)));return true},
  LocalDay:()=>clock.day,commitAssetRecord,useSessionDraft:()=>({clear(){}}),
  uni:{switchTab(options){routes.push(options.url);options.success?.()}},
 }
 const code=source('pages/assets/index.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm,'')
 const page=new Function(...Object.keys(deps),code+'\nreturn {today,date,amount,save};')(...Object.values(deps))
 return {page,snapshots,notices,routes,show:()=>shows.forEach(fn=>fn())}
}
s=fresh();HeroComplete(s,'ledger',day)
const clock={day},fixture=assetPage(s,clock)
fixture.page.amount.value='15000';fixture.page.save()
check('asset page persists the record and cloud reward proof together',fixture.snapshots.length===1&&fixture.snapshots[0].assetHistory[0].rewardVersion===1&&fixture.snapshots[0].exp===10)
check('asset page waits for server-confirmed rewards',fixture.notices.at(-1).title.includes('云端确认'))
const taskModule=new Function(source('utils/action-tasks.js').replace(/\bexport (const|function)/g,'$1')+';return {todayActions,ACTION_RULES}')()
s.actionRewards={events:[{kind:'ledger',day},{kind:'assets',day}],counters:{}}
const cards=taskModule.todayActions(s,{member:false,at:Date.parse(day+'T12:00:00Z')})
const Home=component('pages/index/index.vue',{state:s,AppFeedback:{},BottomTabs:{},AnimatedNumber:{},feedbackPageMixin:{},pageEntryMixin:{}})
const Hero=component('pages/hero/index.vue',{state:s,AppFeedback:{},feedbackPageMixin:{},HeroLevel,ACTION_RULES:taskModule.ACTION_RULES,uni:{navigateTo:options=>fixture.notices.push(options)}})
check('home count includes server confirmed assets and ledger',Home.computed.todayCount.call({todayTasks:cards})===2)
check('home shows server confirmed asset task as completed',Home.methods.taskDone.call({todayTasks:cards},'assets')===true)
check('hero page shows the same server confirmed task',Hero.methods.isDone.call({dailyTasks:cards},'assets')===true)
Hero.methods.complete.call({},'assets')
check('hero asset task opens the real asset record page',fixture.notices.at(-1).url==='/pages/assets/index')
const reloaded=JSON.parse(JSON.stringify(fixture.snapshots[0]))
HeroDay(reloaded,day)
check('reloading preserves cloud proof and prior ledger EXP',reloaded.assetHistory[0].rewardVersion===1&&reloaded.exp===10)
s=fresh()
const monthClock={day:'2026-11-30'}
HeroDay(s,monthClock.day)
const midnight=assetPage(s,monthClock)
monthClock.day='2026-12-01';midnight.page.amount.value='20000';midnight.page.save()
check('new client does not issue a local reward after midnight',s.assetHistory[0].rewardVersion===1&&s.exp===0)
check('untouched default date follows the new month at save',s.assetHistory[0].date==='2026-12-01')
const explicit=assetPage(fresh(),{day:'2026-11-30'})
explicit.page.date.value='2026-10-20';explicit.page.amount.value='12000';explicit.page.save()
check('manually chosen historical date remains historical',explicit.snapshots[0].assetHistory[0].date==='2026-10-20'&&explicit.snapshots[0].exp===0)
const visibleClock={day:'2026-11-30'},visible=assetPage(fresh(),visibleClock)
visibleClock.day='2026-12-01';visible.show()
check('reopening the page refreshes its default date and picker limit',visible.page.today.value==='2026-12-01'&&visible.page.date.value==='2026-12-01')
check('successful local commit returns to the home tab',fixture.routes[0]==='/pages/index/index')
s=fresh()
const failed=assetPage(s,{day},false),beforeFailure=JSON.stringify(s)
failed.page.amount.value='12345';failed.page.save()
check('storage failure rolls back assets, tasks and EXP together',JSON.stringify(s)===beforeFailure)
check('storage failure keeps input and does not navigate',failed.page.amount.value==='12345'&&failed.routes.length===0)
s=fresh();HeroComplete(s,'assets',day);s.hero.slots[0].done=false
check('a stale done flag is repaired without another reward',!SaveAssetRecord(s,{amount:'15000',date:day},day).rewarded&&s.exp===10&&s.hero.slots[0].done)
s=fresh();s.hero.day='2026-12-20'
check('correcting a future device date cannot lock current asset task',SaveAssetRecord(s,{amount:'100',date:day},day).rewarded&&s.hero.day===day)
console.log(checks.length+' asset-task checks passed')
