<template>
  <view class="bottom-tabs">
    <view
      v-for="t in tabs"
      :key="t.path"
      class="tab-item" :class="{ active: t.key === current }"
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
  props: {
    current: { type: String, default: '' },
  },
  data() {
    return {
      _navigating: false,
      tabs: [
        { path: '/pages/index/index',     key: 'home' },
        { path: '/pages/tools/index',     key: 'tools' },
        { path: '/pages/community/index', key: 'community' },
        { path: '/pages/profile/index',   key: 'profile' },
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
      uni.switchTab({
        url: path,
        success: () => { setTimeout(() => { this._navigating = false }, 400) },
        fail: (err) => {
          this._navigating = false
          console.warn('[BottomTabs] switchTab cancelled', err)
        },
      })
    },
    iconUri(key, active) {
      const color = active ? '#243830' : '#839084'
      const p = TAB_ICONS[key] || TAB_ICONS.home
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    },
  },
}
</script>

<style>
.bottom-tabs {
  position: fixed !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  max-width: none !important;
  height: 68px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #fafbf7 !important;
  border-top: 1px solid #e5e9e0;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
  z-index: 99999 !important;
  box-sizing: border-box;
  transform: none !important;
  visibility: visible !important;
  opacity: 1 !important;
}.tab-item {
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
.tab-icon {
  width: 26px;
  height: 26px;
}
@media (prefers-reduced-motion: reduce) { .tab-item { transition: none; } .tab-item:active { transform: none; } }
</style>