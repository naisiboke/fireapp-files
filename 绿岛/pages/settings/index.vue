<template>
 <view class="settings-page fire-page-settings-index" :style="pageLayoutStyle">
  <AppFeedback :owner-id="feedbackOwnerId"/>
  <view class="head"><text class="title">{{panel==='data'?'数据管理':panel==='help'?'引导与帮助':'设置'}}</text><button class="close" aria-label="关闭" @tap="close">×</button></view>
  <template v-if="panel==='main'">
   <view class="account-card" @tap="openProfile"><view class="account-copy"><text class="account-name">{{profileName}}</text><text class="account-sub">{{membershipStatus}} · Fire生活账号</text></view><text class="chevron">›</text></view>
   <view class="member-card" @tap="openMembership"><view><text class="member-title">Fire生活通用会员</text><text class="member-sub">{{isMember?'查看会员权益':'¥9 / 月 · AI、社区与深度分析'}}</text></view><text class="member-action">查看 ›</text></view>
   <view class="redeem-card"><text class="redeem-title">会员兑换码</text><view class="redeem-row"><input v-model="redeemCode" class="redeem-input" maxlength="64" :disabled="redeeming" placeholder="输入完整兑换码"/><button class="redeem-button" :disabled="redeeming" @tap="redeemMembership">{{redeeming?'验证中…':'兑换'}}</button></view></view>
   <text class="section-title">通用</text>
   <view class="group">
    <view class="row" @tap="toggleSound"><view class="row-copy"><text class="row-title">操作提示音</text><text class="row-sub">记账和拔草完成时提醒</text></view><view class="switch" :class="{on:state.soundEnabled}" role="switch" :aria-checked="state.soundEnabled"><view class="thumb"/></view></view>
    <view class="row" @tap="openPrivacy"><view class="row-copy"><text class="row-title">隐私与权限</text></view><text class="chevron">›</text></view>
    <view class="row" @tap="checkUpdate"><view class="row-copy"><text class="row-title">检查更新</text><text class="row-sub">当前版本 {{versionLabel}}</text></view><text class="chevron">›</text></view>
   </view>
   <text class="section-title">帮助与反馈</text>
   <view class="group">
    <view class="row" @tap="openPanel('help')"><view class="row-copy"><text class="row-title">引导与帮助</text><text class="row-sub">启动说明、功能操作与计算说明</text></view><text class="chevron">›</text></view>
    <view class="row" @tap="copyContact"><view class="row-copy"><text class="row-title">问题反馈与奖励</text><text class="row-sub">微信 naisiboke520 · 点击复制</text></view><text class="chevron">›</text></view>
    <view class="row" @tap="openAbout"><view class="row-copy"><text class="row-title">关于 Fire生活</text></view><text class="chevron">›</text></view>
   </view>
   <text class="section-title">数据管理</text>
   <view class="group"><view class="row" @tap="openPanel('data')"><view class="row-copy"><text class="row-title">同步、导出与本机数据</text><text class="row-sub">{{syncText}}</text></view><text class="chevron">›</text></view></view>
   <text class="section-title">账号与安全</text>
   <view class="group">
    <view class="row" @tap="openProfile"><view class="row-copy"><text class="row-title">个人资料</text></view><text class="chevron">›</text></view>
    <view class="row" @tap="requestDeletion"><view class="row-copy"><text class="row-title danger-text">账号注销</text><text class="row-sub">提交注销申请，按流程处理云端资料</text></view><text class="chevron">›</text></view>
   </view>
   <button class="button logout" @tap="logout">退出账号</button>
   <text class="version">Fire生活 {{versionLabel}} · fireday.cn</text>
  </template>
  <template v-else-if="panel==='data'">
   <text class="panel-description">管理当前账号的数据。清除本机数据不会删除云端存档。</text>
   <view class="group">
    <view class="row" @tap="retrySync"><view class="row-copy"><text class="row-title">云端同步</text><text class="row-sub">{{syncText}}</text></view><text class="chevron">›</text></view>
    <view class="row" @tap="exportData"><view class="row-copy"><text class="row-title">导出我的数据</text><text class="row-sub">下载账户资料、记录和社区内容</text></view><text class="chevron">›</text></view>
   </view>
   <text class="section-title">本机数据</text>
   <view class="group"><view class="row" @tap="confirmReset"><view class="row-copy"><text class="row-title danger-text">清除当前账号的本机数据</text><text class="row-sub">未同步的记录会丢失，操作前请先确认同步完成</text></view><text class="chevron">›</text></view></view>
  </template>
  <template v-else>
   <view class="group">
    <view class="row" @tap="replayGuide"><view class="row-copy"><text class="row-title">查看功能引导</text><text class="row-sub">重新认识首页、记账和工具入口</text></view><text class="chevron">›</text></view>
    <view class="row" @tap="replayOnboarding"><view class="row-copy"><text class="row-title">查看启动说明</text><text class="row-sub">了解应用和初次使用流程</text></view><text class="chevron">›</text></view>
   </view>
   <text class="section-title">关于计算</text><view class="info-card"><text>固定收益按月复利，每月按填写金额在月末存入。自由模式按退休后消费与提取率计算，目标模式按目标金额计算。结果用于生活规划，不构成投资建议。</text></view>
  </template>
 </view>
