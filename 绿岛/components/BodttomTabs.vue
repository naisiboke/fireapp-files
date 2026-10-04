<template>
  <view class="bottom-tabs">
    <view
      v-for="t in tabs"
      :key="t.path"
      class="tab-item"
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
      uni.switchTab({
        url: path,
        fail: () => { uni.reLaunch({ url: path }) },
        complete: () => { setTimeout(() => { this._navigating = false }, 400) },
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
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 0;
  width: 100%;
  max-width: 460px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: #fafbf7;
  border-top: 1px solid #e5e9e0;
  padding: 12px 8px calc(12px + env(safe-area-inset-bottom));
  z-index: 100;
  box-sizing: border-box;
}
.tab-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
}
.tab-icon {
  width: 26px;
  height: 26px;
}
</style>