import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {tabRect,flowRect,sampleMotion,createTabRouter,TAB_PATHS} from '../utils/tab-motion-core.js'
let checks=0
const check=(ok,label)=>{assert.ok(ok,label);checks++}
for(const width of [360,390,430,844]){
 for(const [a,b] of [[0,1],[0,3],[3,0],[2,1]]){
  const from=tabRect(a,width),to=tabRect(b,width)
  assert.deepEqual(flowRect(from,to,0),from);assert.deepEqual(flowRect(from,to,1),to);checks+=2
  const mid=flowRect(from,to,.38)
  check(mid.width>from.width,'body stretches in either direction')
  check(mid.height<from.height,'body flattens')
  const leftProgress=(mid.left-from.left)/(to.left-from.left)
  const rightProgress=(mid.left+mid.width-from.left-from.width)/(to.left+to.width-from.left-from.width)
  check(b>a?rightProgress>leftProgress:leftProgress>rightProgress,'leading edge precedes trailing edge')
  for(let i=0;i<=400;i++){
   const r=flowRect(from,to,i/400)
   check(Object.values(r).every(Number.isFinite)&&r.width>0&&r.left>=0&&r.left+r.width<=width,'finite capsule remains inside bar')
  }
  const motion={started:1000,from,to}
  const interrupted=sampleMotion(motion,1140,from)
  assert.deepEqual(flowRect(interrupted,from,0),interrupted);checks++
 }
}
const calls=[],arrivals=[],failures=[],timers=new Set()
const router=createTabRouter({
 navigate:(path,success,fail)=>calls.push({path,success,fail}),
 onArrival:p=>arrivals.push(p),onFailure:p=>failures.push(p),
 schedule:fn=>{timers.add(fn);return fn},cancel:fn=>timers.delete(fn),
})
const [home,tools,community,profile]=TAB_PATHS
router.sync(home);router.request(tools);router.request(community);router.request(profile)
check(calls.length===1,'one native call at a time')
calls[0].success()
check(calls.length===2&&calls[1].path===profile,'intermediate queued intent replaced')
calls[1].success()
check(router.snapshot().actual===profile&&router.snapshot().desired===profile,'last click settles')
router.request(tools);router.request(profile);calls[2].success();calls[3].success()
check(router.snapshot().actual===profile,'return to current page during pending route is honored')
router.request(community);calls[4].fail(new Error('cancel'))
check(router.snapshot().actual===profile&&router.snapshot().desired===profile&&failures.at(-1)===profile,'failure rolls selection back')
calls[4].success()
check(router.snapshot().actual===profile,'stale success ignored')
router.request(home);router.request(tools);calls[5].fail(new Error('cancel'))
check(calls[6].path===tools,'failed obsolete call continues latest intent')
calls[6].success()
router.request(home);[...timers][0]()
check(router.snapshot().desired===tools&&!router.snapshot().pending,'timeout releases navigation')
router.request(tools)
check(calls.length===8,'same tab does not call native route')
router.dispose();check(timers.size===0,'timers cleaned')
for(const page of ['index','tools','community','profile']){
 const source=readFileSync(new URL('../pages/'+page+'/index.vue',import.meta.url),'utf8')
 check(source.includes('class="fire-tab-content"'),'content-only wrapper on '+page)
 const end=source.indexOf('<script'),footer=source.indexOf('<BottomTabs')
 check(footer>0&&footer<end,'footer remains in page')
 check(!/page-entry-reset\{animation:none;opacity:0/.test(source),'root never hides footer')
}
console.log('Fluid tab geometry, interrupted routing and source regressions: '+checks+' checks passed')
