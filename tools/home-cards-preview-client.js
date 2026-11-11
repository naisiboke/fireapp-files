import {todayActions} from '/task-model.js'
import * as Vue from '/vue.js'
import homeRender from '/render0.js'
import switchRender from '/render1.js'
import inboxRender from '/render2.js'
import * as engine from '/engine.js'
import * as wishlist from '/wishlist.js'
import {createDailyRefresh,openActionRoute} from '/actions.js'
import {openMessagePage} from '/navigation.js'
import {membershipText} from '/membership.js'
const bundles=__BUNDLES__;
const memory=new Map(),uid='test-user'
const notes=[],routes=[]
window.notes=notes;window.routes=routes
const state=Vue.reactive({ready:true,financeEntered:true,homeCountdown:'fire',finance:{assets:80000,retirementExpense:3000,monthlyDeposit:15000},ledger:[],items:[],profile:{},monthlyTargets:{},goalPlan:{name:'车子',assets:0,amount:100000,monthlyDeposit:500,rate:4,expectedMonths:50,calculatedAt:Date.now()},privacySettings:{guardianAnimation:false},cloudSync:{status:'pending',message:'本机保存等待云端确认'},actionRewards:{events:[{id:'actual-receipt',kind:'ledger',xp:5,at:Date.now()}]}})
const day=engine.LocalDay()
state.monthlyTargets[day.slice(0,7)]={expense:150000,income:1500000}
state.ledger=[{id:'expense-1',date:day,type:'expense',category:'food',cents:615000},{id:'income-1',date:day,type:'income',category:'salary',cents:1500000}]
state.items=[{id:'wish',name:'想买的耳机',amount:15000,days:7,created:Date.now()-8*86400000,status:'active'}]
window.state=state
const notificationsFactory=new Function('reactive','accountId','readAccountCache','writeAccountCache','wishlistDue','coolingEnd',__NOTIFICATION_SOURCE__+';return {notificationState,inbox,collectNotifications,readNotifications}')
const ns=notificationsFactory(Vue.reactive,()=>uid,(k,f,id)=>memory.has(id+k)?JSON.parse(memory.get(id+k)):f,(k,v,id)=>{memory.set(id+k,JSON.stringify(v));return true},wishlist.wishlistDue,wishlist.coolingEnd)
const blank={render(){return null}}
const components={AppFeedback:blank,LoadingSpinner:blank,BottomTabs:blank,SpotlightGuide:blank,AnimatedNumber:{props:['value'],render(){return Vue.h('text',String(this.value))}}}
const CS={ugc(){if(window.breakCache)throw Error('invalid cache');return []},hydrate:async()=>({ok:true})}
let vm
const uni={
 navigateTo(o){if(window.failNav){o.fail?.();o.complete?.();return}routes.push(o.url);if(o.url==='/pages/messages/index')show(Inbox,true);o.complete?.()},
 navigateBack(){show(Home)},switchTab(){show(Home)},getStorageSync:()=>true,hideTabBar(){},pageScrollTo(){},reLaunch(){},
}
const deps={...components,...engine,...wishlist,...ns,state,CS,uni,openMessagePage,openActionRoute,createDailyRefresh,accountId:()=>uid,actionDay:at=>new Date(at+8*3600000).toISOString().slice(0,10),todayActions,isMembershipActive:()=>false,hasValidFinance:()=>true,freedomResult:()=>({progress:8.9,months:50,date:new Date(2031,0,3)}),refreshActions:async()=>null,refreshFinance(){},hydrateFromServer:async()=>({loaded:true}),syncStateToServer:async()=>({synced:true}),persistNow:()=>true,showNotice:o=>notes.push(o.title),dismissFeedback:()=>false,feedbackPageMixin:{data(){return {feedbackOwnerId:1}},computed:{pageLayoutStyle(){return {'--fire-status-top':'24px','--fire-content-top':'92px','--fire-header-height':'80px'}}}},pageEntryMixin:{},spotlightHomeMixin:{}}
function component(index,render){const c=new Function(...Object.keys(deps),bundles[index].script)(...Object.values(deps));c.render=render;return c}
const Switch=component(1,switchRender);deps.CountdownSwitch=Switch
const Home=component(0,homeRender),Inbox=component(2,inboxRender)
const active=Vue.shallowRef(Home)
const app=Vue.createApp({render(){return Vue.h(active.value,{key:active.value===Home?'home':'inbox',ref:v=>vm=v})}})
app.mount('#app')
function show(c,callShow=false){active.value=c;Vue.nextTick(()=>{if(callShow)c.onShow.call(vm)})}
document.addEventListener('click',e=>{const button=e.target.closest('button');if(button)button.dispatchEvent(new Event('tap',{bubbles:true}))})
window.prepare=()=>{vm.tick();vm.collectMessages()}
window.membership=()=>membershipText({membership:{active:true,expiresAt:new Date(2030,10,12,12).getTime()}})
window.ready=true
