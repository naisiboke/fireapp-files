<template>
  <view class="edit-page">
    <view class="head"><text class="title">个人资料</text><text class="close" @tap="close">×</text></view>
    <view class="account-card"><text class="account-label">绑定邮箱</text><text class="account-email">{{ boundEmail || '暂未绑定邮箱' }}</text><text class="account-hint">{{ boundEmail ? '用于登录和接收安全通知' : '请使用邮箱验证码登录后完成绑定' }}</text></view>
    <view class="card">
      <text class="label">昵称</text>
      <input v-model="name" class="name-input" maxlength="20" placeholder="请输入昵称" placeholder-class="placeholder" />
      <text class="hint">昵称会显示在个人主页和社区内容中</text>
      <text v-if="!pro && lastChangedAt" class="limit-hint">{{ nextChangeText }}</text>
      <text v-else-if="pro" class="limit-hint pro-hint">Pro 会员不限修改次数</text>
    </view>
    <view class="rules">
      <text class="rules-title">昵称规范</text>
      <text class="rule">· 2-20 个字符</text>
      <text class="rule">· 30 天最多修改一次（Pro 会员不限次数）</text>
      <text class="rule">· 不得包含政治人物、政府机构或政党名称</text>
      <text class="rule">· 不得包含辱骂、仇恨、侮辱或冒充官方内容</text>
      <text class="rule">· 不得包含手机号、邮箱或链接</text>
    </view>
    <button class="save" :disabled="saving" @tap="save">{{ saving ? '保存中…' : '保存资料' }}</button>
  </view>
</template>

<script>
import { state, persist } from '@/store/index.js'
import { validateNickname } from '@/utils/nickname.js'
import { isMembershipActive } from '@/utils/membership.js'

const CHANGE_INTERVAL = 30 * 24 * 60 * 60 * 1000

function isProMember() { return isMembershipActive(state) }

export default {
  data() { return { name: '', email: '', saving: false, lastChangedAt: 0, pro: false } },
  computed: {
    boundEmail() { return this.email },
    nextChangeText() {
      const left = Math.max(1, Math.ceil((this.lastChangedAt + CHANGE_INTERVAL - Date.now()) / 86400000))
      return '距离下次可修改还有 ' + left + ' 天'
    },
  },
  onLoad() {
    const profile = state.profile || {}
    this.name = profile.name || '自由的旅人'
    this.email = profile.email || uni.getStorageSync('fire_account_email') || uni.getStorageSync('fire_login_email') || ''
    this.lastChangedAt = Number(profile.nicknameUpdatedAt) || 0
    this.pro = isProMember()
  },
  methods: {
    close() { uni.navigateBack() },
    save() {
      const result = validateNickname(this.name)
      if (!result.ok) return uni.showToast({ title: result.message, icon: 'none' })
      const profile = state.profile || {}
      const currentName = String(profile.name || '')
      if (result.value === currentName) return uni.showToast({ title: '昵称没有变化', icon: 'none' })
      const elapsed = Date.now() - this.lastChangedAt
      if (!this.pro && this.lastChangedAt && elapsed < CHANGE_INTERVAL) {
        return uni.showToast({ title: this.nextChangeText, icon: 'none' })
      }
      this.saving = true
      state.profile = { ...profile, name: result.value, nicknameUpdatedAt: Date.now() }
      delete state.profile.avatarFileID
      delete state.profile.avatarUrl
      persist()
      setTimeout(() => {
        this.saving = false
        uni.showToast({ title: '个人资料已保存', icon: 'none' })
        setTimeout(() => uni.navigateBack(), 350)
      }, 120)
    },
  },
}
</script>

<style>
.edit-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 20px calc(32px + env(safe-area-inset-bottom));background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:10;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#fdfdfb;border-bottom:1px solid #edf1eb;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#243830}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#243830}.account-card{padding:16px 20px;background:#eef3ea;border:1px solid #dce7da;border-radius:14px;margin-bottom:12px}.account-label{display:block;color:#527059;font-size:13px;font-weight:600}.account-email{display:block;color:#173d35;font-size:17px;font-weight:600;margin-top:9px;word-break:break-all}.account-hint{display:block;color:#71807a;font-size:12px;line-height:1.6;margin-top:6px}.card{padding:20px;background:#fff;border:1px solid #e5e9e0;border-radius:14px;margin-bottom:12px}.label{display:block;color:#243830;font-size:16px;font-weight:600;margin-bottom:14px}.name-input{height:52px;border-bottom:1px solid #dce5dc;color:#243830;font-size:18px}.placeholder{color:#a2afa5}.hint{display:block;color:#71807a;font-size:12px;line-height:1.6;margin-top:12px}.limit-hint{display:block;color:#9a6a42;font-size:12px;line-height:1.6;margin-top:7px}.pro-hint{color:#527059}.rules{padding:16px 18px;border-radius:14px;background:#eff3ea;margin-bottom:18px}.rules-title{display:block;color:#243830;font-size:14px;font-weight:600;margin-bottom:7px}.rule{display:block;color:#627269;font-size:12px;line-height:1.8}.save{width:100%;height:50px;border:0;border-radius:12px;background:#173d35;color:#fff;font-size:16px}.save[disabled]{opacity:.65}
</style>
