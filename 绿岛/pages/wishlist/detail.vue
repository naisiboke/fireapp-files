<template>
 <view class="detail-page" :style="pageLayoutStyle">
  <AppFeedback :owner-id="feedbackOwnerId" />
  <view class="head"><button class="back" data-fire-press="true" @tap="back" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">‹</button><text>消费计划</text><button v-if="item" class="delete" data-fire-press="true" :disabled="busy" @tap="removeItem" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">删除</button></view>
  <view v-if="item">
   <view class="card hero"><text class="name">{{item.name}}</text><text class="amount">¥ {{money(item.amount)}}</text><text class="status">{{statusLabel}}</text></view>
   <view class="card"><view class="line"><text>冷静期</text><text>{{item.days||7}} 天</text></view><view class="line"><text>创建于</text><text>{{createdText}}</text></view><text class="countdown">{{bucket==='active'?(due?'等待你的决定':countdownText):statusLabel}}</text><view class="track"><view :style="{width:progress+'%'}"></view></view><text class="tip">{{bucket==='active'?'到期后由你确认，不会自动算作成功。':bucket==='success'?'这笔钱，留给更重要的事。':'如实记录，也是了解自己的开始。'}}</text></view>
   <view v-if="bucket==='active'" class="actions"><button class="primary" data-fire-press="true" :disabled="busy" @tap="finish(false)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">{{due?'没买，挑战成功':'提前结束，决定不买'}}</button><button class="secondary" data-fire-press="true" :disabled="busy" @tap="finish(true)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">已购买，挑战失败</button></view>
   <button v-else class="secondary full" data-fire-press="true" @tap="back" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">返回列表</button>
  </view>
  <view v-else class="missing"><text>{{missingText}}</text><button v-if="state.cloudSync.status==='error'" class="secondary" data-fire-press="true" @tap="retry" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">重试恢复</button><button class="secondary" data-fire-press="true" @tap="back" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">返回列表</button></view>
 </view>
</template>
<script setup>
import {computed,ref} from 'vue'
import {onLoad,onShow,onHide,onUnload} from '@dcloudio/uni-app'
import {pageLayoutStyle} from '@/utils/page-layout.js'
import AppFeedback from '@/components/AppFeedback.vue'
import {useFeedbackPage} from '@/utils/feedback-page.js'
import {showDialog,showNotice} from '@/utils/feedback.js'
import {state,persistNow,hydrateFromServer} from '@/store/index.js'
import {accountId} from '@/utils/account-cache.js'
import {wishlistBucket,wishlistDue,wishlistReason,coolingEnd,decideWishlist,removeWishlist} from '@/utils/wishlist.js'
const feedbackOwnerId=useFeedbackPage(),id=ref(''),now=ref(Date.now()),busy=ref(false)
let timer=null
onLoad(options=>{id.value=String(options?.id??'')})
onShow(()=>{now.value=Date.now();clearInterval(timer);timer=setInterval(()=>{now.value=Date.now()},1000)})
onHide(()=>clearInterval(timer));onUnload(()=>clearInterval(timer))
const item=computed(()=>(state.items||[]).find(x=>String(x.id)===id.value)||null)
const bucket=computed(()=>wishlistBucket(item.value))
const due=computed(()=>!!item.value&&wishlistDue(item.value,now.value))
const remaining=computed(()=>Math.max(0,coolingEnd(item.value)-now.value))
const progress=computed(()=>item.value?Math.min(100,Math.max(0,100*(1-remaining.value/(Math.max(1,Number(item.value.days)||7)*86400000)))):0)
const countdownText=computed(()=>{let s=Math.ceil(remaining.value/1000);return Math.floor(s/86400)+' 天 '+Math.floor(s%86400/3600)+' 时 '+Math.floor(s%3600/60)+' 分 '+s%60+' 秒'})
const statusLabel=computed(()=>bucket.value==='success'?'挑战成功 · '+wishlistReason(item.value):bucket.value==='bought'?'已购买 · 挑战失败':due.value?'待确认是否购买':'进行中')
const createdText=computed(()=>item.value?new Date(Number(item.value.created)).toLocaleDateString('zh-CN'):'')
const missingText=computed(()=>!id.value?'未找到项目编号':!state.ready||state.cloudSync.status==='restoring'?'正在恢复消费计划…':state.cloudSync.status==='error'?'暂未恢复此项目，请重试云端连接':'此项目不存在或已删除')
function money(v){return Number(v||0).toLocaleString('zh-CN',{maximumFractionDigits:2})}
function back(){uni.navigateBack({fail:()=>uni.redirectTo({url:'/pages/wishlist/index'})})}
function retry(){hydrateFromServer().catch(()=>showNotice({title:'恢复失败，本机记录已保留',icon:'none'}))}
async function finish(purchased){
 if(busy.value||!item.value||bucket.value!=='active')return
 busy.value=true;const uid=accountId(),target=id.value
 try{
  if(!due.value){const result=await showDialog({title:purchased?'确认已购买？':'提前结束挑战？',content:purchased?'将记为已购买，本次挑战失败。':'确认不再购买，将记为挑战成功。',confirmText:'确认'});if(!result.confirm)return}
  if(uid!==accountId())return
  const ok=decideWishlist(state,target,purchased,persistNow)
  showNotice({title:ok?(purchased?'已记录购买':'挑战成功'):'保存失败，请重试',icon:ok?'success':'none'})
 }finally{busy.value=false}
}
async function removeItem(){
 if(busy.value||!item.value)return
 busy.value=true;const uid=accountId(),target=id.value
 try{const result=await showDialog({title:'删除消费计划？',content:'删除后无法恢复，也不会保留在省下金额中。',confirmText:'删除',danger:true});if(!result.confirm||uid!==accountId())return;if(!removeWishlist(state,target,persistNow)){showNotice({title:'保存失败，请重试',icon:'none'});return}showNotice({title:'已删除',icon:'none'});back()}finally{busy.value=false}
}
</script>
<style scoped>
.detail-page{min-height:100vh;box-sizing:border-box;padding:var(--fire-page-top) 20px calc(30px + env(safe-area-inset-bottom));background:#f4f7f2;color:#173d35}.head{display:flex;align-items:center;justify-content:space-between;font-size:20px;font-weight:600;margin-bottom:24px}.back,.delete{min-height:44px;background:transparent;padding:8px;color:#173d35}.back{font-size:30px}.delete{font-size:14px;color:#a35d4e;background:#faf1ed;border-radius:12px}.card{background:#fff;border:1px solid #e0e8dc;border-radius:20px;padding:24px;margin:16px 0}.hero{text-align:center;padding:36px 24px}.name,.amount,.status,.countdown,.tip{display:block;overflow-wrap:anywhere}.name{font-size:22px;font-weight:600}.amount{font-size:32px;margin:16px 0}.status{font-size:13px;color:#66806f}.line{display:flex;justify-content:space-between;gap:12px;color:#708275;font-size:14px;margin:12px 0}.countdown{font-size:20px;margin-top:28px}.track{height:7px;border-radius:8px;background:#e6eee1;margin:18px 0;overflow:hidden}.track view{height:100%;background:#53816a}.tip{font-size:13px;line-height:1.7;color:#708275}.actions{display:flex;flex-direction:column;gap:12px;margin-top:26px}.primary,.secondary{width:100%;min-height:48px;border-radius:14px;padding:14px;font-size:15px}.primary{background:#173d35;color:#fff}.secondary{background:#e6eee1;color:#315b47}.full{margin-top:24px}.missing{padding:70px 12px;text-align:center;color:#708275}.missing button{margin-top:20px}button:after{border:0}
</style>