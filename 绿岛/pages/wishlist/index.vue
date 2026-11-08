
<template>
 <view class="qe-page qe-page-with-tabs wishlist-page" :style="[pageLayoutStyle, pageStyle]">
  <AppFeedback :owner-id="feedbackOwnerId" />
  <view class="qe-header"><button class="qe-back" aria-label="返回上一页" @tap="back"><view class="qe-back-chevron"></view></button><text class="qe-header-title">极简拔草</text><view></view></view>
  <view class="qe-wishlist-summary"><view><text>挑战成功，留下</text><text class="qe-wishlist-saved">¥{{money(saved)}}</text></view><text>{{activeCount}} 项进行中</text></view>
  <view class="qe-wishlist-tabs"><button v-for="t in tabs" :key="t.id" :class="{active:filter===t.id}" :aria-pressed="filter===t.id" @tap="filter=t.id">{{t.name}}</button></view>
  <view class="qe-wishlist-main">
   <QuietEmptyState v-if="showEmpty || entryEmptyLeaving" ref="emptyGuide" kind="wishlist" title="给想买的东西一点时间" description="记下来，过几天再决定。" :leaving="entryEmptyLeaving" :pointing="(showFirstGuide || entryEmptyLeaving) && !showAdd" @ready="refreshEntryArrow" />
   <view v-else-if="!filtered.length" class="qe-empty-filter">这里还没有记录</view>
   <view v-if="entryTip" class="qe-tip" role="status" aria-live="polite">✓ {{entryTip}}</view>
   <view v-for="item in filtered" :id="rowId(item.id)" :key="item.id" class="qe-wish-card" :class="{'qe-record-arriving':entryArrivingId===String(item.id)}" @tap="open(item)">
    <view class="qe-wish-top"><view><text class="qe-wish-name">{{item.name}}</text><text class="qe-wish-price">¥{{money(item.amount)}}</text></view><text class="qe-wish-chevron">›</text></view>
    <view class="qe-wish-bottom"><text class="qe-wish-status">{{statusText(item)}}</text><button class="qe-wish-delete" :disabled="deleting" @tap.stop="removeItem(item)" aria-label="删除此计划"><view class="qe-trash"></view>删除</button></view>
   </view>
  </view>
  <button id="quiet-entry-fab" class="qe-fab" :class="{'qe-fab-hint':showFirstGuide && !showAdd}" aria-label="添加消费计划" @tap="openAdd">＋</button>
  <view v-if="entryFly" class="qe-flight" :style="entryFly.style" aria-hidden="true"><text class="qe-flight-label">{{entryFly.title}}</text><text class="qe-flight-amount">{{entryFly.amount}}</text></view>
  <BottomTabs current="tools" />
  <QuietEntrySheet :visible="entryVisible && showAdd" :owner-id="feedbackOwnerId" title="添加消费计划" :busy="saving" @close="closeEntrySheet" @ready="entryFocus=true">
   <text class="qe-label">想买什么</text><input class="qe-input" type="text" :adjust-position="false" :focus="entryFocus" v-model="form.name" maxlength="80" aria-label="消费计划名称" placeholder="例如：想买的耳机" />
   <text class="qe-label">预计金额（元）</text><input class="qe-input" type="digit" :adjust-position="false" v-model="form.amount" maxlength="12" aria-label="预计金额" placeholder="0.00" />
   <text class="qe-label">分类</text><picker :range="categories" range-key="name" :value="categoryIndex" @change="chooseCategory"><view class="qe-picker-row">{{categories[categoryIndex].name}} <text>⌄</text></view></picker>
   <text class="qe-label">冷静期</text><view class="qe-cooling-options"><button v-for="d in [3,7,30]" :key="d" :class="{active:form.days===d}" @tap="form.days=d">{{d}} 天</button></view>
   <text class="qe-form-hint">到期后会询问是否购买，再记录挑战结果。</text><text v-if="error" class="qe-error" role="alert">{{error}}</text>
   <template #footer><button class="qe-primary" :disabled="saving" @tap="submitWish">{{saving?'保存中…':'添加'}}</button></template>
  </QuietEntrySheet>
 </view>
