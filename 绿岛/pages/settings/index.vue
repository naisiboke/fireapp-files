<template>
  <view class="settings-page fire-page-settings-index" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="head"><text class="title">设置</text><view class="close" aria-label="关闭" @tap="close">×</view></view>

    <view class="account-card" @tap="openProfile">
      <view class="avatar"><text>{{ avatarLetter }}</text></view>
      <view class="account-copy"><text class="account-name">{{ profileName }}</text><text class="account-sub">{{ membershipStatus }} · Fire生活账号</text></view>
      <text class="chevron">›</text>
    </view>

    <view class="member-card" @tap="openMembership">
      <view><text class="member-kicker">FIRE生活会员</text><text class="member-title">通用会员 ¥9 / 月</text><text class="member-sub">AI 无限使用 · 社区 · 深度分析</text></view>
      <text class="member-action">{{ isMember ? '查看' : '开通' }} ›</text>
    </view>

    <view class="redeem-card">
      <view class="redeem-head"><view><text class="redeem-title">会员兑换码</text><text class="redeem-sub">输入兑换码开通 Fire生活通用会员</text></view><text class="redeem-price">¥9 / 月</text></view>
      <view class="redeem-row"><input v-model="redeemCode" class="redeem-input" maxlength="64" :disabled="redeeming" placeholder="填写 code 字段的完整兑换码" placeholder-class="redeem-placeholder" /><view class="redeem-button" :class="{ disabled: redeeming }" @tap="redeemMembership"><text>{{ redeeming ? '验证中…' : '兑换' }}</text></view></view>
      <text class="redeem-hint">按兑换码天数开通；请填写 code 内容，不是 _id</text>
    </view>

    <text class="section-title">联系客服与反馈</text>
    <view class="contact-card">
      <view class="contact-copy">
        <text class="contact-title">问题反馈与奖励</text>
        <text class="contact-sub">微信号：naisiboke520</text>
        <text class="contact-reward">微信 naisiboke520：反馈问题，核实后发放 VIP 兑换码</text>
      </view>
      <view class="contact-button" @tap="copyContact"><text>复制微信号</text></view>
    </view>

    <text class="section-title">通用</text>
    <view class="group">
      <view class="row" @tap="toggleSound"><view class="row-icon">◌</view><view class="row-copy"><text class="row-title">操作提示音</text><text class="row-sub">记账和拔草完成时提醒</text></view><view class="switch" :class="{ on: state.soundEnabled }"><view class="thumb"></view></view></view>
      <view class="row" @tap="openPrivacy"><view class="row-icon">◇</view><view class="row-copy"><text class="row-title">隐私与权限</text><text class="row-sub">云端同步、个性化内容和守护动画</text></view><text class="chevron">›</text></view>
      <view class="row" @tap="checkUpdate"><view class="row-icon">↥</view><view class="row-copy"><text class="row-title">检查更新</text><text class="row-sub">当前版本 {{ versionLabel }}</text></view><text class="chevron">›</text></view>
      <view class="row" @tap="openAbout"><view class="row-icon">i</view><view class="row-copy"><text class="row-title">关于 Fire生活</text><text class="row-sub">版本与服务说明</text></view><text class="chevron">›</text></view>
    </view>

    <text class="section-title">数据与安全</text>
    <view class="group">
      <view class="row" @tap="retrySync"><view class="row-icon">↻</view><view class="row-copy"><text class="row-title">云端同步</text><text class="row-sub">{{ syncText }}</text></view><text class="chevron">›</text></view>
      <view class="row" @tap="exportData"><view class="row-icon">⇩</view><view class="row-copy"><text class="row-title">导出我的数据</text><text class="row-sub">下载账户资料、记录和社区内容</text></view><text class="chevron">›</text></view>
      <view class="row" @tap="requestDeletion"><view class="row-icon danger">!</view><view class="row-copy"><text class="row-title danger-text">账号注销</text><text class="row-sub">提交注销申请并删除云端资料</text></view><text class="chevron">›</text></view>
    </view>

    <text class="section-title">关于计算</text>
    <view class="info-card"><text>固定收益按月复利，每月按填写金额在月末存入。自由模式按退休后消费与提取率计算，目标模式按目标金额计算。结果用于生活规划，不构成投资建议。</text></view>

    <view class="button light" @tap="replayOnboarding"><text>重新查看启动流程</text></view>
    <view class="button danger" @tap="confirmReset"><text>清除本机缓存并重新开始</text></view>
    <view class="button logout" @tap="logout"><text>退出账号</text></view>
    <text class="version">Fire生活 {{ versionLabel }} · fireday.cn</text>
  </view>
