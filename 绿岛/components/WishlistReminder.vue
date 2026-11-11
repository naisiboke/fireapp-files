<template>
 <FireOverlay :visible="visible" :owner-id="ownerId" label="确认消费决定" @close="closeWishlistReminder">
  <view v-if="item" class="reminder">
   <view class="heading"><text>{{item.status==='failed'?'确认这项消费决定':'冷静期结束了'}}</text><button class="close" data-fire-press="true" aria-label="稍后再说" @tap="closeWishlistReminder" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><view class="fire-close-mark"></view></button></view>
   <text class="name">{{item.name}}</text><text class="amount">¥ {{Number(item.amount||0).toLocaleString('zh-CN')}}</text>
   <text class="hint">这件东西，你最后买了吗？</text>
   <button class="primary" data-fire-press="true" :disabled="reminder.busy" @tap="answerWishlistReminder(false)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">没买，挑战成功</button>
   <button class="secondary" data-fire-press="true" :disabled="reminder.busy" @tap="answerWishlistReminder(true)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">买了，记录购买</button>
   <button class="later" data-fire-press="true" :disabled="reminder.busy" @tap="closeWishlistReminder" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">稍后再说</button>
   <text v-if="reminder.remaining>1" class="count">还有 {{reminder.remaining-1}} 项待确认</text>
  </view>
 </FireOverlay>
</template>
<script>
import FireOverlay from './FireOverlay.vue'
import {state} from '@/store/index.js'
import {accountId} from '@/utils/account-cache.js'
import {feedbackState} from '@/utils/feedback.js'
import {wishlistReminder,closeWishlistReminder,answerWishlistReminder} from '@/utils/wishlist-reminder.js'
export default{
 components:{FireOverlay},props:{ownerId:Number},data(){return{reminder:wishlistReminder}},
 computed:{visible(){return this.reminder.owner===this.ownerId&&feedbackState.owner===this.ownerId&&this.reminder.uid===accountId()&&!!this.item},item(){return(state.items||[]).find(x=>String(x.id)===this.reminder.id)||null}},
 methods:{closeWishlistReminder,answerWishlistReminder},
}
</script>
<style scoped>
.reminder{padding:22px;color:#173d35;background:#fff}.heading{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:18px;font-weight:600}.close{padding:8px;min-width:36px;min-height:36px;background:#f0f4ed;border-radius:50%}.name{display:block;margin-top:20px;font-size:21px;overflow-wrap:anywhere}.amount{display:block;font-size:25px;margin-top:8px}.hint{display:block;font-size:14px;color:#728273;margin:18px 0 24px}.primary,.secondary,.later{width:100%;min-height:46px;font-size:14px;margin-top:10px;border-radius:12px;padding:12px}.primary{background:#173d35;color:#fff}.secondary{background:#e7efe2;color:#315b47}.later{background:transparent;color:#77897b}.count{display:block;text-align:center;font-size:12px;color:#8a978c;margin-top:8px}button:after{border:0}
</style>