</template>
<script>
import AppFeedback from '@/components/AppFeedback.vue'
import BottomTabs from '@/components/BottomTabs.vue'
import QuietEmptyState from '@/components/QuietEmptyState.vue'
import QuietEntrySheet from '@/components/QuietEntrySheet.vue'
import {feedbackPageMixin} from '@/utils/feedback-page.js'
import {quietEntryPageMixin,measureEntryTarget} from '@/utils/quiet-entry-page.js'
import {showDialog,showNotice} from '@/utils/feedback.js'
import {clearOptionsDraft} from '@/utils/session-drafts.js'
import {state,persistNow} from '@/store/index.js'
import {accountId} from '@/utils/account-cache.js'
import {WishlistSaved} from '@/utils/engine.js'
import {wishlistBucket,wishlistDue,wishlistReason,coolingEnd,removeWishlist,createWishlist} from '@/utils/wishlist.js'
const emptyForm=()=>({name:'',amount:'',category:'other',days:7})
export default{
 mixins:[feedbackPageMixin,quietEntryPageMixin],components:{AppFeedback,BottomTabs,QuietEmptyState,QuietEntrySheet},
 data(){return{state,filter:'active',deleting:false,now:Date.now(),timer:null,showAdd:false,form:emptyForm(),saving:false,error:'',tabs:[{id:'active',name:'进行中'},{id:'success',name:'挑战成功'},{id:'bought',name:'已购买'}],categories:[{id:'shopping',name:'购物'},{id:'food',name:'饮食'},{id:'travel',name:'旅行'},{id:'life',name:'生活'},{id:'other',name:'其他'}]}},
 onShow(){this.now=Date.now();clearInterval(this.timer);this.timer=setInterval(()=>{this.now=Date.now()},60000)},
 onHide(){clearInterval(this.timer)},onUnload(){clearInterval(this.timer)},
 onBackPress(event){return this.handleEntryBack(event)},
 computed:{
  filtered(){return (state.items||[]).filter(x=>wishlistBucket(x)===this.filter).slice().sort((a,b)=>Number(b.created||0)-Number(a.created||0))},
  saved(){return WishlistSaved(state)},activeCount(){return(state.items||[]).filter(x=>wishlistBucket(x)==='active').length},
  showEmpty(){return this.filter==='active'&&!(state.items||[]).length},
  showFirstGuide(){return this.showEmpty&&this.entryIsFirst('wishlist')},
  categoryIndex(){return Math.max(0,this.categories.findIndex(x=>x.id===this.form.category))},
 },
 watch:{showAdd(){this.$nextTick(()=>this.refreshEntryArrow())},filter(){this.$nextTick(()=>this.refreshEntryArrow())}},
 methods:{
  money(v){return Number(v||0).toLocaleString('zh-CN',{maximumFractionDigits:2})},
  rowId(id){return'wishlist-row-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_')},
  resetEntryDraft(){this.form=emptyForm()},closeEntrySheet(){if(this.saving)return;this.showAdd=false;this.entryFocus=false;this.error=''},
  openAdd(){if(this.saving)return;this.error='';this.entryFocus=false;this.showAdd=true},
  chooseCategory(event){const c=this.categories[Number(event.detail.value)];if(c)this.form.category=c.id},
  open(item){uni.navigateTo({url:'/pages/wishlist/detail?id='+encodeURIComponent(String(item.id))})},
  statusText(item){const bucket=wishlistBucket(item);if(bucket==='success')return wishlistReason(item);if(bucket==='bought')return'已购买 · 挑战失败';if(wishlistDue(item,this.now))return'待确认是否购买';return'冷静期还剩 '+Math.ceil((coolingEnd(item)-this.now)/86400000)+' 天'},
  async submitWish(){
   if(this.saving||!this.showAdd)return
   if(!this.entryCanSave()){this.error='账号或同步状态已变化，请稍后重新打开';return}
   this.saving=true;this.error=''
   const operation=this.entryOperation(),uid=accountId(),origin=await measureEntryTarget(this,'#quiet-entry-fab')
   if(uid!==accountId()||!this.entryCanSave(operation)){this.saving=false;this.error='账号已变化，当前输入已保留';return}
   const first=!(state.items||[]).length&&this.entryIsFirst('wishlist'),result=createWishlist(state,this.form,persistNow)
   if(!result){this.saving=false;this.error='请检查名称、金额和冷静期，并确认设备存储可用';return}
   this.rememberEntry('wishlist');this.filter='active';this.saving=false;this.closeEntrySheet();this.resetEntryDraft();clearOptionsDraft(this)
   this.animateEntry(result.id,'#'+this.rowId(result.id),result.name,'¥'+this.money(result.amount),first,origin,{tip:'第一件心愿已添加',leaving:first})
  },
  async removeItem(item){if(this.deleting)return;this.deleting=true;const operation=this.entryOperation(),uid=accountId(),id=String(item.id);try{const result=await showDialog({title:'删除消费计划？',content:'删除后无法恢复，也不会保留在省下金额中。',confirmText:'删除',danger:true});if(!result.confirm||uid!==accountId()||!this.entryCanSave(operation))return;showNotice({title:removeWishlist(state,id,persistNow)?'已删除':'保存失败，请重试',icon:'none'});this.$nextTick(()=>this.refreshEntryArrow())}finally{this.deleting=false}},
 },
}
</script>
<style lang="scss">
@import '@/styles/quiet-entry.scss';
.wishlist-page{padding-top:var(--fire-page-top)}
</style>