</template>

<script>
import { clearOptionsDraft } from '@/utils/session-drafts.js'
import { checkAppUpdate, installedVersion } from '@/utils/app-update.js'
import AppFeedback from '@/components/AppFeedback.vue'
import { feedbackPageMixin } from '@/utils/feedback-page.js'
import { showDialog, showNotice, dismissFeedback } from '@/utils/feedback.js'
import { state, reset, persist, syncStateToServer, hydrateFromServer, endAccountSession, redeemMembershipForAccount, refreshMembershipFromServer } from '@/store/index.js'
import { signOutAccountSession } from '@/utils/cloudbase-auth.js'
import { CS } from '@/utils/community-store.js'
import { isApiConfigured, savePrivacySettings, exportUserData, deleteUserData, requestAccountDeletion } from '@/utils/api-service.js'
import { isMembershipActive, membershipText } from '@/utils/membership.js'

export default {
  components: { AppFeedback },
  mixins: [feedbackPageMixin],
  data() { return { state, closing: false, redeemCode: '', redeeming: false } },
  computed: {
    versionLabel() { return installedVersion().name },
    profileName() { return (state.profile && state.profile.name) || '自由的旅人' },
    avatarLetter() { return this.profileName.slice(0, 1) },
    isMember() { return isMembershipActive(state) },
    membershipStatus() { return membershipText(state) },
    syncText() {
      if (!isApiConfigured()) return '未配置云端 API，当前使用本机缓存'
      if (state.cloudSync && state.cloudSync.status === 'error') return '同步失败：' + state.cloudSync.message
      if (state.cloudSync && state.cloudSync.status === 'synced') return state.cloudSync.message || '已同步'
      return '等待同步'
    },
  },
  methods: {
    close() { if (this.closing) return; this.closing = true; uni.reLaunch({ url: '/pages/profile/index', complete: () => { this.closing = false } }) },
    openProfile() { uni.navigateTo({ url: '/pages/profile/edit' }) },
    openMembership() { uni.navigateTo({ url: '/pages/profile/membership' }) },
    async redeemMembership() {
      if(this.redeeming)return
      const code=String(this.redeemCode||'').trim()
      if(!code)return showNotice({title:'请输入兑换码',icon:'none'})
      if(/^[a-f0-9]{24,32}$/i.test(code))return showNotice({title:'请填写 code 字段的兑换码，不是数据库 _id',icon:'none'})
      this.redeeming=true
      try{
        const result=await redeemMembershipForAccount(code)
        this.redeemCode='';clearOptionsDraft(this)
        showNotice({title:result.alreadyRedeemed?'此码已兑换，会员状态已刷新':'已兑换 '+result.durationDays+' 天会员',icon:'none'})
      }catch(error){showNotice({title:error.message||'兑换失败，请重试',icon:'none'})}
      finally{this.redeeming=false}
    },
    copyContact() {
      uni.setClipboardData({
        data: 'naisiboke520',
        success: () => showNotice({ title: '微信号已复制', icon: 'none' }),
        fail: () => showDialog({ title: '问题反馈与奖励', content: 'naisiboke520\\n\\n反馈实用问题并被采纳，可获赠 1 个月 Fire生活会员。', showCancel: false }),
      })
    },
    checkUpdate() { checkAppUpdate() },
    openAbout() { showDialog({ title: '关于 Fire生活', content: '记录自由计划、消费行动和长期生活选择。', showCancel: false }) },
    toggleSound() { state.soundEnabled = !state.soundEnabled; persist() },
    async updatePrivacy(patch) {
      state.privacySettings = { ...state.privacySettings, ...patch }; persist()
      if (!isApiConfigured()) return showNotice({ title: '已保留本机设置', icon: 'none' })
      try { const result=await syncStateToServer();if(!result.synced)throw new Error(state.cloudSync.message); showNotice({ title: '隐私设置已同步', icon: 'none' }) } catch (error) { showNotice({ title: error.message || '同步失败，请重试', icon: 'none' }) }
    },
    openPrivacy() { uni.navigateTo({ url: '/pages/privacy/index' }) },
    async retrySync() {
      if (!isApiConfigured()) return showNotice({ title: '请先完成云端配置', icon: 'none' })
      const restored=await hydrateFromServer()
      if(!restored.loaded)return showNotice({title:state.cloudSync.message,icon:'none'})
      const result = await syncStateToServer()
      const community=await CS.hydrate()
      showNotice({ title: result.synced && community.ok ? '云端同步完成' : (!community.ok ? '部分内容尚未同步，本机副本已保留，请重试' : ((state.cloudSync && state.cloudSync.message) || '同步失败')), icon: 'none' })
    },
    async exportData() {
      if (!isApiConfigured()) return showNotice({ title: '云端 API 尚未配置', icon: 'none' })
      try { await exportUserData(); showNotice({ title: '导出请求已提交', icon: 'none' }) } catch (error) { showNotice({ title: error.message || '导出失败', icon: 'none' }) }
    },
    requestDeletion() {
      showDialog({ title: '提交账号注销？', content: '注销会停止账户使用并按服务端流程处理数据删除。', success: async res => {
        if (!res.confirm) return
        if (!isApiConfigured()) return showNotice({ title: '云端 API 尚未配置', icon: 'none' })
        try { await requestAccountDeletion(); showNotice({ title: '注销申请已提交', icon: 'none' }) } catch (error) { showNotice({ title: error.message || '提交失败', icon: 'none' }) }
      }})
    },
    logout() {
      showDialog({ title: '退出当前账号？', content: '退出后需要重新登录，云端数据不会被删除。', confirmText: '退出', confirmColor: '#a35d4e', success: async res => {
        if (!res.confirm) return
        await syncStateToServer()
        endAccountSession()
        await signOutAccountSession()
        ;['fire_login_status', 'fire_access_token', 'fire_login_token', 'fire_account_email'].forEach(key => uni.removeStorageSync(key))
        uni.removeStorageSync('fire_client_id')
        uni.reLaunch({ url: '/pages/login/login' })
      }})
    },
    confirmReset() {
      showDialog({ title: '清除本机数据？', content: '会清除本机缓存并重新进入引导流程。', success: res => {
        if (!res.confirm) return
        uni.clearStorageSync(); reset(); state.started = false; uni.reLaunch({ url: '/pages/onboarding/onboarding' })
      }})
    },
    replayOnboarding() { state.started = false; uni.reLaunch({ url: '/pages/onboarding/onboarding' }) },
  },
  onShow() { refreshMembershipFromServer().catch(error=>console.warn('[membership-refresh]',error.code||'')) },
  onBackPress() {
    if (dismissFeedback(this.feedbackOwnerId)) return true
 if (!this.closing) this.close(); return true },
}
</script>

