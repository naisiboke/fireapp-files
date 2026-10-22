<template>
  <view class="launch-page">
    <view class="launch-glow"></view>
    <view class="launch-card">
      <view class="launch-mark">岛</view>
      <text class="launch-title">绿岛</text>
      <text class="launch-status">{{ status }}</text>
    </view>
  </view>
</template>
<script>
export default {
  data() {
    return { redirecting: false, routeTimer: null, status: '正在打开绿岛…' }
  },
  onLoad() { this.scheduleRoute() },
  onReady() { this.scheduleRoute() },
  onShow() { this.scheduleRoute() },
  methods: {
    scheduleRoute() {
      if (this.redirecting || this.routeTimer) return
      this.routeTimer = setTimeout(() => {
        this.routeTimer = null
        this.routeByState()
      }, 80)
    },
    routeByState() {
      if (this.redirecting) return
      this.redirecting = true
      try {
        const hasSeenIsland = uni.getStorageSync('fire_island_onboarding_done') === true
        const hasLoggedIn = uni.getStorageSync('fire_login_status') === true
        uni.removeStorageSync('fire_guest_mode')
        const hasGuide = uni.getStorageSync('fire_app_guide_done') === true
        const url = !hasSeenIsland
          ? '/pages/onboarding/onboarding'
          : (!hasLoggedIn
            ? '/pages/login/login'
            : (!hasGuide ? '/pages/guide/index' : '/pages/index/index'))
        this.status = '正在加载…'
        uni.reLaunch({
          url,
          fail: (error) => {
            this.redirecting = false
            this.status = '页面加载失败，请重新打开应用'
            console.error('[launch-route-failed]', url, error)
            uni.showModal({
              title: '绿岛启动失败',
              content: '页面资源没有正确加载，请重新安装最新版本。',
              showCancel: false,
            })
          },
        })
      } catch (error) {
        this.redirecting = false
        this.status = '启动失败，请重新打开应用'
        console.error('[launch-error]', error)
      }
    },
  },
}
</script>
<style>
.launch-page{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#fdfdfb;color:#173d35;overflow:hidden}
.launch-glow{position:absolute;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#dcebdc 0%,rgba(220,235,220,0) 70%);opacity:.8}
.launch-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px}
.launch-mark{width:70px;height:70px;border-radius:24px;display:flex;align-items:center;justify-content:center;background:#173d35;color:#f3f7ef;font-size:30px;font-weight:700;box-shadow:0 14px 35px rgba(23,61,53,.2)}
.launch-title{font-size:25px;font-weight:700;letter-spacing:.12em}
.launch-status{font-size:13px;color:#7a8b82}
</style>