</template>
<script>
import { accountId } from '@/utils/account-cache.js'
import { requestGuideReplay, clearGuideSession } from '@/utils/spotlight-guide.js'
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
  data() { return { state, panel:'main', closing: false, redeemCode: '', redeeming: false } },
  computed: {
    versionLabel() { return installedVersion().name },
    profileName() { return (state.profile && state.profile.name) || '自由的旅人' },
    avatarLetter() { return this.profileName.slice(0, 1) },
    isMember() { return isMembershipActive(state) },
    membershipStatus() { return membershipText(state) },
    syncText() {
      if (!isApiConfigured()) return '未配置云端 API，当前使用本机缓存'
      if(state.cloudSync?.status==='conflict')return '存档版本不同，点此选择同步版本'
      if (state.cloudSync && state.cloudSync.status === 'error') return '同步失败：' + state.cloudSync.message
      if (state.cloudSync && state.cloudSync.status === 'synced') return state.cloudSync.message || '已同步'
      return '等待同步'
    },
  },
  onLoad(options){this.panel=['data','help'].includes(options?.panel)?options.panel:'main'},
  methods: {
    openPanel(panel){uni.navigateTo({url:'/pages/settings/index?panel='+panel})},
    close() { if(this.panel!=='main'){uni.navigateBack({fail:()=>uni.redirectTo({url:'/pages/settings/index'})});return} if (this.closing) return; this.closing = true; uni.reLaunch({ url: '/pages/profile/index', complete: () => { this.closing = false } }) },
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
    replayGuide() {
      if(!requestGuideReplay(accountId()))return showNotice({title:'请先登录后查看引导',icon:'none'})
      uni.switchTab({url:'/pages/index/index',fail:()=>showNotice({title:'暂时无法打开首页，请稍后重试',icon:'none'})})
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
      if(restored.conflict){uni.navigateTo({url:'/pages/sync-conflict/index'});return}
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
    async confirmReset() {
      const uid=accountId()
      if(!uid)return showNotice({title:'请先登录',icon:'none'})
      const first=await showDialog({title:'清除当前账号的本机数据？',content:'会删除本机保存的收支、目标、草稿、消息和已读状态。尚未同步的记录无法恢复。云端存档和其他账号的本机数据不会删除。',confirmText:'继续',showCancel:true})
      if(!first.confirm||uid!==accountId())return
      const second=await showDialog({title:'确认已保留重要记录？',content:'请先完成云端同步或导出。确认清除后将退出登录，再次登录可读取已有云端存档。',confirmText:'确认清除',confirmColor:'#a35d4e',showCancel:true})
      if(!second.confirm||uid!==accountId())return
      try{
        clearGuideSession()
        endAccountSession();reset()
        const suffix=':account:'+encodeURIComponent(uid)
        for(const key of uni.getStorageInfoSync().keys)if(key.endsWith(suffix))uni.removeStorageSync(key)
        await signOutAccountSession()
        ;['fire_login_status','fire_access_token','fire_login_token','fire_account_email','fire_account_uid'].forEach(key=>uni.removeStorageSync(key))
        uni.reLaunch({url:'/pages/login/login'})
      }catch(error){showNotice({title:'清除未完成，请检查本机存储后重试',icon:'none'})}
    },
    replayOnboarding() { state.started = false; uni.reLaunch({ url: '/pages/onboarding/onboarding' }) },
  },
  onShow() { refreshMembershipFromServer().catch(error=>console.warn('[membership-refresh]',error.code||'')) },
  onBackPress() {
    if (dismissFeedback(this.feedbackOwnerId)) return true
 if(this.panel!=='main')return false
 if (!this.closing) this.close(); return true },
}
</script>