<style>
.settings-page{min-height:100vh;padding:calc(72px + var(--fire-status-top, env(safe-area-inset-top))) 16px calc(34px + env(safe-area-inset-bottom));background:#f3f4f2;box-sizing:border-box}.head{position:fixed;z-index:30;top:0;left:0;right:0;height:calc(58px + var(--fire-status-top, env(safe-area-inset-top)));padding:var(--fire-status-top, env(safe-area-inset-top)) 18px 0;display:flex;align-items:center;justify-content:space-between;background:rgba(243,244,242,.96);border-bottom:1px solid #dfe7dd;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#173d35}.close{width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:27px;color:#173d35}.account-card,.member-card,.group,.info-card{border-radius:16px;background:#fff;border:1px solid #e2e9e0;box-shadow:0 4px 14px rgba(36,56,48,.05)}.account-card{display:flex;align-items:center;gap:12px;padding:16px;margin-bottom:12px}.avatar{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#d7e9d8;color:#315f4a;font-size:21px;font-weight:700}.account-copy{flex:1;min-width:0}.account-name{display:block;color:#173d35;font-size:16px;font-weight:600}.account-sub{display:block;color:#71807a;font-size:12px;margin-top:5px}.chevron{color:#8b9b8f;font-size:25px}.member-card{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:linear-gradient(135deg,#173d35,#3f765e);color:#fff}.member-kicker{display:block;color:#d7e9d8;font-size:11px;letter-spacing:.12em}.member-title{display:block;color:#fff;font-size:17px;font-weight:700;margin-top:6px}.member-sub{display:block;color:#d7e9d8;font-size:12px;margin-top:5px}.member-action{color:#fff;font-size:14px}.redeem-card{padding:16px 18px;margin-bottom:4px;border-radius:16px;background:#173d35;color:#fff;box-shadow:0 5px 16px rgba(23,61,53,.14)}.redeem-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.redeem-title{display:block;font-size:15px;font-weight:700}.redeem-sub{display:block;margin-top:5px;color:#d7e9d8;font-size:12px}.redeem-price{color:#d7e9d8;font-size:12px;white-space:nowrap}.redeem-row{display:flex;gap:8px;margin-top:14px}.redeem-input{flex:1;min-width:0;height:42px;padding:0 12px;border-radius:10px;background:#fff;color:#173d35;font-size:14px;box-sizing:border-box}.redeem-placeholder{color:#9aa99d}.redeem-button{width:70px;height:42px;border-radius:10px;background:#d7e9d8;color:#173d35;display:flex;align-items:center;justify-content:center;font-size:13px}.redeem-button.disabled{opacity:.6}.redeem-hint{display:block;margin-top:10px;color:#bcd8c0;font-size:11px}.contact-card{display:flex;align-items:center;gap:12px;padding:16px 14px;border-radius:16px;background:#fff;border:1px solid #e2e9e0;box-shadow:0 4px 14px rgba(36,56,48,.05)}.contact-copy{flex:1;min-width:0}.contact-title{display:block;color:#243830;font-size:14px;font-weight:600}.contact-sub{display:block;color:#315f4a;font-size:13px;font-weight:600;margin-top:6px}.contact-reward{display:block;color:#71807a;font-size:11px;line-height:1.5;margin-top:6px}.contact-button{padding:9px 10px;border-radius:10px;background:#e5eee4;color:#173d35;font-size:12px;white-space:nowrap}.section-title{display:block;color:#71807a;font-size:12px;margin:22px 8px 8px}.group{overflow:hidden}.row{min-height:68px;display:flex;align-items:center;gap:11px;padding:10px 14px;border-bottom:1px solid #eef2ee;box-sizing:border-box}.row:last-child{border-bottom:0}.row-icon{width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:#e8f0e6;color:#315f4a;font-size:16px;flex-shrink:0}.row-icon.danger{background:#f6e8e3;color:#9b5e50}.row-copy{flex:1;min-width:0}.row-title{display:block;color:#243830;font-size:14px}.row-sub{display:block;color:#71807a;font-size:11px;line-height:1.45;margin-top:4px}.danger-text{color:#9b5e50}.switch{width:44px;height:26px;padding:3px;border-radius:18px;background:#cbd4ca;box-sizing:border-box;display:flex;align-items:center}.switch.on{background:#527059}.thumb{width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.16);transition:transform .16s}.switch.on .thumb{transform:translateX(18px)}.info-card{padding:15px;margin-top:8px;color:#52605a;font-size:12px;line-height:1.7}.button{height:48px;margin-top:12px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px}.button.light{background:#e5eee4;color:#173d35}.button.danger{background:#94685c;color:#fff}.button.logout{background:#fff2ee;color:#a35d4e;border:1px solid #efc8be}.version{display:block;text-align:center;color:#8b9489;font-size:11px;margin-top:24px}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-settings-index > .head{height:var(--fire-header-height);padding-top:var(--fire-page-top);box-sizing:border-box}
 .fire-page-settings-index{padding-top:var(--fire-content-top)}
</style>
