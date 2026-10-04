<template><view class="launch-page"></view></template>
<script>
export default {
  data() { return { redirecting: false } },
  onLoad() { this.routeByState() },
  methods: {
    routeByState() {
      if (this.redirecting) return
      this.redirecting = true
      const hasSeenIsland = uni.getStorageSync('fire_island_onboarding_done') === true
      const hasLoggedIn = uni.getStorageSync('fire_login_status') === true
      const guestMode = uni.getStorageSync('fire_guest_mode') === true
      const url = !hasSeenIsland
        ? '/pages/onboarding/onboarding'
        : (!hasLoggedIn && !guestMode ? '/pages/login/login' : '/pages/index/index')
      uni.reLaunch({
        url,
        fail: () => {
          this.redirecting = false
          uni.showToast({ title: '页面打开失败，请重新启动', icon: 'none' })
        },
      })
    },
  },
}
</script>
<style>
.launch-page{position:fixed;inset:0;background:#fdfdfb}
</style>
