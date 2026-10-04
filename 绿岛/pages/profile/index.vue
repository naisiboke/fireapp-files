<template>
  <view class="profile-page">

    <!-- 顶部标题 -->
    <view class="page-head">
      <text class="page-h1">我的</text>
      <text class="page-sub">好好生活，也好好规划</text>
    </view>

    <!-- 用户卡片 -->
    <view class="user-card" @tap="goOnboarding">
      <view class="avatar">
        <text class="avatar-text">{{ avatarLetter }}</text>
      </view>
      <view class="user-copy">
        <text class="user-name">{{ profileName }}</text>
        <text class="user-goal">{{ profileGoal }} · 持续成长</text>
      </view>
      <text class="chevron">›</text>
    </view>

    <!-- Pro 卡片 -->
    <view class="pro-card">
      <view class="pro-copy">
        <text class="pro-kicker">FIRE PRO</text>
        <text class="pro-title">升级 Pro 会员</text>
        <text class="pro-desc">解锁全部高级工具与数据能力</text>
      </view>
      <view class="pro-btn" @tap="openPro">
        <text class="pro-btn-text">立即升级</text>
      </view>
    </view>

    <!-- 分组 1：财务核心 -->
    <view class="group">
      <text class="group-title">财务 FIRE 核心</text>
      <view class="group-menu">
        <view class="menu-item" @tap="goPage('/pages/ledger/index')">
          <view class="menu-icon">
            <image class="menu-icon-img" :src="iconUri('assets')" mode="aspectFit" />
          </view>
          <view class="menu-copy">
            <text class="menu-name">我的资产与财务</text>
            <text class="menu-sub">资产趋势、记录与自由目标</text>
          </view>
          <text class="chevron">›</text>
        </view>

        <view class="menu-item" @tap="comingSoon('自由日与目标日')">
          <view class="menu-icon">
            <image class="menu-icon-img" :src="iconUri('calculator')" mode="aspectFit" />
          </view>
          <view class="menu-copy">
            <text class="menu-name">自由日与目标日</text>
            <text class="menu-sub">两种计划，分别计算</text>
          </view>
          <text class="chevron">›</text>
        </view>

        <view class="menu-item" @tap="comingSoon('我的消费计划')">
          <view class="menu-icon">
            <image class="menu-icon-img" :src="iconUri('wishlist')" mode="aspectFit" />
          </view>
          <view class="menu-copy">
            <text class="menu-name">我的消费计划</text>
            <text class="menu-sub">{{ itemsCount }} 笔消费规划记录</text>
          </view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <!-- 分组 2：成长 -->
    <view class="group">
      <text class="group-title">成长养成</text>
      <view class="group-menu">
        <view class="menu-item" @tap="comingSoon('我的成长')">
          <view class="menu-icon">
            <image class="menu-icon-img" :src="iconUri('hero')" mode="aspectFit" />
          </view>
          <view class="menu-copy">
            <text class="menu-name">我的成长</text>
            <text class="menu-sub">{{ expText }} · {{ completedCount }} 项任务行动</text>
          </view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <!-- 分组 3：设置 -->
    <view class="group">
      <text class="group-title">系统设置</text>
      <view class="group-menu">
        <view class="menu-item" @tap="goPage('/pages/settings/index')">
          <view class="menu-icon">
            <image class="menu-icon-img" :src="iconUri('settings')" mode="aspectFit" />
          </view>
          <view class="menu-copy">
            <text class="menu-name">设置</text>
            <text class="menu-sub">数据、提示音与关于本应用</text>
          </view>
          <text class="chevron">›</text>
        </view>

        <view class="menu-item" @tap="goPage('/pages/privacy/index')">
          <view class="menu-icon">
            <image class="menu-icon-img" :src="iconUri('shield')" mode="aspectFit" />
          </view>
          <view class="menu-copy">
            <text class="menu-name">隐私政策</text>
            <text class="menu-sub">数据存储与使用说明</text>
          </view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <text class="version">FIRE Forge · v1.0.0</text>
    <BottomTabs current="profile" />
  </view>
</template>

<script>
import BottomTabs from '@/components/BottomTabs.vue'
import { state } from '@/store/index.js'

const ICONS = {
  assets:
    'M4 19V9M10 19V5M16 19v-7M22 19V3',
  calculator:
    'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8M8 11h.5M12 11h.5M16 11h.5M8 15h.5M12 15h.5M16 15h.5M8 19h8',
  wishlist:
    'M7 7V5a5 5 0 0 1 10 0v2M3 7h18v14H3zM8 14l3 3 5-5',
  hero:
    'M12 3l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 3z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  shield:
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
}

function svgUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

export default {
  components: { BottomTabs },
  data() {
    return {
      state: state,
    }
  },

  computed: {
    profileName() {
      return (state.profile && state.profile.name) || '自由的旅人'
    },
    profileGoal() {
      return (state.profile && state.profile.goal) || '工作自由'
    },
    avatarLetter() {
      return this.profileName.slice(0, 1)
    },
    itemsCount() {
      return (state.items || []).length
    },
    expText() {
      return (state.exp || 0) + ' EXP'
    },
    completedCount() {
      return (state.completed || []).length
    },
  },

  methods: {
    iconUri(key) {
      const p = ICONS[key] || ICONS.settings
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#426052" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`
      return svgUri(svg)
    },

    goPage(url) {
      uni.navigateTo({ url: url })
    },
    goOnboarding() {
      uni.showToast({ title: '个人资料编辑开发中', icon: 'none' })
    },
    openPro() {
      uni.showModal({
        title: 'FIRE PRO',
        content: 'Pro 会员权益即将上线，敬请期待。',
        showCancel: false,
        confirmText: '知道了',
      })
    },
    comingSoon(name) {
      uni.showToast({ title: name + ' 开发中', icon: 'none' })
    },
  },
}
</script>

<style>
@keyframes profilePageIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes profileMenuIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
.profile-page { animation: profilePageIn .32s cubic-bezier(.22,1,.36,1) both;
  min-height: 100vh;
  padding: 60px 24px 120px;
  background: #f3f4f2;
  box-sizing: border-box;
}

/* 顶部 */
.page-head {
  margin-bottom: 20px;
}
.page-h1 {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #143e37;
  letter-spacing: 0.5px;
}
.page-sub {
  display: block;
  font-size: 13px;
  color: #71807a;
  margin-top: 8px;
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e7eee7;
  border-radius: 16px;
  box-shadow: 0 5px 16px rgba(23,61,53,0.06);
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #243830;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-text {
  color: #d7e5bb;
  font-size: 22px;
  font-weight: 300;
}
.user-copy {
  flex: 1;
  min-width: 0;
}
.user-name {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #243830;
}
.user-goal {
  display: block;
  font-size: 13px;
  color: #71807a;
  margin-top: 4px;
}
.chevron {
  font-size: 22px;
  color: #91a392;
  line-height: 1;
}

/* Pro 卡片 */
.pro-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #e8f4e7, #d9ead7);
  border: 1px solid #cfe3cf;
}
.pro-copy {
  flex: 1;
  min-width: 0;
}
.pro-kicker {
  display: block;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: #427153;
  font-weight: 600;
}
.pro-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #173d35;
  margin-top: 4px;
}
.pro-desc {
  display: block;
  font-size: 11px;
  color: #52715a;
  margin-top: 4px;
  line-height: 1.5;
}
.pro-btn {
  padding: 8px 12px;
  border-radius: 8px;
  background: #173d35;
  flex-shrink: 0;
}
.pro-btn-text {
  color: #ffffff;
  font-size: 12px;
  white-space: nowrap;
}

/* 分组 */
.group {
  margin-top: 24px;
}
.group-title {
  display: block;
  font-size: 13px;
  color: #52715a;
  font-weight: 600;
  margin: 0 4px 8px;
}
.group-menu {
  background: #ffffff;
  border: 1px solid #e7eee7;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 5px 16px rgba(23,61,53,0.04);
}

 .menu-item { animation: profileMenuIn .46s cubic-bezier(.22,1,.36,1) both; }
.menu-item:nth-child(2){animation-delay:.06s}.menu-item:nth-child(3){animation-delay:.12s}.menu-item:nth-child(4){animation-delay:.18s}.menu-item:nth-child(5){animation-delay:.24s}
.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid #eef2ee;
}
.menu-item:last-child {
  border-bottom: 0;
}
.menu-item:active {
  background: #f7faf5;
}

.menu-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: #eef3ea;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.menu-icon-img {
  width: 20px;
  height: 20px;
}

.menu-copy {
  flex: 1;
  min-width: 0;
}
.menu-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #243830;
  line-height: 1.4;
}
.menu-sub {
  display: block;
  font-size: 12px;
  color: #71807a;
  margin-top: 4px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 版本 */
.version {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #8b9489;
  margin-top: 40px;
}
</style>