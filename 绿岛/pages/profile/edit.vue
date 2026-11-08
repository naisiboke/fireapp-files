<template>
  <view class="edit-page fire-page-profile-edit" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="head"><text class="title">个人资料</text><text class="close" @tap="close">×</text></view>
    <view class="account-card"><text class="account-label">绑定邮箱</text><text class="account-email">{{ boundEmail || '暂未绑定邮箱' }}</text><text class="account-hint">{{ boundEmail ? '用于登录和接收安全通知' : '请使用邮箱验证码登录后完成绑定' }}</text></view>
    <view class="card">
      <text class="label">昵称</text>
      <input v-model="name" :disabled="saving" aria-label="昵称" class="name-input" maxlength="8" placeholder="请输入昵称" placeholder-class="placeholder" />
      <text class="hint">经 AI 审核通过后，昵称会同步到个人主页和社区作者名</text><text v-if="reviewRequired" class="limit-hint">昵称规则已更新，请重新审核后公开展示</text>
      <text v-if="!pro && lastChangedAt" class="limit-hint">{{ nextChangeText }}</text>
      <text v-else-if="pro" class="limit-hint pro-hint">Pro 会员不限修改次数</text>
    </view>
    <view class="rules">
      <text class="rules-title">昵称规范</text>
      <text class="rule">· 2–8 个字符，仅中文、字母和数字</text>
      <text class="rule">· 30 天最多修改一次（Pro 会员不限次数）</text>
      <text class="rule">· 不得包含政治人物、政府机构或政党名称</text>
      <text class="rule">· 不得包含辱骂、谐音暗骂、隐晦攻击、歧视或冒充内容</text>
      <text class="rule">· 不得包含手机号、邮箱或链接</text>
    </view>
    <text v-if="reviewMessage" class="review-message" role="alert">{{reviewMessage}}</text>
    <button class="save" :disabled="saving" :aria-busy="saving" @tap="save"><LoadingSpinner v-if="saving" :size="18" light label="昵称审核中"/><text>{{ saving ? 'AI 审核中' : '审核并保存昵称' }}</text></button>
  </view>
</template>

<script>
import { clearOptionsDraft } from '@/utils/session-drafts.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import {reviewAndSaveNickname} from '@/utils/api-service.js'
import {accountId} from '@/utils/account-cache.js'
import AppFeedback from '@/components/AppFeedback.vue'
import { feedbackPageMixin } from '@/utils/feedback-page.js'
import { showNotice, dismissFeedback } from '@/utils/feedback.js'
import { state, persist } from '@/store/index.js'
import { validateNickname } from '@/utils/nickname.js'
import { isMembershipActive } from '@/utils/membership.js'

const CHANGE_INTERVAL = 30 * 24 * 60 * 60 * 1000

function isProMember() { return isMembershipActive(state) }

export default {
  components: { AppFeedback, LoadingSpinner },
  mixins: [feedbackPageMixin],
  onBackPress() { return dismissFeedback(this.feedbackOwnerId) },
  data() { return { name: '', email: '', saving: false, lastChangedAt: 0, pro: false, reviewMessage:'', profileVisible:true, reviewRequired:false } },
  computed: {
    boundEmail() { return this.email },
    nextChangeText() {
      const left = Math.max(1, Math.ceil((this.lastChangedAt + CHANGE_INTERVAL - Date.now()) / 86400000))
      return '距离下次可修改还有 ' + left + ' 天'
    },
  },
  onShow(){this.profileVisible=true},
  onHide(){this.profileVisible=false},
  onLoad() {
    const profile = state.profile || {}
    this.name = profile.name || '自由的旅人'
    this.reviewRequired=profile.nicknameReviewStatus==='needs_review'
    this.email = profile.email || uni.getStorageSync('fire_account_email') || uni.getStorageSync('fire_login_email') || ''
    this.lastChangedAt = profile.nicknameReviewStatus==='approved'?(Number(profile.nicknameUpdatedAt)||0):0
    this.pro = isProMember()
  },
  methods: {
    close() { uni.navigateBack() },
    async save() {
      if(this.saving)return
      this.reviewMessage=''
      const result=validateNickname(this.name)
      if(!result.ok){this.reviewMessage=result.message;return}
      const profile=state.profile||{},uid=accountId()
      if(!uid){this.reviewMessage='请先登录后修改昵称';return}
      if(result.value===String(profile.name||'')&&profile.nicknameReviewStatus==='approved'){
        this.reviewMessage='昵称没有变化';return
      }
      if(!this.pro&&this.lastChangedAt&&Date.now()-this.lastChangedAt<CHANGE_INTERVAL){
        this.reviewMessage=this.nextChangeText;return
      }
      this.saving=true
      try{
        const approved=await reviewAndSaveNickname(result.value)
        if(accountId()!==uid)return
        state.profile={...(state.profile||{}),...approved}
        this.lastChangedAt=approved.nicknameUpdatedAt
        this.name=approved.name
        this.reviewRequired=false
        const saved=persist()
        if(saved)clearOptionsDraft(this)
        if(this.profileVisible)showNotice({title:saved?'昵称审核通过，社区作者名已更新':'昵称已在云端更新，本机缓存保存失败，请重试同步',icon:'none'})
      }catch(error){
        if(accountId()===uid)this.reviewMessage=error.message||'审核未完成，原昵称已保留，请重试'
      }finally{this.saving=false}
    },
  },
}
</script>

<style>
.edit-page{min-height:100vh;padding:calc(62px + var(--fire-status-top, env(safe-area-inset-top))) 20px calc(32px + env(safe-area-inset-bottom));background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:10;top:0;left:0;right:0;height:calc(58px + var(--fire-status-top, env(safe-area-inset-top)));padding:var(--fire-status-top, env(safe-area-inset-top)) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#fdfdfb;border-bottom:1px solid #edf1eb;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#243830}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#243830}.account-card{padding:16px 20px;background:#eef3ea;border:1px solid #dce7da;border-radius:14px;margin-bottom:12px}.account-label{display:block;color:#527059;font-size:13px;font-weight:600}.account-email{display:block;color:#173d35;font-size:17px;font-weight:600;margin-top:9px;word-break:break-all}.account-hint{display:block;color:#71807a;font-size:12px;line-height:1.6;margin-top:6px}.card{padding:20px;background:#fff;border:1px solid #e5e9e0;border-radius:14px;margin-bottom:12px}.label{display:block;color:#243830;font-size:16px;font-weight:600;margin-bottom:14px}.name-input{height:52px;border-bottom:1px solid #dce5dc;color:#243830;font-size:18px}.placeholder{color:#a2afa5}.hint{display:block;color:#71807a;font-size:12px;line-height:1.6;margin-top:12px}.limit-hint{display:block;color:#9a6a42;font-size:12px;line-height:1.6;margin-top:7px}.pro-hint{color:#527059}.rules{padding:16px 18px;border-radius:14px;background:#eff3ea;margin-bottom:18px}.rules-title{display:block;color:#243830;font-size:14px;font-weight:600;margin-bottom:7px}.rule{display:block;color:#627269;font-size:12px;line-height:1.8}.save{width:100%;height:50px;border:0;border-radius:12px;background:#173d35;color:#fff;font-size:16px}.save[disabled]{opacity:.65}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-profile-edit > .head{height:var(--fire-header-height);padding-top:var(--fire-page-top);box-sizing:border-box}
 .fire-page-profile-edit{padding-top:var(--fire-content-top)}
.save{display:flex;align-items:center;justify-content:center;gap:8px}.review-message{display:block;margin:0 0 12px;color:#b8332d;font-size:13px;line-height:1.6}
</style>
