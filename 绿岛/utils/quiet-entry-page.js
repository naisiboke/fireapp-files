
import { refreshPageLayout } from './page-layout.js'
import { accountId, accountKey } from './account-cache.js'
import { dismissFeedback } from './feedback.js'
export function measureEntryTarget(page,selector){
 return new Promise(resolve=>{let done=false;const finish=rect=>{if(done)return;done=true;clearTimeout(timer);resolve(rect||null)};const timer=setTimeout(()=>finish(null),500)
 try{uni.createSelectorQuery().in(page).select(selector).boundingClientRect(finish).exec()}catch(error){finish(null)}})
}
export function returnFromEntryPage(fallback='/pages/tools/index'){
 try{
  if(getCurrentPages().length>1){uni.navigateBack({delta:1,fail:()=>uni.switchTab({url:fallback})});return}
 }catch(ignore){}
 uni.switchTab({url:fallback})
}
const sessions=new WeakMap()
function session(page){if(!sessions.has(page))sessions.set(page,{epoch:0,timers:[],uid:'',visible:false});return sessions.get(page)}
function stop(page){const r=session(page);r.epoch++;r.timers.forEach(clearTimeout);r.timers=[];page.entryFly=null;page.entryArrivingId='';page.entryEmptyLeaving=false;page.entryTip=''}
function later(page,fn,ms){const r=session(page),epoch=r.epoch;r.timers.push(setTimeout(()=>{if(r.visible&&epoch===r.epoch&&r.uid===accountId())fn()},ms))}
export const quietEntryPageMixin={
 data(){return{entryFly:null,entryArrivingId:'',entryEmptyLeaving:false,entryTip:'',entryVisible:false,pageStyle:{},entryNavigating:false,entryFocus:false,entryOwner:''}},
 onShow(){
  const r=session(this)
  if(r.uid&&r.uid!==accountId()){this.closeEntrySheet();if(this.resetEntryDraft)this.resetEntryDraft()}
  r.uid=accountId();r.visible=true;this.entryOwner=r.uid;this.entryVisible=true;this.refreshEntryLayout()
  this.$nextTick(()=>this.refreshEntryArrow())
 },
 onHide(){const r=session(this);r.visible=false;this.entryVisible=false;this.entryFocus=false;stop(this);this.closeEntrySheet()},
 onUnload(){session(this).visible=false;stop(this);sessions.delete(this)},
 beforeUnmount(){session(this).visible=false;stop(this);sessions.delete(this)},
 onResize(){if(this.entryFly){this.entryFly=null;this.entryArrivingId=''}this.refreshEntryLayout();this.$nextTick(()=>this.refreshEntryArrow())},
 onPageScroll(){this.refreshEntryArrow()},
 methods:{
  refreshEntryLayout(){
   refreshPageLayout()
   let info={};try{info=uni.getWindowInfo?uni.getWindowInfo():uni.getSystemInfoSync()}catch(ignore){}
   this.pageStyle={'--entry-height':(Number(info.windowHeight)||844)+'px','--entry-safe-bottom':Math.max(0,Number(info.safeAreaInsets?.bottom)||0)+'px'}
  },
  refreshEntryArrow(){if(this.entryVisible&&this.$refs.emptyGuide)this.$refs.emptyGuide.pointAt(this,'#quiet-entry-fab')},
  entryOperation(){return{epoch:session(this).epoch,uid:accountId()}},
  entryCanSave(operation){return (!operation||(operation.epoch===session(this).epoch&&operation.uid===accountId()))&&this.entryVisible&&!!accountId()&&uni.getStorageSync('fire_login_status')===true&&this.entryOwner===accountId()&&!['restoring','conflict','auth-required'].includes(this.state.cloudSync?.status)},
  entryIsFirst(kind){try{return uni.getStorageSync(accountKey('fire_first_entry_'+kind))!==true}catch(ignore){return false}},
  rememberEntry(kind){try{uni.setStorageSync(accountKey('fire_first_entry_'+kind),true)}catch(ignore){}},
  async animateEntry(id,selector,title,amount,first,origin,options={}){
   const r=session(this),epoch=r.epoch
   this.entryArrivingId=String(id);this.entryEmptyLeaving=options.leaving===undefined?first:options.leaving
   if(this.entryEmptyLeaving)later(this,()=>{this.entryEmptyLeaving=false},230)
   if(first){this.entryTip=options.tip||'第一条已添加';later(this,()=>{this.entryTip=''},2400)}
   if(typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){this.entryArrivingId='';this.entryEmptyLeaving=false;return}
   await this.$nextTick()
   await new Promise(resolve=>setTimeout(resolve,220))
   if(!r.visible||r.epoch!==epoch||r.uid!==accountId())return
   origin=await measureEntryTarget(this,'#quiet-entry-fab')||origin
   let target=await measureEntryTarget(this,selector)
   if(!r.visible||r.epoch!==epoch||r.uid!==accountId())return
   let info={};try{info=uni.getWindowInfo?uni.getWindowInfo():uni.getSystemInfoSync()}catch(ignore){}
   const height=Number(info.windowHeight)||844
   if(target&&(target.top<70||target.top+target.height>height-140)){
    let scrollTop=0
    try{scrollTop=await new Promise(resolve=>{let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(Number(value?.scrollTop)||0)};const timer=setTimeout(()=>finish(null),300);uni.createSelectorQuery().in(this).selectViewport().scrollOffset(finish).exec()})}catch(ignore){}
    const inset=Math.max(0,Number(info.statusBarHeight)||Number(info.safeAreaInsets?.top)||0)
    try{uni.pageScrollTo({scrollTop:Math.max(0,scrollTop+target.top-inset-74),duration:160})}catch(ignore){}
    await new Promise(resolve=>setTimeout(resolve,190))
    if(!r.visible||r.epoch!==epoch||r.uid!==accountId())return
    target=await measureEntryTarget(this,selector)
   }
   if(!r.visible||r.epoch!==epoch||r.uid!==accountId())return
   if(origin&&target&&target.width>0&&target.height>0){
    this.entryFly={title,amount,style:{left:target.left+'px',top:target.top+'px',width:target.width+'px',height:target.height+'px','--entry-dx':(origin.left+origin.width/2-target.left-target.width/2)+'px','--entry-dy':(origin.top+origin.height/2-target.top-target.height/2)+'px'}}
    later(this,()=>{this.entryFly=null;this.entryArrivingId=''},520)
   }else this.entryArrivingId=''
  },
  back(){
   if(dismissFeedback(this.feedbackOwnerId))return
   if(this.entryNavigating)return
   this.entryNavigating=true;returnFromEntryPage()
   setTimeout(()=>{this.entryNavigating=false},350)
  },
  handleEntryBack(event){
   if(event?.from==='navigateBack')return false
   this.back();return true
  },
 },
}
