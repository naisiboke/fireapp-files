import { state } from '@/store/index.js'
import { accountId } from '@/utils/account-cache.js'
import { resolveStatusInset } from '@/utils/page-layout.js'
import { feedbackState, hasOpenFeedback, registerFeedbackOverlay } from '@/utils/feedback.js'
import { wishlistReminder, maybePromptWishlist } from '@/utils/wishlist-reminder.js'
import { needsGuide, consumeGuideRequest, completeGuide, spotlightLayout, validTarget } from '@/utils/spotlight-guide.js'

const sessions = new WeakMap()
function session(page) {
  if (!sessions.has(page)) sessions.set(page, { page:false, uid:'', requested:false, preparing:false, epoch:0, start:null, settle:null, unregister:null, suppressed:false })
  return sessions.get(page)
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
export function measureGuideTarget(context, selector) {
  return new Promise(resolve => {
    try { uni.createSelectorQuery().in(context).select(selector).boundingClientRect(rect => resolve(rect || null)).exec() }
    catch (error) { resolve(null) }
  })
}
function viewport() {
  let info = {}
  try { info = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync() } catch (ignore) {}
  const width = Number(info.windowWidth) || 390, height = Number(info.windowHeight) || 844
  const bottom = Number(info.safeAreaInsets?.bottom) || Math.max(0,height-(Number(info.safeArea?.bottom)||height))
  return { width, height, top:resolveStatusInset(info)||0, bottom:bottom>=0&&bottom<180?bottom:0 }
}
async function scrollTargetIntoView(page, rect, view) {
  if (rect.top >= view.top+70 && rect.top+rect.height <= view.height-view.bottom-10) return rect
  let top = 0
  try { top = await new Promise(resolve => { uni.createSelectorQuery().in(page).selectViewport().scrollOffset(value=>resolve(Number(value?.scrollTop)||0)).exec() }) } catch(ignore){}
  await new Promise(resolve=>{
    const timer=setTimeout(resolve,300)
    try { uni.pageScrollTo({scrollTop:Math.max(0,top+rect.top-(view.top+100)),duration:180,complete(){clearTimeout(timer);resolve()}}) }
    catch(error){clearTimeout(timer);resolve()}
  })
  await delay(32)
  return measureGuideTarget(page,'#fire-guide-finance')
}
function clearSession(r) {
  r.epoch++
  clearTimeout(r.start);clearTimeout(r.settle);r.start=null;r.settle=null;r.preparing=false
  if(r.unregister)r.unregister()
  r.unregister=null
}
export const spotlightHomeMixin = {
  data(){return{spotlightActive:false,spotlightVisible:false,spotlightStep:0,spotlightRect:null,spotlightViewport:{width:390,height:844,top:0,bottom:0},spotlightBusy:false,spotlightMenuOpen:false}},
  computed:{
    spotlightCanRun(){
      return this.pageVisible&&state.ready&&!this.pageEntryReset&&uni.getStorageSync('fire_login_status')===true&&!!accountId()
        &&feedbackState.owner===this.feedbackOwnerId&&!feedbackState.dialog&&!feedbackState.notice
        &&!(wishlistReminder.owner===this.feedbackOwnerId&&wishlistReminder.id)
        &&!['restoring','conflict','auth-required'].includes(state.cloudSync?.status)
    },
    spotlightTitle(){
      return this.spotlightStep===0?'记下第一笔收支':this.spotlightStep===1?(this.displayConfigured?'查看你的自由计划':'看看你的自由日'):'更多工具，在这里'
    },
    spotlightDescription(){
      return this.spotlightStep===0?'从这里记录收入和消费，慢慢理清钱的去向。':this.spotlightStep===1?(this.displayConfigured?'在这里查看自由日或储蓄目标的进度。':'填写财务资料，开始规划自己的自由生活。'):'极简拔草、人格测试和行为建议，都可以在这里找到。'
    },
  },
  watch:{
    spotlightCanRun(ready){if(ready)this.queueSpotlight();else this.pauseSpotlight()},
    displayConfigured(){if(this.spotlightActive&&this.spotlightStep===1)this.repositionSpotlight()},
  },
  onShow(){const r=session(this);r.page=true;r.suppressed=false;if(r.uid&&r.uid!==accountId()){r.requested=false;this.spotlightStep=0}this.queueSpotlight()},
  onHide(){session(this).page=false;this.pauseSpotlight()},
  onUnload(){session(this).page=false;this.pauseSpotlight();sessions.delete(this)},
  beforeUnmount(){const r=session(this);r.page=false;this.pauseSpotlight();sessions.delete(this)},
  onResize(){this.repositionSpotlight()},
  onPageScroll(){if(this.spotlightVisible&&!this.spotlightBusy)this.repositionSpotlight()},
  methods:{
    queueSpotlight(){
      const r=session(this),uid=accountId()
      if(!r.page||r.suppressed||r.start!==null||r.preparing||this.spotlightActive||!this.spotlightCanRun)return
      if(!(r.requested&&r.uid===uid)&&!needsGuide(uni,uid))return
      r.start=setTimeout(()=>{r.start=null;this.startSpotlight()},360)
    },
    async startSpotlight(){
      const r=session(this),uid=accountId()
      if(!r.page||!this.spotlightCanRun||hasOpenFeedback()||(!(r.requested&&r.uid===uid)&&!needsGuide(uni,uid)))return
      if(r.uid!==uid)this.spotlightStep=0
      r.uid=uid;r.requested=true;consumeGuideRequest(uid)
      this.spotlightActive=true
      r.unregister=registerFeedbackOverlay(this.feedbackOwnerId,()=>this.finishSpotlight('skipped'),true)
      try{if(uni.hideKeyboard)uni.hideKeyboard()}catch(ignore){}
      await this.prepareSpotlight(this.spotlightStep)
    },
    async prepareSpotlight(index){
      const r=session(this),epoch=++r.epoch,uid=r.uid
      clearTimeout(r.settle);r.settle=null;r.preparing=true;this.spotlightBusy=true
      const valid=()=>r.page&&r.epoch===epoch&&uid===accountId()&&this.spotlightCanRun&&this.spotlightActive
      const wasOpen=this.spotlightMenuOpen
      this.spotlightMenuOpen=index===0
      await this.$nextTick()
      if(index===0&&!wasOpen)await delay(270)
      if(!valid())return
      let view=viewport(),rect
      if(index===1){
        rect=await measureGuideTarget(this,'#fire-guide-finance')
        if(validTarget(rect)){rect=await scrollTargetIntoView(this,rect,view);view=viewport()}
      }else{
        const tabs=this.$refs.guideTabs
        rect=tabs&&tabs.measureGuideTarget?await tabs.measureGuideTarget(index===0?'ledger':'tools'):null
      }
      if(!valid())return
      if(!validTarget(rect)||!spotlightLayout(rect,{...view,preferBelow:index===1},158,index===0)){
        r.suppressed=true;this.pauseSpotlight();return
      }
      this.spotlightViewport=view;this.spotlightRect=rect;this.spotlightStep=index;this.spotlightVisible=true
      r.settle=setTimeout(()=>{r.settle=null;if(valid()){r.preparing=false;this.spotlightBusy=false}},420)
    },
    advanceSpotlight(){
      if(!this.spotlightActive||this.spotlightBusy)return
      if(this.spotlightStep===2){this.finishSpotlight('completed');return}
      this.prepareSpotlight(this.spotlightStep+1)
    },
    repositionSpotlight(){
      const r=session(this)
      if(r.page&&this.spotlightActive&&this.spotlightCanRun)this.prepareSpotlight(this.spotlightStep)
    },
    pauseSpotlight(){
      const r=session(this);clearSession(r)
      this.spotlightRect=null;this.spotlightVisible=false;this.spotlightActive=false;this.spotlightMenuOpen=false;this.spotlightBusy=false
    },
    finishSpotlight(reason){
      const r=session(this)
      if(!this.spotlightActive)return
      if(r.uid!==accountId()||uni.getStorageSync('fire_login_status')!==true){this.pauseSpotlight();return}
      completeGuide(uni,r.uid,reason);r.requested=false
      clearSession(r)
      this.spotlightBusy=true;this.spotlightVisible=false;this.spotlightActive=false;this.spotlightMenuOpen=false
    },
    spotlightClosed(){
      if(this.spotlightVisible)return
      this.spotlightRect=null;this.spotlightBusy=false;this.spotlightStep=0
      const r=session(this)
      if(r.page&&this.spotlightCanRun)maybePromptWishlist(this.feedbackOwnerId)
    },
  },
}
