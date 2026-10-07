// Run from the project root: node scripts/check-finance.mjs
// Exercises actual calculation/store/page handlers with mocked UniApp storage.
// This is not a substitute for H5/App UI and keyboard testing.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const clean = s => s.replace(/^import .+$/gm, '').replace(/\bexport (const|function)/g, '$1')
const engine = new Function(clean(source('utils/engine.js')) + '\nreturn {FireEngine,GoalEngine,SavingsProjection,ReelParts,ReelCalendarParts,HeroDay,LedgerSummary,addCalendarMonths};')()
const helpers = new Function('FireEngine', clean(source('utils/finance-plan.js')) + '\nreturn {validateFireForm,validateGoalForm,hasValidFinance,financeSignature,createFreedomPlan,freedomResult};')(engine.FireEngine)
const results = []
const check = (name, condition) => { assert.ok(condition, name); results.push(name) }
const fire = {assets:0,monthlyDeposit:1000,retirementExpense:1000,rate:0,withdrawal:4}
const expected = engine.FireEngine(fire, new Date('2026-01-31T12:00:00'))
check('zero-rate FIRE target and duration', expected.target === 300000 && expected.months === 300)
check('month-end clamp', engine.addCalendarMonths(new Date('2026-01-31T12:00:00'),1).getDate() === 28)
const goal = {name:'旅行',assets:20000,amount:100000,monthlyDeposit:2000,expectedMonths:24,rate:0,calculatedAt:Date.parse('2026-01-01T12:00:00')}
const projected = engine.GoalEngine(goal)
check('goal duration and required deposit', projected.months === 40 && Math.abs(projected.requiredMonthly - 80000 / 24) < 1e-8 && projected.projectedAtExpected === 68000)
check('blank required fields', helpers.validateFireForm({}).errors.length === 5)
check('invalid assets', helpers.validateFireForm({...fire,assets:'abc'}).errors.length === 1)
check('negative assets', helpers.validateFireForm({...fire,assets:-1}).errors.length === 1)
check('negative annual rate allowed', helpers.validateFireForm({...fire,rate:-5}).errors.length === 0)
check('passive income optional', helpers.validateFireForm(fire).errors.length === 0)
check('zero retirement expense rejected', helpers.validateFireForm({...fire,retirementExpense:0}).errors.length === 1)
check('fractional goal months rejected', helpers.validateGoalForm({...goal,expectedMonths:1.5}).errors.length === 1)
check('unconfigured state has no date', helpers.freedomResult({financeEntered:false,finance:fire}).date === null)
check('invalid zero target cannot claim success', engine.SavingsProjection(0,0,0,0).months === null)
check('unreachable goal handled', engine.FireEngine({...fire,monthlyDeposit:0}).months === null)
check('already reached target', engine.FireEngine({...fire,assets:300000}).months === 0)

