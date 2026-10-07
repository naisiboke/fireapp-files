<template>
  <view class="settings-page">
    <view class="head"><text class="title">设置</text><view class="close" role="button" aria-label="关闭" @tap="close">×</view></view>
    <text class="h1">把数据和选择，<br>交给你自己</text>
    <text class="lead">FIRE 绿岛会优先使用已配置的云端服务；本设备仅保留登录凭证、临时缓存和离线过渡数据。</text>
    <view class="card sound-card"><view class="sound-copy"><text class="card-title">操作提示音</text><text class="card-sub">记账和拔草完成时，轻轻提醒一下</text></view><view class="switch" :class="{ on: state.soundEnabled }" role="switch" :aria-checked="state.soundEnabled" @tap="toggleSound"><view class="switch-thumb"></view></view></view>
    <view class="card privacy-card"><text class="card-title">隐私设置</text><text class="card-p">你可以随时查看数据如何保存、使用和删除。每个开关的修改会尝试同步到云端。</text>
      <view class="setting-row" @tap="toggleCloudSync"><view class="row-copy"><text class="row-title">云端同步</text><text class="row-sub">服务器可用时同步你的 FIRE 数据</text></view><view class="mini-switch" :class="{ on: state.privacySettings.cloudSync }"><view class="mini-thumb"></view></view></view>
      <view class="setting-row" @tap="togglePersonalized"><view class="row-copy"><text class="row-title">个性化内容</text><text class="row-sub">用于调整任务、阅读和社区推荐</text></view><view class="mini-switch" :class="{ on: state.privacySettings.personalizedContent }"><view class="mini-thumb"></view></view></view>
      <view class="privacy-link" @tap="openPrivacy"><text>隐私政策</text><text class="link-meta">v1.0 · 2026-10-07 ›</text></view>
    </view>
    <view class="card"><text class="card-title">数据管理</text><text class="card-p">账户资料、财务与资产、收入和消费、记账、拔草、英雄传任务、EXP 与徽章、社区内容、收藏、阅读记录和书架都属于你的数据。</text><text class="card-p">当前云端服务状态：{{ syncText }}</text><view class="data-actions"><view class="action outline" @tap="exportData"><text>导出我的数据</text></view><view class="action outline" @tap="retrySync"><text>重试云端同步</text></view><view class="action danger-outline" @tap="deleteData"><text>删除我的数据</text></view></view><view class="privacy-link" @tap="requestDeletion"><text>账号注销</text><text class="link-meta">提交注销申请 ›</text></view></view>
    <view class="card category-card"><text class="card-title">数据使用说明</text><view v-for="item in categories" :key="item.title" class="category-row"><text class="category-title">{{ item.title }}</text><text class="category-text">{{ item.text }}</text></view></view>
    <view class="card note"><text class="card-title">关于计算</text><text class="card-p">固定收益假设、月度复利、每月按填写金额在月末存入。自由模式按退休后消费与提取率计算，目标模式按目标金额计算。最多模拟 100 年，未达标时显示暂未可达。</text></view>
    <view class="btn light fire-button-secondary" @tap="replayOnboarding"><text class="btn-text light-text">重新查看启动流程</text></view><view class="btn danger fire-button-danger" @tap="confirmReset"><text class="btn-text">清除本机缓存并重新开始</text></view>
    <text class="version">隐私政策 v1.0 · 最后更新 2026-10-07</text>
  </view>
</template>

