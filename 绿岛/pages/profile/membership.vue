<template>
  <view class="member-page">
    <view class="head"><text class="title">FIRE PRO</text><text class="close" @tap="close">×</text></view>

    <view class="hero">
      <text class="kicker">FIRE Fire生活</text>
      <text class="hero-title">把长期计划，交给更好的自己</text>
      <text class="hero-sub">Pro 会员将解锁更完整的规划工具和成长记录。</text>
    </view>

    <view class="pro-card">
      <view class="pro-head"><text class="pro-name">FIRE PRO</text><text class="pro-badge">¥9 / 月</text></view>
      <text class="pro-desc">为认真规划自由生活的人准备</text><text class="member-status">{{ membershipStatus }}</text><view class="price"><text class="price-num">¥9</text><text class="price-unit"> / 月</text></view>
      <view class="benefit" v-for="item in benefits" :key="item"><text class="check">✓</text><text>{{ item }}</text></view>
      <button class="notify" @tap="upgrade" @click="upgrade">立即升级</button>
    </view>

    <view class="free-card">
      <text class="free-title">当前免费版已包含</text>
      <text class="free-item">✓ 基础 FIRE 计算与自由日</text>
      <text class="free-item">✓ 收入、消费和资产记录</text>
      <text class="free-item">✓ 拔草计划、任务和阅读记录</text>
      <text class="free-item">✓ 登录后跨设备同步数据</text>
    </view>

    <text class="note">行为建议 AI 只提供记录、消费和生活习惯建议，不提供金融服务、投资建议或理财推荐。会员支付功能正在接入。</text>
    <view v-if="showUpgradeModal" class="modal-mask" @tap="closeUpgrade">
      <view class="upgrade-modal" @tap.stop>
        <text class="modal-kicker">FIRE PRO</text>
        <text class="modal-title">立即升级</text>
        <text class="modal-price">¥9 <text class="modal-unit">/ 月</text></text>
        <text class="modal-copy">支付功能正在接入，开放后可完成订阅。</text>
        <button class="modal-close" @tap="closeUpgrade">知道了</button>
      </view>
    </view>
  </view>
</template>

<script>
import { state, persist } from '@/store/index.js'
import { fetchMembership, createMembershipCheckout } from '@/utils/api-service.js'
import { membershipText } from '@/utils/membership.js'

export default {
  data() {
    return {
      showUpgradeModal: false,
      membershipStatus: '未开通',
      benefits: [
        '高级目标规划和多方案对比',
        '更完整的财务趋势与年度报告',
        '自定义任务、提醒和成长统计',
        '更多主题、模板和专属内容',
        '行为建议 AI：帮助发现消费和习惯模式',
        '优先体验新功能',
      ],
    }
  },
  async onLoad(options) {
    this.membershipStatus = membershipText(state)
    if (options && String(options.upgrade) === '1') this.showUpgradeModal = true
    try {
      const remote = await fetchMembership()
      if (remote && typeof remote === 'object') {
        state.membership = { ...state.membership, ...remote }
        persist()
        this.membershipStatus = membershipText(state)
      }
    } catch (error) {
      // 后端尚未部署会员接口时，保留本地状态，不阻断页面使用。
    }
  },
  methods: {
    close() { uni.navigateBack() },
    closeUpgrade() { this.showUpgradeModal = false },
    async upgrade() {
      if (uni.getStorageSync('fire_login_status') !== true) {
        uni.showToast({ title: '请先登录后升级', icon: 'none' })
        setTimeout(() => uni.reLaunch({ url: '/pages/login/login?redirect=/pages/profile/membership' }), 350)
        return
      }
      try {
        const result = await createMembershipCheckout()
        if (result && (result.checkoutUrl || result.url)) {
          const url = result.checkoutUrl || result.url
          // 由服务端返回支付地址；客户端不伪造支付成功。
          // #ifdef H5
          if (typeof window !== 'undefined') window.location.href = url
          // #endif
          // #ifndef H5
          uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '支付链接已复制', icon: 'none' }) })
          // #endif
          return
        }
        this.showUpgradeModal = true
      } catch (error) {
        this.showUpgradeModal = true
      }
    },
  },
}
</script>

<style>
.member-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 20px calc(34px + env(safe-area-inset-bottom));background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:10;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#fdfdfb;border-bottom:1px solid #edf1eb;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#243830}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#243830}.hero{padding:22px 4px 20px}.kicker{display:block;color:#527059;font-size:12px;letter-spacing:.14em;font-weight:600}.hero-title{display:block;color:#173d35;font-size:27px;font-weight:700;line-height:1.35;margin-top:10px}.hero-sub{display:block;color:#71807a;font-size:14px;line-height:1.7;margin-top:10px}.pro-card{padding:20px;border-radius:18px;background:linear-gradient(145deg,#173d35,#2e5e4d);color:#fff;box-shadow:0 10px 24px rgba(23,61,53,.16)}.pro-head{display:flex;align-items:center;justify-content:space-between}.pro-name{font-size:20px;font-weight:700;letter-spacing:.08em}.pro-badge{font-size:11px;padding:5px 8px;border-radius:20px;background:#d7e5bb;color:#173d35}.pro-desc{display:block;color:#dce9d8;font-size:13px;margin-top:8px}.member-status{display:block;color:#dce9d8;font-size:12px;margin-top:8px}.price{display:flex;align-items:baseline;margin-top:10px}.price-num{font-size:32px;font-weight:700}.price-unit{font-size:13px;color:#dce9d8}.benefit{display:flex;align-items:center;gap:9px;font-size:14px;line-height:1.5;margin-top:14px;color:#f4f8ef}.check{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#d7e5bb;color:#173d35;font-size:12px}.notify{height:46px;margin-top:22px;border:0;border-radius:11px;background:#fff;color:#173d35;font-size:14px}.free-card{margin-top:14px;padding:18px;border:1px solid #e5e9e0;border-radius:16px;background:#fff}.free-title{display:block;color:#243830;font-size:15px;font-weight:600;margin-bottom:12px}.free-item{display:block;color:#52605a;font-size:13px;line-height:1.8}.note{display:block;text-align:center;color:#8b9489;font-size:12px;line-height:1.6;margin:18px 12px 0}
 .modal-mask{position:fixed;z-index:50;inset:0;background:rgba(23,61,53,.32);display:flex;align-items:center;justify-content:center;padding:22px;box-sizing:border-box}.upgrade-modal{width:100%;max-width:340px;padding:26px 22px 18px;border-radius:22px;background:#f7fbf6;box-shadow:0 16px 40px rgba(23,61,53,.24);text-align:center}.modal-kicker{display:block;color:#527059;font-size:11px;letter-spacing:.16em;font-weight:700}.modal-title{display:block;color:#173d35;font-size:23px;font-weight:700;margin-top:9px}.modal-price{display:block;color:#173d35;font-size:30px;font-weight:700;margin-top:12px}.modal-unit{font-size:13px;font-weight:400}.modal-copy{display:block;color:#71807a;font-size:13px;line-height:1.7;margin-top:9px}.modal-close{height:44px;margin-top:19px;border:0;border-radius:12px;background:#173d35;color:#fff;font-size:14px}</style>
