import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {openActionRoute,createDailyRefresh} from '../utils/action-navigation.js'
import {actionDay,todayActions} from '../utils/action-tasks.js'
const root=new URL('../../',import.meta.url)
const read=path=>readFileSync(new URL(path,root),'utf8')
let count=0
function check(ok,message){assert.ok(ok,message);count++}
function isolated(path,names,deps={}){
 const source=read(path).replace(/^import .*$/gm,'').replace(/^export /gm,'')
 return new Function(...Object.keys(deps),source+';return {'+names.join(',')+'}')( ...Object.values(deps))
}
const calls=[],api={switchTab:x=>calls.push(['tab',x]),navigateTo:x=>calls.push(['page',x])}
const fail=()=>{}
check(openActionRoute('/pages/community/index',api,fail)&&calls.at(-1)[0]==='tab','community task uses tab navigation')
check(openActionRoute('/pages/calculator/index?mode=goal',api,fail)&&calls.at(-1)[0]==='page'&&calls.at(-1)[1].url.includes('?mode=goal'),'detail task keeps query and ordinary navigation')
check(calls.at(-1)[1].fail===fail&&!openActionRoute('https://bad.example',api,fail),'route errors report failure, arbitrary URLs refused')
let now=Date.UTC(2026,10,8,15,59),hits=0,resolveRefresh
const refresh=createDailyRefresh({day:actionDay,now:()=>now,refresh:()=>{hits++;return Promise.resolve({events:[]})}})
await Promise.all([refresh('a'),refresh('a')]);check(hits===1,'same date refresh single flight')
await refresh('a');check(hits===1,'successful day is not repeatedly fetched')
now+=120000;await refresh('a');check(hits===2,'UTC+8 midnight triggers one new refresh')
await refresh('b');check(hits===3,'another account has independent daily refresh')
await refresh('a',now,true);check(hits===4,'foreground explicitly reconciles server receipts')
const state={actionRewards:{events:[{kind:'ledger',day:actionDay(now-86400000)},{kind:'favorite',day:actionDay(now-86400000)}],counters:{}},goalPlan:null}
check(todayActions(state,{at:now}).every(t=>!t.done),'old day completion does not carry forward')
let failedHits=0
const failing=createDailyRefresh({day:actionDay,now:()=>now,refresh:async()=>{failedHits++;throw Error('offline')}})
await failing('a').catch(()=>{});await failing('a');check(failedHits===1,'offline day refresh is rate limited')
now+=31000;await failing('a').catch(()=>{});check(failedHits===2,'failed refresh can retry without a relaunch')

let uid='a',clock=Date.UTC(2026,10,8,4),requests=0,remoteResolve
const rows=new Map(),clone=x=>JSON.parse(JSON.stringify(x))
const {createFeedCache}=isolated('绿岛/utils/community-feed.js',['createFeedCache'],{accountId:()=>uid,readAccountCache:()=>null,writeAccountCache:()=>true,fetchCommunityPosts:()=>{}})
const cache=createFeedCache({owner:()=>uid,read:(tab,id)=>rows.get(id+':'+tab),write:(tab,value,id)=>rows.set(id+':'+tab,value),now:()=>clock,fetchPage:async tab=>{requests++;return {items:[{id:tab,journey:tab,status:'approved'}],nextCursor:null,stats:{doing:1,settled:1}}}})
await cache.get('doing');await cache.get('doing');check(requests===1&&cache.peek('doing').items[0].id==='doing','fresh community cache is reused')
await cache.get('settled');check(requests===2,'categories have independent caches')
clock+=61000;await cache.get('doing');check(requests===3,'stale feed refreshes')
await cache.get('doing',{force:true});check(requests===4,'pull to refresh bypasses TTL')
cache.apply({id:'doing',journey:'doing',status:'approved',title:'updated'});check(cache.peek('doing').items[0].title==='updated'&&cache.peek('doing').at===0,'edit patches cached post and invalidates age')
cache.apply({id:'doing'},true);check(!cache.peek('doing').items.length,'delete removes cached post')
const inFlight=createFeedCache({owner:()=>uid,read:(tab,id)=>rows.get('race:'+id+tab),write:(tab,value,id)=>rows.set('race:'+id+tab,value),fetchPage:()=>{requests++;return new Promise(resolve=>{remoteResolve=resolve})}})
const one=inFlight.get('doing'),two=inFlight.get('doing');remoteResolve({items:[{id:'x'}]});await Promise.all([one,two]);check(requests===5,'duplicate entry fetches only once')
inFlight.invalidate()
const switching=inFlight.get('doing');uid='b';remoteResolve({items:[{id:'private-a'}]});check(await switching===null&&!inFlight.peek('doing'),'old account response cannot populate current account')
uid='a';const invalidated=inFlight.get('doing');inFlight.invalidate();remoteResolve({items:[{id:'deleted'}]});check(await invalidated===null,'stale in-flight response cannot undo a mutation')
const old=cache.peek('settled')
const offline=createFeedCache({owner:()=>uid,read:(tab,id)=>rows.get(id+':'+tab),write:(tab,v,id)=>rows.set(id+':'+tab,v),fetchPage:async()=>{throw Error('offline')}})
await offline.get('settled',{force:true}).catch(()=>{});check(offline.peek('settled')===old,'network failure preserves existing feed')

