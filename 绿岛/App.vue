<script>
import { bootstrap, persist } from './store/index.js'

export default {
  onLaunch() {
    bootstrap()
    // 启动时读取本地 Mock 登录状态，未登录用户进入登录页
    if (uni.getStorageSync('fire_login_status') !== true) {
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/login/login' })
      }, 0)
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