<style>
.settings-page{min-height:100vh;padding:calc(72px + var(--fire-status-top, env(safe-area-inset-top))) 16px calc(34px + env(safe-area-inset-bottom));background:#f3f4f2;box-sizing:border-box}.head{position:fixed;z-index:30;top:0;left:0;right:0;height:calc(58px + var(--fire-status-top, env(safe-area-inset-top)));padding:var(--fire-status-top, env(safe-area-inset-top)) 18px 0;display:flex;align-items:center;justify-content:space-between;background:rgba(243,244,242,.96);border-bottom:1px solid #dfe7dd;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#173d35}.close{width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:27px;color:#173d35}.account-card,.member-card,.group,.info-card{border-radius:16px;background:#fff;border:1px solid #e2e9e0;box-shadow:0 4px 14px rgba(36,56,48,.05)}.account-card{display:flex;align-items:center;gap:12px;padding:16px;margin-bottom:12px}.avatar{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#d7e9d8;color:#315f4a;font-size:21px;font-weight:700}.account-copy{flex:1;min-width:0}.account-name{display:block;color:#173d35;font-size:16px;font-weight:600}.account-sub{display:block;color:#71807a;font-size:12px;margin-top:5px}.chevron{color:#8b9b8f;font-size:25px}.member-card{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:linear-gradient(135deg,#173d35,#3f765e);color:#fff}.member-kicker{display:block;color:#d7e9d8;font-size:11px;letter-spacing:.12em}.member-title{display:block;color:#fff;font-size:17px;font-weight:700;margin-top:6px}.member-sub{display:block;color:#d7e9d8;font-size:12px;margin-top:5px}.member-action{color:#fff;font-size:14px}.redeem-card{padding:16px 18px;margin-bottom:4px;border-radius:16px;background:#173d35;color:#fff;box-shadow:0 5px 16px rgba(23,61,53,.14)}.redeem-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.redeem-title{display:block;font-size:15px;font-weight:700}.redeem-sub{display:block;margin-top:5px;color:#d7e9d8;font-size:12px}.redeem-price{color:#d7e9d8;font-size:12px;white-space:nowrap}.redeem-row{display:flex;gap:8px;margin-top:14px}.redeem-input{flex:1;min-width:0;height:42px;padding:0 12px;border-radius:10px;background:#fff;color:#173d35;font-size:14px;box-sizing:border-box}.redeem-placeholder{color:#9aa99d}.redeem-button{width:70px;height:42px;border-radius:10px;background:#d7e9d8;color:#173d35;display:flex;align-items:center;justify-content:center;font-size:13px}.redeem-button.disabled{opacity:.6}.redeem-hint{display:block;margin-top:10px;color:#bcd8c0;font-size:11px}.contact-card{display:flex;align-items:center;gap:12px;padding:16px 14px;border-radius:16px;background:#fff;border:1px solid #e2e9e0;box-shadow:0 4px 14px rgba(36,56,48,.05)}.contact-copy{flex:1;min-width:0}.contact-title{display:block;color:#243830;font-size:14px;font-weight:600}.contact-sub{display:block;color:#315f4a;font-size:13px;font-weight:600;margin-top:6px}.contact-reward{display:block;color:#71807a;font-size:11px;line-height:1.5;margin-top:6px}.contact-button{padding:9px 10px;border-radius:10px;background:#e5eee4;color:#173d35;font-size:12px;white-space:nowrap}.section-title{display:block;color:#71807a;font-size:12px;margin:22px 8px 8px}.group{overflow:hidden}.row{min-height:68px;display:flex;align-items:center;gap:11px;padding:10px 14px;border-bottom:1px solid #eef2ee;box-sizing:border-box}.row:last-child{border-bottom:0}.row-icon{width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:#e8f0e6;color:#315f4a;font-size:16px;flex-shrink:0}.row-icon.danger{background:#f6e8e3;color:#9b5e50}.row-copy{flex:1;min-width:0}.row-title{display:block;color:#243830;font-size:14px}.row-sub{display:block;color:#71807a;font-size:11px;line-height:1.45;margin-top:4px}.danger-text{color:#9b5e50}.switch{width:44px;height:26px;padding:3px;border-radius:18px;background:#cbd4ca;box-sizing:border-box;display:flex;align-items:center}.switch.on{background:#527059}.thumb{width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.16);transition:transform .16s}.switch.on .thumb{transform:translateX(18px)}.info-card{padding:15px;margin-top:8px;color:#52605a;font-size:12px;line-height:1.7}.button{height:48px;margin-top:12px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:14px}.button.light{background:#e5eee4;color:#173d35}.button.danger{background:#94685c;color:#fff}.button.logout{background:#fff2ee;color:#a35d4e;border:1px solid #efc8be}.version{display:block;text-align:center;color:#8b9489;font-size:11px;margin-top:24px}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-settings-index > .head{height:var(--fire-header-height);padding-top:var(--fire-page-top);box-sizing:border-box}
 .fire-page-settings-index{padding-top:var(--fire-content-top)}
.fire-page-settings-index>.head{background:#f3f4f2;opacity:1;isolation:isolate;padding-top:var(--fire-status-top);height:var(--fire-header-height);box-shadow:0 -60px 0 60px #f3f4f2}
.fire-page-settings-index{padding-top:var(--fire-content-top)}
.head button.close{background:transparent;border:0;padding:0;min-width:40px;box-shadow:none}
.member-card{background:#fff;color:#243830;margin-bottom:12px;box-shadow:none}
.member-title,.member-action{color:#243830}.member-sub{color:#71807a}
.redeem-card{background:#fff;border:1px solid #e2e9e0;box-shadow:none;color:#243830;margin-bottom:10px}
.redeem-input{background:#f4f6f1;border:1px solid #e0e7dd}
.redeem-button{min-width:70px;min-height:42px;padding:0;border:0}
.group,.account-card,.contact-card{box-shadow:none}
.row{min-height:60px;padding:13px 16px}.row-title{font-size:14px}
.button.logout{width:100%;margin-top:28px;background:transparent;color:#5d6d61;border:1px solid #ccd6cb;box-shadow:none}
.panel-description{display:block;font-size:12px;line-height:1.8;color:#71807a;margin:0 4px 15px}
</style>