<script>
import { state, reset, persist, syncStateToServer } from '@/store/index.js'
import { isApiConfigured, savePrivacySettings, exportUserData, deleteUserData, requestAccountDeletion } from '@/utils/api-service.js'
export default {
  data() { return { state, categories: [
    { title: '账户和个人资料', text: '用于登录、识别你的账户、保存昵称和偏好；当前项目没有配置真实客服联系信息。' },
    { title: '财务数据', text: '用于计算自由日、目标资产、进度和诊断结果，不会改变记账、拔草或社区数据。' },
    { title: '记账和拔草计划', text: '用于保存收入、消费、冷静期、已购买和已省下状态，并在相关页面同步显示。' },
    { title: '成长、任务、EXP 和徽章', text: '用于记录 FIRE 英雄传任务进度、等级和成长反馈。' },
    { title: '社区内容和互动', text: '用于保存发帖、草稿、收藏和互动记录，并在登录后跨设备读取。' },
    { title: '阅读记录和书架', text: '用于保存阅读状态、阅读时长和书架清单。' },
  ] } },
  computed: { syncText() { if (!isApiConfigured()) return '未配置云端 API（本次不会伪造同步成功）'; if (state.cloudSync && state.cloudSync.status === 'error') return '同步失败：' + state.cloudSync.message; if (state.cloudSync && state.cloudSync.status === 'synced') return state.cloudSync.message || '已同步'; return '等待同步' } },
  methods: {
    close() { const pages = getCurrentPages(); if (pages.length > 1) return uni.navigateBack({ delta: 1 }); uni.reLaunch({ url: '/pages/profile/index' }) },
    toggleSound() { state.soundEnabled = !state.soundEnabled; persist() },
    async updatePrivacy(patch) { state.privacySettings = { ...state.privacySettings, ...patch }; persist(); if (!isApiConfigured()) return uni.showToast({ title: '云端 API 尚未配置，已保留本机过渡设置', icon: 'none' }); try { await savePrivacySettings(state.privacySettings); uni.showToast({ title: '隐私设置已同步', icon: 'none' }) } catch (error) { uni.showToast({ title: error.message || '同步失败，请重试', icon: 'none' }) } },
    toggleCloudSync() { this.updatePrivacy({ cloudSync: !state.privacySettings.cloudSync }) }, togglePersonalized() { this.updatePrivacy({ personalizedContent: !state.privacySettings.personalizedContent }) },
    openPrivacy() { uni.navigateTo({ url: '/pages/privacy/index' }) },
    async retrySync() { if (!isApiConfigured()) return uni.showToast({ title: '云端 API 尚未配置，请先完成服务端配置', icon: 'none' }); const result = await syncStateToServer(); if (result.synced) uni.showToast({ title: '云端同步完成', icon: 'none' }); else uni.showToast({ title: (state.cloudSync && state.cloudSync.message) || '同步失败，请稍后重试', icon: 'none' }) },
    async exportData() { if (!isApiConfigured()) return uni.showToast({ title: '云端 API 尚未配置，暂时无法导出', icon: 'none' }); try { await exportUserData(); uni.showToast({ title: '导出请求已提交', icon: 'none' }) } catch (error) { uni.showToast({ title: error.message || '导出失败，请重试', icon: 'none' }) } },
    deleteData() { uni.showModal({ title: '删除我的数据？', content: '这会删除云端数据（若服务已配置）并清除本机缓存，操作不可撤销。', success: async (res) => { if (!res.confirm) return; if (isApiConfigured()) { try { await deleteUserData() } catch (error) { return uni.showToast({ title: error.message || '云端删除失败，请重试', icon: 'none' }) } } uni.clearStorageSync(); reset(); state.started = false; uni.showToast({ title: isApiConfigured() ? '数据已删除' : '本机缓存已清除', icon: 'none' }); setTimeout(() => uni.reLaunch({ url: '/pages/onboarding/onboarding' }), 250) } }) },
    requestDeletion() { uni.showModal({ title: '提交账号注销？', content: '注销会停止账户使用并按服务端流程处理数据删除。', success: async (res) => { if (!res.confirm) return; if (!isApiConfigured()) return uni.showToast({ title: '云端 API 尚未配置，暂时无法提交注销', icon: 'none' }); try { await requestAccountDeletion(); uni.showToast({ title: '注销申请已提交', icon: 'none' }) } catch (error) { uni.showToast({ title: error.message || '提交失败，请重试', icon: 'none' }) } } }) },
    replayOnboarding() { state.started = false; uni.reLaunch({ url: '/pages/onboarding/onboarding' }) },
    confirmReset() { uni.showModal({ title: '清除本机数据？', content: '会清除本机缓存并重新进入引导流程；云端数据需要在数据管理中单独删除。', success: (res) => { if (!res.confirm) return; uni.clearStorageSync(); reset(); state.started = false; uni.reLaunch({ url: '/pages/onboarding/onboarding' }) } }) },
  }, onBackPress() { this.close(); return true },
}
</script>

<style>
.settings-page{min-height:100vh;padding:calc(76px + env(safe-area-inset-top)) 24px calc(40px + env(safe-area-inset-bottom));background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:30;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 16px 0 24px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;background:rgba(253,253,251,.96);border-bottom:1px solid #edf1eb}.title{font-size:18px;font-weight:600;color:#243830}.close{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:27px;line-height:1;color:#243830;border-radius:50%}.close:active{background:#edf2e9}.h1{display:block;font-size:26px;font-weight:700;color:#143e37;line-height:1.4}.lead{display:block;font-size:13px;color:#71807a;margin:8px 0 24px;line-height:1.6}.card{padding:18px;background:#fff;border:1px solid #e5e9e0;border-radius:14px;margin-bottom:12px}.card-title{display:block;font-size:15px;font-weight:600;color:#243830;margin-bottom:8px}.card-sub,.row-sub{display:block;font-size:12px;color:#71807a;margin-top:4px;line-height:1.5}.card-p{display:block;font-size:13px;color:#52605a;line-height:1.75;margin-top:6px}.sound-card,.setting-row{display:flex;align-items:center;justify-content:space-between;gap:14px}.sound-copy,.row-copy{flex:1;min-width:0}.switch,.mini-switch{border-radius:20px;background:#cbd2c7;padding:3px;display:flex;align-items:center;flex-shrink:0}.switch{width:46px;height:28px}.mini-switch{width:40px;height:24px}.switch.on,.mini-switch.on{background:#527059}.switch-thumb,.mini-thumb{background:#fff;border-radius:50%;box-shadow:0 1px 3px rgba(36,56,48,.13);transition:transform .16s}.switch-thumb{width:22px;height:22px}.mini-thumb{width:18px;height:18px}.switch.on .switch-thumb{transform:translateX(18px)}.mini-switch.on .mini-thumb{transform:translateX(16px)}.setting-row{padding:13px 0;border-top:1px solid #eef2ee}.row-title,.category-title{display:block;color:#243830;font-size:14px;font-weight:500}.privacy-link{min-height:44px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #eef2ee;color:#173d35;font-size:14px}.link-meta{color:#71807a;font-size:12px}.category-row{padding:10px 0;border-top:1px solid #eef2ee}.category-text{display:block;color:#52605a;font-size:13px;line-height:1.65;margin-top:4px}.data-actions{display:flex;gap:10px;margin-top:14px}.action{flex:1;min-height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px}.outline{color:#173d35;border:1px solid #b8cbb9}.danger-outline{color:#875b51;border:1px solid #d7b6ad}.card.note{background:#eff2e9;border:0;border-left:2px solid #bfd0b5;border-radius:0 14px 14px 0}.btn{margin-top:12px;min-height:48px;border-radius:12px;display:flex;justify-content:center;align-items:center}.btn.light{background:#eef2e8}.btn.danger{background:#94685c}.btn-text{font-size:14px;font-weight:500;color:#fff}.btn-text.light-text{color:#243830}.version{display:block;text-align:center;font-size:12px;color:#8b9489;margin-top:32px}
</style>