<script>
import { bootstrap, persist } from './store/index.js'

export default {
  onLaunch() {
    bootstrap()
    // 启动顺序：沉浸式引导 → 登录页 → 首页
    const hasSeenIsland = uni.getStorageSync('fire_island_onboarding_done') === true
    const hasLoggedIn = uni.getStorageSync('fire_login_status') === true
    const guestMode = uni.getStorageSync('fire_guest_mode') === true
    const route = !hasSeenIsland
      ? '/pages/onboarding/onboarding'
      : (!hasLoggedIn && !guestMode ? '/pages/login/login' : null)
    if (route) {
      setTimeout(() => uni.reLaunch({ url: route }), 0)
    }
  },
  onHide() {
    persist()
  },
}
</script>

<style>
.app-shell { min-height: 100vh; }

page {
  background: #fdfdfb;
  color: #243830;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 14px;
}

/* #ifdef H5 */
.uni-tabbar,
.uni-tabbar__placeholder,
.uni-placeholder-bottom {
  display: none !important;
}
/* #endif */
</style>