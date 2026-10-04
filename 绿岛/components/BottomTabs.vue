<!-- FIRE BottomTabs component -->
<template>
  <view class="bottom-tabs">
    <view
      v-for="t in tabs"
      :key="t.path"
      class="tab-item"
      :class="{ active: t.key === current }"
      @click="switchTab(t.path)"
    >
      <image class="tab-icon" :src="iconUri(t.key, t.key === current)" mode="aspectFit" />
    </view>
  </view>
</template>

<script>
const TAB_ICONS = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  tools: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  community: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6M19 14a6 6 0 0 1 3 6"/>',
  profile: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
}
export default {
  name: 'BottomTabs',
  props: { current: { type: String, default: '' } },
  data() {
    return {
      _navigating: false,
      tabs: [
        { path: '/pages/index/index', key: 'home' },
        { path: '/pages/tools/index', key: 'tools' },
        { path: '/pages/community/index', key: 'community' },
        { path: '/pages/profile/index', key: 'profile' },
      ],
    }
  },
  methods: {
    switchTab(path) {
      if (this._navigating) return
      this._navigating = true
      const current = getCurrentPages()
      const currentPath = current.length ? '/' + String(current[current.length - 1].route || '').replace(/^\//, '') : ''
      if (currentPath === path) {
        this._navigating = false
        return
      }
      // 使用 reLaunch 管理自定义 Tab，避免系统 custom tabBar 没有宿主组件导致“我的”页空白。
      uni.reLaunch({
        url: path,
        success: () => { setTimeout(() => { this._navigating = false }, 400) },
        fail: (err) => { this._navigating = false; console.warn('[BottomTabs] navigation failed', err) },
      })
    },
    iconUri(key, active) {
      const color = active ? '#243830' : '#839084'
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${TAB_ICONS[key] || TAB_ICONS.home}</svg>`
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    },
  },
}
</script>

<style>
.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  min-height: 68px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: rgba(250, 251, 247, .98);
  border-top: 1px solid #e5e9e0;
  box-shadow: 0 -6px 18px rgba(36, 56, 48, .08);
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  z-index: 99999;
  transform: translateZ(0);
}
.tab-item {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  border-radius: 12px;
  transition: transform 180ms ease, background-color 180ms ease;
}
.tab-item.active { background: #eef3ec; }
.tab-item:active { transform: scale(.98); }
.tab-icon { width: 26px; height: 26px; }
@media (prefers-reduced-motion: reduce) {
  .tab-item { transition: none; }
  .tab-item:active { transform: none; }
}
</style>
