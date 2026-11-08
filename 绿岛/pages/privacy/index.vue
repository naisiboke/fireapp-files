<template>
 <view class="legal-page fire-page-privacy-index" :style="pageLayoutStyle">
  <AppFeedback :owner-id="feedbackOwnerId"/>
  <view class="legal-head"><view class="legal-back" role="button" aria-label="返回登录或上一页" @tap="close">‹</view><text class="legal-title">隐私政策</text><view class="legal-head-space"/></view>
  <view class="legal-content"><text class="legal-name">Fire生活隐私政策</text><text class="legal-date">版本／更新时间：{{version}}</text>
   <view v-for="section in sections" :key="section.title" class="legal-section"><text class="legal-section-title">{{section.title}}</text><text class="legal-text">{{section.text}}</text></view>
  </view>
 </view>
</template>
<script>
import AppFeedback from '@/components/AppFeedback.vue'
import {feedbackPageMixin} from '@/utils/feedback-page.js'
import {dismissFeedback} from '@/utils/feedback.js'
import {LEGAL_VERSION,privacySections} from '@/utils/legal-documents.js'
import {closeLegalPage} from '@/utils/legal-navigation.js'
export default{
 components:{AppFeedback},mixins:[feedbackPageMixin],
 data(){return{version:LEGAL_VERSION,sections:privacySections}},
 methods:{close(){closeLegalPage()}},
 onBackPress(event){
  if(dismissFeedback(this.feedbackOwnerId))return true
  if(event?.from==='navigateBack')return false
  try{if(getCurrentPages().length>1)return false}catch{}
  this.close();return true
 },
}
</script>
<style>
.legal-page{min-height:100vh;padding:var(--fire-content-top) 22px calc(40px + env(safe-area-inset-bottom));background:#fdfdfb;box-sizing:border-box}
.legal-head{position:fixed;z-index:30;top:0;left:0;right:0;height:var(--fire-header-height);padding:var(--fire-page-top) 16px 0;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;background:rgba(253,253,251,.98);border-bottom:1px solid #e1e7df}
.legal-title{font-size:18px;font-weight:600;color:#243830}.legal-back,.legal-head-space{width:44px;height:44px;display:flex;align-items:center;justify-content:center}.legal-back{font-size:34px;color:#243830}
.legal-content{max-width:700px;margin:auto;padding-top:20px}.legal-name{display:block;font-size:23px;font-weight:700;color:#173d35}.legal-date{display:block;margin-top:9px;color:#788679;font-size:12px}
.legal-section{margin-top:25px}.legal-section-title{display:block;font-size:16px;font-weight:600;color:#243830;margin-bottom:8px}.legal-text{display:block;font-size:14px;line-height:1.9;color:#52605a;word-break:break-word}
</style>
