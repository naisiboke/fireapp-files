import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GUIDE_KEY,guideKey,guideCompleted,completeGuide,needsGuide,requestGuideReplay,consumeGuideRequest,migrateLegacyGuide,clearGuideSession,spotlightLayout } from '../utils/spotlight-guide.js'
const checks=[]
function check(name,value){assert.ok(value,name);checks.push(name)}
function fixture(){const data=new Map();return{data,getStorageSync:k=>data.get(k)??'',setStorageSync:(k,v)=>data.set(k,v)}}
clearGuideSession()
let storage=fixture()
storage.data.set('financial-records',{assets:15000,exp:8})
check('signed out does not qualify for the tour',!needsGuide(storage,''))
check('new account qualifies',needsGuide(storage,'A'))
completeGuide(storage,'A','completed')
check('completed account does not repeat',!needsGuide(storage,'A'))
check('another account is independent',needsGuide(storage,'B'))
check('key separates escaped account IDs',guideKey('a:b')!==guideKey('a%3Ab'))
requestGuideReplay('A')
check('manual replay can reopen a completed guide',needsGuide(storage,'A'))
consumeGuideRequest('A')
check('request consumption never deletes completion',!needsGuide(storage,'A'))
check('replay and completion never edit financial records',storage.data.get('financial-records').assets===15000&&storage.data.get('financial-records').exp===8)
check('no business keys were introduced',[...storage.data.keys()].every(k=>k==='financial-records'||k.startsWith(GUIDE_KEY)))
clearGuideSession();storage=fixture();storage.data.set('fire_app_guide_done',true)
check('unknown legacy owner is never assigned to a new user',!migrateLegacyGuide(storage,''))
check('known legacy owner migrates',migrateLegacyGuide(storage,'legacy-A'))
check('migration keeps ordinary updates quiet',guideCompleted(storage,'legacy-A'))
check('global legacy flag does not leak to a second account',!migrateLegacyGuide(storage,'new-B')&&needsGuide(storage,'new-B'))
clearGuideSession()
const full={getStorageSync:()=>'',setStorageSync(){throw Error('storage full')}}
check('storage failure is nonfatal',completeGuide(full,'offline-user','skipped')===false)
check('failed completion write is remembered for this session',guideCompleted(full,'offline-user'))
clearGuideSession()
check('explicit memory reset permits a fresh installation',needsGuide(full,'offline-user'))
for(const view of [{width:390,height:844,top:47,bottom:34},{width:360,height:640,top:24,bottom:0},{width:430,height:932,top:59,bottom:34},{width:844,height:390,top:24,bottom:20}]){
 const targets=[{left:view.width/2+34,top:view.height-view.bottom-132,width:48,height:48},{left:16,top:160,width:view.width-32,height:44},{left:view.width/5,top:view.height-view.bottom-62,width:70,height:44}]
 for(let step=0;step<targets.length;step++)for(const textHeight of [158,260]){
  const result=spotlightLayout(targets[step],{...view,preferBelow:step===1},textHeight,step===0)
  check('layout exists '+view.width+'x'+view.height+' step '+step+' text '+textHeight,!!result)
  const h=result.hole,b=result.bubble,bh=Math.min(Math.max(124,textHeight),b.maxHeight)
  check('hole stays within safe viewport',h.left>=0&&h.top>=view.top&&h.left+h.width<=view.width&&h.top+h.height<=view.height-view.bottom)
  check('bubble stays on screen',b.left>=16&&b.left+b.width<=view.width-16&&b.top>=view.top+60&&b.top+bh<=view.height-view.bottom)
  check('tooltip does not cover the highlighted control',b.placement==='above'?b.top+bh<=h.top-10:b.top>=h.top+h.height+10)
  check('arrow stays away from rounded corners',b.arrow>=20&&b.arrow<=b.width-20)
 }
}
check('missing target is rejected',spotlightLayout(null,{width:390,height:844})===null)
check('zero-size target is rejected',spotlightLayout({left:0,top:0,width:0,height:0},{width:390,height:844})===null)
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
function options(path,deps={}){const script=source(path).match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/gm,'').replace('export default','return');return new Function(...Object.keys(deps),script)(...Object.values(deps))}
for(const logged of [true,false]){
 const routes=[],page=options('pages/launch/index.vue',{AppFeedback:{},feedbackPageMixin:{},uni:{getStorageSync:k=>k==='fire_island_onboarding_done'?true:k==='fire_login_status'?logged:false,removeStorageSync(){},reLaunch:o=>routes.push(o.url)},showDialog(){}})
 const vm={redirecting:false};page.methods.routeByState.call(vm)
 check('launch bypasses the retired five-page guide '+logged,routes[0]===(logged?'/pages/index/index':'/pages/login/login'))
}
const routes=[],requests=[]
const guide=options('pages/guide/index.vue',{pageLayoutStyle:{},accountId:()=> 'A',requestGuideReplay:uid=>requests.push(uid),safeReturnRoute:v=>v||'/pages/index/index',uni:{getStorageSync:()=>true,reLaunch:o=>routes.push(o.url)}})
guide.onLoad({next:'/pages/ledger/edit?id=kept'})
check('legacy guide entry preserves a recovery destination',routes[0]==='/pages/ledger/edit?id=kept'&&requests.length===0)
guide.onLoad({})
check('legacy guide entry reaches the new home guide',routes.at(-1)==='/pages/index/index'&&requests[0]==='A')
clearGuideSession()
console.log(checks.length+' spotlight ownership, routing and layout checks passed')
