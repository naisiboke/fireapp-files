<template>
  <view class="settings-page">
    <view class="head">
      <text class="back" @tap="back">‹</text>
      <text class="title">设置</text>
      <view class="spacer"></view>
    </view>

    <text class="h1">你的数据，<br>留在你的设备</text>
    <text class="lead">这一版用于体验界面与交互流程。</text>

    <!-- 提示音 -->
    <view class="card sound-card">
      <view class="sound-copy">
        <text class="card-title">操作提示音</text>
        <text class="card-sub">记账和拔草完成时，轻轻提醒一下</text>
      </view>
      <view class="switch" :class="{ on: state.soundEnabled }" @tap="toggleSound">
        <view class="switch-thumb"></view>
      </view>
    </view>

    <!-- 预览状态 -->
    <view class="card">
      <text class="card-title">当前预览状态</text>
      <text class="card-p">浏览器本地保存已开启，刷新后可继续体验。</text>
      <text class="card-p">所有初始金额为演示数据。本 App 不连接银行，不提供账号或云同步。</text>
      <text class="card-p">本地数据尚未加密，请用演示数字体验。</text>
    </view>

    <!-- 关于计算 -->
    <view class="card note">
      <text class="card-title">关于计算</text>
      <text class="card-p">
        固定收益假设、月度复利、每月按填写金额在月末存入。自由模式按退休后消费与提取率计算，目标模式按目标金额计算。最多模拟 100 年，未达标时显示暂未可达。
      </text>
    </view>

    <!-- 操作 -->
    <view class="btn light fire-button-secondary" @tap="replayOnboarding">
      <text class="btn-text light-text">重新查看启动流程</text>
    </view>
    <view class="btn danger fire-button-danger" @tap="confirmReset">
      <text class="btn-text">重置演示数据</text>
    </view>

    <text class="version">FIRE Forge · v1.0.0</text>
  </view>
</template>

<script>
import { state, clearAllData } from '@/store/index.js'

export default {
  data() {
    return { state: state }
  },
  methods: {
    back() { this.safeBack() },
    safeBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/profile/index' }) })
      } else {
        uni.reLaunch({ url: '/pages/profile/index' })
      }
    },
    toggleSound() {
      state.soundEnabled = !state.soundEnabled
      // 触发一次存储
      const { persist } = require('@/store/index.js')
      persist()
    },
    replayOnboarding() {
      state.started = false
      uni.reLaunch({ url: '/pages/onboarding/onboarding' })
    },
    confirmReset() {
      uni.showModal({
        title: '重置演示数据？',
        content: '会清除当前设备内的所有记录，不可撤销。',
        success: (res) => {
          if (res.confirm) {
            clearAllData()
            uni.reLaunch({ url: '/pages/onboarding/onboarding' })
          }
        },
      })
    },
  },
  onBackPress() {
    // 不在 onBackPress 中再次调用 navigateBack，避免触发递归错误。
    return false
  },
}
</script>

<style>
.settings-page {
  min-height: 100vh;
  padding: 60px 24px 40px;
  background: #fdfdfb;
  box-sizing: border-box;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.back { width: 40px; height: 40px; font-size: 28px; line-height: 40px; text-align: center; color: #243830; }
.title { font-size: 18px; font-weight: 600; color: #243830; }
.spacer { width: 40px; }

.h1 {
  display: block;
  font-size: 26px;
  font-weight: 700;
  color: #143e37;
  line-height: 1.4;
}
.lead {
  display: block;
  font-size: 13px;
  color: #71807a;
  margin: 8px 0 24px;
}

.card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e9e0;
  border-radius: 14px;
  margin-bottom: 12px;
}
.card-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #243830;
  margin-bottom: 8px;
}
.card-sub {
  display: block;
  font-size: 12px;
  color: #71807a;
  margin-top: 4px;
  line-height: 1.5;
}
.card-p {
  display: block;
  font-size: 13px;
  color: #52605a;
  line-height: 1.75;
  margin-top: 6px;
}
.card.note {
  background: #eff2e9;
  border: 0;
  border-left: 2px solid #bfd0b5;
  border-radius: 0 14px 14px 0;
}

.sound-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.sound-copy { flex: 1; min-width: 0; }

.switch {
  width: 46px;
  height: 28px;
  border-radius: 14px;
  background: #cbd2c7;
  padding: 3px;
  display: flex;
  align-items: center;
  transition: background 0.16s;
  flex-shrink: 0;
}
.switch.on { background: #527059; }
.switch-thumb {
  width: 22px;
  height: 22px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(36,56,48,0.13);
  transition: transform 0.16s;
}
.switch.on .switch-thumb { transform: translateX(18px); }

.btn {
  margin-top: 12px;
  padding: 14px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.btn.light {
  background: #eef2e8;
}
.btn.danger {
  background: #94685c;
}
.btn-text {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}
.btn-text.light-text {
  color: #243830;
}

.version {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #8b9489;
  margin-top: 32px;
}
</style>