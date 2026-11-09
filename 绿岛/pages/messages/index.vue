<template>
 <view class="messages-page" :style="pageLayoutStyle">
  <AppFeedback :owner-id="feedbackOwnerId"/>
  <view class="messages-head"><button class="back" aria-label="返回" @tap="back">‹</button><text>消息提醒</text><button class="read-all" :disabled="!unread" @tap="markAll">全部已读</button></view>
  <view v-if="loading&&!messages.length" class="messages-empty"><LoadingSpinner :size="22" label="读取消息"/></view>
  <view v-else-if="!messages.length" class="messages-empty"><text class="empty-title">暂无消息提醒</text><text>到期提醒、审核结果和经验到账会出现在这里</text></view>
  <view v-for="item in messages" :key="item.id" class="message-row" :class="{'is-unread':!item.read}" @tap="open(item)">
   <view class="message-line"><text class="message-title">{{item.title}}</text><view v-if="!item.read" class="unread-dot"/></view>
   <text class="message-body">{{item.body}}</text><text class="message-time">{{time(item.at)}}</text>
  </view>
  <text v-if="error" class="messages-note">暂未获取最新消息，已有提醒已保留</text>
 </view>
</template>
<script>
import AppFeedback from '@/components/AppFeedback.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import {feedbackPageMixin} from '@/utils/feedback-page.js'
import {showNotice,dismissFeedback} from '@/utils/feedback.js'
import {state,refreshActions} from '@/store/index.js'
import {CS} from '@/utils/community-store.js'
import {accountId} from '@/utils/account-cache.js'
import {collectNotifications,inbox,readNotifications} from '@/utils/notifications.js'
import {openActionRoute} from '@/utils/action-navigation.js'
export default{
 mixins:[feedbackPageMixin],components:{AppFeedback,LoadingSpinner},
 data(){return{messages:[],loading:false,error:false,uid:''}},
 computed:{unread(){return this.messages.some(x=>!x.read)}},
 onShow(){this.uid=accountId();this.reload();this.sync()},
 onHide(){this.messages=[];this.uid=''},
 onBackPress(){return dismissFeedback(this.feedbackOwnerId)},
 methods:{
  reload(){if(!this.uid||this.uid!==accountId())return;try{collectNotifications({items:state.items,posts:CS.ugc(),rewards:state.actionRewards},this.uid)}catch(error){this.error=true;console.warn('[message-inbox]','cache-unavailable')}this.messages=inbox(this.uid)},
  async sync(){const uid=this.uid;this.loading=true;this.error=false;try{const values=await Promise.allSettled([refreshActions(),CS.hydrate()]);if(this.uid!==uid||uid!==accountId())return;this.error=values.some(x=>x.status==='rejected'||x.value?.ok===false);this.reload()}catch(error){if(this.uid===uid)this.error=true}finally{if(this.uid===uid)this.loading=false}},
  markAll(){if(!readNotifications(null,this.uid))return showNotice({title:'已读状态保存失败，请重试',icon:'none'});this.reload()},
  open(item){if(this.uid!==accountId())return;if(!readNotifications([item.id],this.uid))return showNotice({title:'已读状态保存失败，请重试',icon:'none'});this.reload();openActionRoute(item.route,uni,()=>showNotice({title:'暂时无法打开，请稍后重试',icon:'none'}))},
  back(){uni.navigateBack({fail:()=>uni.switchTab({url:'/pages/index/index'})})},
  time(value){return new Date(value).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})},
 }
}
</script>
<style>
.messages-page{min-height:100vh;box-sizing:border-box;padding:var(--fire-content-top) 18px calc(24px + env(safe-area-inset-bottom));background:#f3f4f2;color:#243830}
.messages-head{position:fixed;z-index:30;top:0;left:0;right:0;box-sizing:border-box;height:var(--fire-header-height);padding:var(--fire-status-top) 14px 0;background:#f3f4f2;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e7e1;font-size:18px;font-weight:600}
.messages-head button{background:transparent;border:0;padding:0;box-shadow:none}.back{font-size:30px;color:#315846;width:44px}.read-all{font-size:12px;color:#547660;min-width:68px}.read-all[disabled]{opacity:.4}
.message-row{padding:17px 16px;margin-bottom:10px;border-radius:14px;background:#fff;border:1px solid #e2e7e1}.message-line{display:flex;align-items:center;justify-content:space-between;gap:10px}.message-title{font-size:14px;font-weight:600}.message-body{display:block;font-size:12px;line-height:1.7;margin-top:7px;color:#687a6e}.message-time{display:block;font-size:10px;margin-top:9px;color:#8a958b}.unread-dot{width:6px;height:6px;border-radius:50%;background:#ba6a59;flex-shrink:0}.messages-empty{padding:90px 18px;text-align:center;color:#7c8a80;font-size:12px;line-height:1.8}.empty-title{display:block;color:#315846;font-size:17px;margin-bottom:8px}.messages-note{display:block;text-align:center;color:#8b7351;font-size:12px;padding:14px}
</style>
