<script>
import { bootstrap, hydrateFromServer, persist } from './store/index.js'

const PUBLIC_ROUTES = new Set(['pages/launch/index', 'pages/onboarding/onboarding', 'pages/login/login', 'pages/register/register', 'pages/guide/index'])

export default {
  onLaunch() {
    try { bootstrap() } catch (error) { console.error('[app-bootstrap]', error) }
    // 配置云端 API 后以服务端数据为正式来源；未配置时保持本地过渡缓存。
    Promise.resolve(hydrateFromServer()).catch((error) => console.error('[cloud-hydrate]', error))
    // 首个页面已经由 pages.json 指定为启动页，不再在 App.onLaunch 中二次 reLaunch，避免 H5 首屏空白。
  },
  onShow() {
    const pages = getCurrentPages()
    const route = pages.length ? String(pages[pages.length - 1].route || '').replace(/^\//, '') : ''
    if (!route || PUBLIC_ROUTES.has(route)) return
    if (uni.getStorageSync('fire_login_status') === true) return
    uni.removeStorageSync('fire_guest_mode')
    const app = getApp()
    if (app.__fireAuthRedirecting) return
    app.__fireAuthRedirecting = true
    uni.reLaunch({
      url: '/pages/login/login?redirect=/' + route,
      complete: () => { app.__fireAuthRedirecting = false },
    })
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
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  vertical-align: middle;
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

@media (prefers-color-scheme: dark) {
  :root {
    --button-primary: #7fae96;
    --button-primary-hover: #9fc3ad;
    --button-secondary: #263c32;
    --button-outline: #93bda3;
    --button-shadow: 0 4px 16px rgba(0,0,0,.24);
  }
  page, body { background: #17231e; color: #e9efe9; }
  button { color: #e9efe9; }
}
</style>