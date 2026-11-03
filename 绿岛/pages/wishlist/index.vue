<template>
 <view class="wishlist-page" :style="pageLayoutStyle">
  <AppFeedback :owner-id="feedbackOwnerId" />
  <view class="head"><button class="back" @tap="back">‹</button><text class="title">极简拔草</text><button class="new" @tap="openAdd">＋ 添加</button></view>
  <view class="summary"><text>挑战成功，留下</text><text class="amount">¥ {{money(saved)}}</text></view>
  <view class="tabs"><button v-for="t in tabs" :key="t.id" :class="{active:filter===t.id}" @tap="filter=t.id">{{t.name}}</button></view>
  <view v-for="item in filtered" :key="item.id" class="item" @tap="open(item)">
   <view class="row"><view><text class="name">{{item.name}}</text><text class="price">¥ {{money(item.amount)}}</text></view><text class="arrow">›</text></view>
   <view class="row"><text class="status">{{statusText(item)}}</text><button class="delete" :disabled="deleting" @tap.stop="removeItem(item)" aria-label="删除此计划"><view class="trash"></view>删除</button></view>
  </view>
  <view v-if="!filtered.length" class="empty"><text>{{filter==='active'?'给心动留一点时间':'这里还没有记录'}}</text><text>3、7 或 30 天后，再做决定。</text></view>
  <BottomTabs current="tools" />
 </view>
</template>
<script>
import AppFeedback from '@/components/AppFeedback.vue'
import BottomTabs from '@/components/BottomTabs.vue'
import {feedbackPageMixin} from '@/utils/feedback-page.js'
import {showDialog,showNotice} from '@/utils/feedback.js'
import {state,persistNow} from '@/store/index.js'
import {accountId} from '@/utils/account-cache.js'
import {WishlistSaved} from '@/utils/engine.js'
import {wishlistBucket,wishlistDue,wishlistReason,coolingEnd,removeWishlist} from '@/utils/wishlist.js'
export default{
 mixins:[feedbackPageMixin],components:{AppFeedback,BottomTabs},
 data(){return{state,filter:'active',deleting:false,now:Date.now(),timer:null,tabs:[{id:'active',name:'进行中'},{id:'success',name:'挑战成功'},{id:'bought',name:'已购买'}]}},
 onShow(){this.now=Date.now();clearInterval(this.timer);this.timer=setInterval(()=>{this.now=Date.now()},60000)},
 onHide(){clearInterval(this.timer)},onUnload(){clearInterval(this.timer)},
 computed:{filtered(){return (state.items||[]).filter(x=>wishlistBucket(x)===this.filter)},saved(){return WishlistSaved(state)}},
 methods:{
 money(v){return Number(v||0).toLocaleString('zh-CN',{maximumFractionDigits:2})},
 back(){uni.switchTab({url:'/pages/tools/index'})},openAdd(){uni.navigateTo({url:'/pages/wishlist/add'})},
 open(item){uni.navigateTo({url:'/pages/wishlist/detail?id='+encodeURIComponent(String(item.id))})},
 statusText(item){const bucket=wishlistBucket(item);if(bucket==='success')return wishlistReason(item);if(bucket==='bought')return '已购买 · 挑战失败';if(wishlistDue(item,this.now))return '待确认是否购买';return '冷静期还剩 '+Math.ceil((coolingEnd(item)-this.now)/86400000)+' 天'},
 async removeItem(item){if(this.deleting)return;this.deleting=true;const uid=accountId(),id=String(item.id);try{const result=await showDialog({title:'删除消费计划？',content:'删除后无法恢复，也不会保留在省下金额中。',confirmText:'删除',danger:true});if(!result.confirm||uid!==accountId())return;showNotice({title:removeWishlist(state,id,persistNow)?'已删除':'保存失败，请重试',icon:'none'})}finally{this.deleting=false}},
 },
}
</script>
<style scoped>
.wishlist-page{min-height:100vh;box-sizing:border-box;padding:var(--fire-page-top) 20px calc(110px + env(safe-area-inset-bottom));background:#f4f7f2;color:#173d35}.head,.row{display:flex;align-items:center;justify-content:space-between;gap:12px}.title{flex:1;font-size:23px;font-weight:700}.back,.new{background:transparent;color:#173d35;min-height:44px;padding:8px}.back{font-size:30px}.new{font-size:14px}.summary{padding:24px;margin:22px 0;background:#e3eee1;border-radius:20px;color:#627769;font-size:13px}.amount{display:block;color:#173d35;font-size:30px;margin-top:8px;font-weight:600}.tabs{display:flex;padding:4px;gap:4px;background:#e9eee5;border-radius:16px;margin-bottom:18px}.tabs button{flex:1;min-width:0;background:transparent;color:#6d7f72;padding:10px 4px;font-size:14px}.tabs .active{background:#fff;color:#173d35;border-radius:12px;font-weight:600}.item{background:#fff;padding:20px;margin:12px 0;border:1px solid #dfe8dc;border-radius:18px}.name,.price{display:block;overflow-wrap:anywhere}.name{font-size:17px;font-weight:600}.price{font-size:20px;margin-top:8px}.arrow{font-size:28px;color:#8ba08d}.status{font-size:12px;color:#66816f;margin-top:12px}.delete{margin-top:10px;gap:6px;min-height:40px;padding:8px 10px;color:#a35d4e;background:#faf1ed;border-radius:10px;font-size:12px}.trash{width:11px;height:12px;border:1.5px solid currentColor;border-radius:0 0 3px 3px;position:relative}.trash:before{content:'';position:absolute;top:-5px;left:-3px;width:14px;border-top:1.5px solid currentColor}.empty{padding:70px 12px;text-align:center;line-height:2;color:#708474}.empty text{display:block}.empty text+text{font-size:13px}button:after{border:0}
</style>