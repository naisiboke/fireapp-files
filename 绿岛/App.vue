<script>
import { bootstrap, hydrateFromServer, persist } from './store/index.js'

export default {
  onLaunch() {
    bootstrap()
    // 配置云端 API 后以服务端数据为正式来源；未配置时保持本地过渡缓存。
    hydrateFromServer()
    // 每次冷启动先进入唯一启动页，避免上次停留在分享页时被直接恢复。
    const pages = getCurrentPages()
    const route = pages.length ? String(pages[pages.length - 1].route || '').replace(/^\//, '') : ''
    if (route !== 'pages/launch/index' && !getApp().__fireLaunchRedirecting) {
      getApp().__fireLaunchRedirecting = true
      setTimeout(() => {
        uni.reLaunch({
          url: '/pages/launch/index',
          complete: () => { getApp().__fireLaunchRedirecting = false },
        })
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

button {
  margin: 0;
  min-width: var(--button-height-md);
  min-height: var(--button-height-md);
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--button-radius);
  box-sizing: border-box;
  font: inherit;
  line-height: 1.2;
  box-shadow: none;
  transition: transform 180ms ease, background-color 180ms ease, border-color 180ms ease, opacity 180ms ease, box-shadow 180ms ease;
}
button::after { border: 0 !important; }
button:active { transform: scale(var(--button-pressed)); }
button:focus-visible { outline: 0; box-shadow: var(--button-focus); }
.fire-button-primary { display: inline-flex; align-items: center; justify-content: center; background: var(--button-primary); color: #fff; box-shadow: var(--button-shadow); }
.fire-button-secondary { background: var(--button-secondary); color: #173d35; }
.fire-button-outline { background: transparent; border-color: var(--button-outline); color: #173d35; }
.fire-button-danger { background: var(--button-danger); color: #fff; }
.fire-button-sm { min-height: var(--button-height-sm); border-radius: var(--button-radius-sm); font-size: 13px; }
.fire-button-lg { min-height: var(--button-height-lg); font-size: 16px; }
@media (prefers-reduced-motion: reduce) {
  button { transition: none; }
  button:active { transform: none; }
}

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