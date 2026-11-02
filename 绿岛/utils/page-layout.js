import { reactive } from 'vue'

// Runtime statusBarHeight is needed in Android WebViews where CSS env() returns zero.
export function resolveStatusInset(info = {}) {
  const values = [info.statusBarHeight, info.safeAreaInsets?.top, info.safeArea?.top]
    .map(Number).filter(value => Number.isFinite(value) && value >= 0 && value < 240)
  if (!values.length) return null
  const viewportTop = Math.max(0, Number(info.windowTop) || 0)
  return Math.max(0, Math.max(...values) - viewportTop)
}
export const pageLayoutStyle = reactive({
  '--fire-status-top': 'env(safe-area-inset-top, 0px)',
  '--fire-page-top': 'calc(var(--fire-status-top) + 12px)',
  '--fire-header-height': 'calc(var(--fire-status-top) + 56px)',
  '--fire-content-top': 'calc(var(--fire-header-height) + 12px)',
})
export function refreshPageLayout() {
  try {
    const info = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
    const inset = resolveStatusInset(info)
    pageLayoutStyle['--fire-status-top'] = inset === null ? 'env(safe-area-inset-top, 0px)' : inset + 'px'
  } catch (ignore) {}
  return pageLayoutStyle
}