const db = {}, timers = new Map(), hooks = {}
const documentMock = {hidden:false,listeners:new Map(),addEventListener(name,cb){this.listeners.set(name,cb)},removeEventListener(name){this.listeners.delete(name)}}
const windowMock = {listeners:new Map(),addEventListener(name,cb){this.listeners.set(name,cb)},removeEventListener(name){this.listeners.delete(name)}}
let currentTime = Date.now()
class ClockDate extends Date { static now(){return currentTime} }
let nextId = 0, writeFail = false
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const uni = {
  getStorageSync:key => copy(db[key]),
  setStorageSync:(key,value) => { if(writeFail) throw Error('storage full'); db[key] = copy(value) },
  showToast:()=>{},reLaunch:()=>{},navigateBack:()=>{},
}
const storage = {
  get:(key,fallback=null) => db['fire_forge_'+key] === undefined ? fallback : typeof db['fire_forge_'+key] === 'string' ? JSON.parse(db['fire_forge_'+key]) : copy(db['fire_forge_'+key]),
  set:(key,value) => { if(writeFail) return false; db['fire_forge_'+key] = JSON.stringify(value); return true },
}
const storeEnv = {
  reactive:v=>v,toRaw:v=>v,storage,uni,...engine,...helpers,
  setTimeout:(callback,delay)=>{timers.set(++nextId,{callback,delay});return nextId},
  clearTimeout:key=>timers.delete(key),
}
const store = new Function(...Object.keys(storeEnv), clean(source('store/index.js')) + '\nreturn {state,bootstrap,persist,persistNow,refreshFinance,reset};')(...Object.values(storeEnv))
store.bootstrap()
check('new install has no demo data', store.state.finance.assets === 0 && store.state.financeEntered === false && !db.fire_forge_state)
function makePage() {
  const env = {
    ...engine,...helpers,...store,
    reactive:v=>v,ref:v=>({value:v}),computed:callback=>({get value(){return callback()}}),
    uni,document:documentMock,window:windowMock,Date:ClockDate,setInterval:callback=>{timers.set(++nextId,{callback,interval:true});return nextId},
    clearInterval:key=>timers.delete(key),
    getCurrentPages:()=>[{route:'pages/tools/index'},{route:'pages/calculator/index'}],
  }
  for(const name of ['onLoad','onShow','onHide','onUnload','onUnmounted','onBackPress']) env[name]=callback=>{hooks[name]=callback}
  const code = source('pages/calculator/index.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1].replace(/^import .+$/gm,'')
  return new Function(...Object.keys(env),code+'\nreturn {fire,goal,mode,errors,fireResult,goalResult,calculate,publishGoal,coverage,cleanup,totalDays,countdownUnits};')(...Object.values(env))
}
let page = makePage()
hooks.onLoad({})
check('empty form and no result', page.fire.assets === '' && page.fire.rate === '' && page.fireResult.value === null)
page.calculate()
check('validation messages block saving', page.errors.value.length === 4 && !db.fire_forge_state)
const existing = {
  ledger:[{id:'l',date:'2026-10-07',cents:100}],items:[{id:'i',status:'active',amount:120}],
  assetHistory:[{id:'a',amount:400}],reading:{shelf:['x'],history:[{id:1}]},completed:['t'],exp:150,
  monthlyTargets:{'2026-10':{expense:100}},toolUsage:{hero:{clicks:2}},customField:{value:'keep'},
}
Object.assign(store.state,copy(existing))
db.firelife_favorites_v1=['fav']; db.firelife_ugc_v1=[{id:'ugc'}]
Object.assign(page.fire,{assets:'0',monthlyDeposit:'1000',retirementExpense:'1000',rate:'0',withdrawal:'4',passive:'200'})
page.calculate()
check('submit saves real finance synchronously', store.state.financeEntered && page.fireResult.value.months === 300 && !!db.fire_forge_state)
const initialDeadline = store.state.freedomPlan.deadline
check('other state fields retained', Object.keys(existing).every(key=>JSON.stringify(store.state[key])===JSON.stringify(existing[key])))
check('community storage untouched', db.firelife_favorites_v1[0] === 'fav' && db.firelife_ugc_v1[0].id === 'ugc')
check('coverage diagnosis', page.coverage.value === 20)
store.state.finance.assets = 987
store.refreshFinance()
check('homepage refresh reads finance', store.state.finance.assets === 0 && store.state.freedomPlan.deadline === initialDeadline)
page = makePage(); hooks.onLoad({})
check('reopen restores input and fixed date', page.fire.monthlyDeposit === '1000' && page.fire.passive === '200' && page.fireResult.value.date.getTime() === initialDeadline)
page.fire.assets = '1000'; page.calculate()
check('editing recalculates', store.state.finance.assets === 1000 && page.fireResult.value.months === 299)
page.mode.value = 'goal'
Object.assign(page.goal,{name:'车子',assets:'20000',amount:'100000',monthlyDeposit:'2000',expectedMonths:'24',rate:'0'})
const beforeFinance = JSON.stringify(store.state.finance)
page.calculate()
check('goal calculation is draft only', !!store.state.goalDraft && store.state.goalPlan === null && page.goalResult.value.months === 40)
check('goal leaves FIRE finance intact', JSON.stringify(store.state.finance) === beforeFinance)
page.publishGoal()
check('explicit confirmation activates home goal', store.state.goalPlan.name === '车子')
page = makePage(); hooks.onLoad({mode:'goal'})
check('goal reopens with stable date', page.goal.name === '车子' && page.goalResult.value.date.getTime() === engine.GoalEngine(store.state.goalPlan).date.getTime())
page.mode.value = 'fire'
writeFail=true
const before = JSON.stringify(store.state.finance)
page.fire.assets='999'; page.calculate()
check('storage failure rolls back and shows error', JSON.stringify(store.state.finance)===before && page.errors.value[0].includes('保存失败'))
writeFail=false
hooks.onShow()
check('one interval on show', [...timers.values()].filter(t=>t.interval).length===1)
hooks.onShow()
check('duplicate show does not accumulate intervals', [...timers.values()].filter(t=>t.interval).length===1)
documentMock.hidden=true
documentMock.listeners.get('visibilitychange')()
check('hidden H5 tab clears timer', [...timers.values()].filter(t=>t.interval).length===0)
currentTime += 86400000
documentMock.hidden=false
documentMock.listeners.get('visibilitychange')()
check('visible H5 tab restarts timer with current time', [...timers.values()].filter(t=>t.interval).length===1)
const priorParts=page.countdownUnits.value.map(x=>({id:x.id,value:x.value}))
currentTime+=1000
;[...timers.values()].find(t=>t.interval).callback()
check('one second only changes clock numbers that changed', page.countdownUnits.value[0].value===priorParts[0].value && page.countdownUnits.value[5].value!==priorParts[5].value)
currentTime+=7200000
windowMock.listeners.get('pageshow')()
check('pageshow immediately refreshes real time', [...timers.values()].filter(t=>t.interval).length===1)
hooks.onHide()
check('background clears timer', [...timers.values()].filter(t=>t.interval).length===0)
hooks.onShow()
check('return restarts one timer', [...timers.values()].filter(t=>t.interval).length===1)
page.cleanup()
check('destroy clears timer', [...timers.values()].filter(t=>t.interval).length===0)
check('destroy removes H5 listeners', documentMock.listeners.size===0 && windowMock.listeners.size===0)
store.bootstrap()
check('restart preserves finance and records', store.state.finance.assets===1000 && store.state.goalPlan.name==='车子' && store.state.ledger[0].id==='l' && store.state.reading.shelf[0]==='x')
db.fire_forge_state=JSON.stringify({finance:{assets:500,expense:1000,income:3000,rate:0,withdrawal:4},...existing})
store.bootstrap()
check('legacy field migration preserves records', store.state.financeEntered && store.state.finance.monthlyDeposit===2000 && store.state.finance.retirementExpense===1000 && store.state.customField.value==='keep')
const oldFinance={assets:500,expense:1000,income:3000,rate:0,withdrawal:4}
const legacyDeadline=Date.parse('2040-02-03T12:00:00')
db.fire_forge_state=JSON.stringify({...existing,finance:oldFinance,financeEntered:true,freedomPlan:{signature:JSON.stringify(oldFinance),deadline:legacyDeadline}})
store.bootstrap()
check('legacy saved deadline remains unchanged', store.state.freedomPlan.deadline===legacyDeadline)
const deadline = store.state.freedomPlan.deadline
store.bootstrap()
check('restarts never push freedom date forward', store.state.freedomPlan.deadline===deadline)

const pages = JSON.parse(source('pages.json')).pages
check('calculator registered exactly once', pages.filter(p=>p.path==='pages/calculator/index').length===1)
const tools = source('pages/tools/index.vue')
check('calculator pinned first', tools.indexOf("{ route: 'calculator'") < tools.indexOf("{ route: 'ledger'") && tools.includes("a.tool.route === 'calculator'"))
check('home has editable finance entry', source('pages/index/index.vue').includes("uni.navigateTo({ url: '/pages/calculator/index' })"))
console.log(results.length + ' finance checks passed')