const {wishlistDue,coolingEnd}=await import('../utils/wishlist.js')
const accountStore=new Map();let canWrite=true
const {notificationCandidates,collectNotifications,inbox,readNotifications}=isolated('绿岛/utils/notifications.js',['notificationCandidates','collectNotifications','inbox','readNotifications'],{
 reactive:x=>x,accountId:()=>uid,readAccountCache:(key,fallback,id)=>accountStore.get(id+key)||fallback,
 writeAccountCache:(key,value,id)=>{if(!canWrite)return false;accountStore.set(id+key,clone(value));return true},wishlistDue,coolingEnd,
})
const source={items:[{id:'wish',name:'耳机',created:clock-8*86400000,days:7,status:'active'}],posts:[{id:'post',title:'经历',status:'approved',reviewedAt:clock}],rewards:{events:[{id:'receipt',xp:5,kind:'ledger',at:clock}]},release:{versionCode:106,versionName:'1.0.6',published:true},installed:105}
const candidates=notificationCandidates(source,clock)
check(candidates.length===4&&new Set(candidates.map(x=>x.kind)).size===4,'four real reminder sources recognized')
collectNotifications(source,uid,clock);check(inbox().length===4,'real sources are persisted')
check(readNotifications(null)&&inbox().every(x=>x.read),'all read state saved')
collectNotifications(source,uid,clock+1000);check(inbox().length===4&&inbox().every(x=>x.read),'recollecting source does not duplicate or reset read state')
uid='b';check(inbox().length===0,'message list isolated by account')
uid='a';check(inbox().length===4,'switching back restores that account messages')
canWrite=false;check(!readNotifications(null),'read state failure is reported')
canWrite=true
check(notificationCandidates({release:{published:false,versionCode:999},installed:105},clock).length===0,'unpublished update never creates reminder')
check(notificationCandidates({posts:[{id:'x',status:'approved',localOnly:true,reviewedAt:clock}]},clock).length===0,'unconfirmed local review never creates approval message')
check(notificationCandidates({items:[{id:'bought',created:1,days:3,status:'bought'}]},clock).length===0,'completed cooling challenge not due')

const switchSource=read('绿岛/components/CountdownSwitch.vue')
check(!switchSource.includes('countdown-switch-mark')&&switchSource.includes('height:28px'),'light text countdown switch has no dot')
const home=read('绿岛/pages/index/index.vue')
check(home.includes('openActionRoute(t.url,uni')&&home.includes('this.refreshDailyActions(false)'),'home wires real task navigation and midnight check')
const community=read('绿岛/pages/community/index.vue')
check(community.includes('if(t===this.tab')&&community.includes('onPullDownRefresh()'),'repeat category tap skipped and manual refresh available')
check(community.includes('v-if="publicLoading && !loadingMore && !feedLoaded && !visiblePosts.length"'),'background refresh never reserves loader space')
check(community.includes('fab-cross')&&!community.includes('<text class="fab-icon">'),'publish icon drawn with centered lines')
const settings=read('绿岛/pages/settings/index.vue'),profile=read('绿岛/pages/profile/index.vue')
check(!settings.split('<script>')[0].includes('row-icon')&&!profile.split('<script>')[0].includes('menu-icon')&&!profile.split('<script>')[0].includes('class="avatar"'),'profile and settings remove decorative icons')
check(settings.includes("panel==='data'")&&settings.includes("panel==='help'")&&!settings.includes('uni.clearStorageSync()'),'help and local data operations separated without clearing other accounts')
const html=read('index.html')
check((html.match(/id="about"/g)||[]).length===1&&html.includes('id="about" class="about-view')&&html.includes('hashchange'),'single-file website has independent About view')
console.log('Quiet navigation, cache, daily rollover and notifications: '+count+' checks passed')
