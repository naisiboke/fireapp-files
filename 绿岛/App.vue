<template>
  <view class="app-shell"><slot /><BottomTabs /></view>
</template>

<script>
import { bootstrap, persist } from './store/index.js'
import BottomTabs from './components/BottomTabs.vue'

export default {
  components: { BottomTabs },
  onLaunch() {
    bootstrap()
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