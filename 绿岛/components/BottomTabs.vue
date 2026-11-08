<template>
  <view class="bottom-tabs">
    <view v-if="expanded && !guideActive" class="menu-mask" @tap="toggleMenu"></view>
    <view class="quick-menu" :class="{ open: expanded }">
      <view id="fire-guide-ledger" class="quick-item quick-ledger" aria-label="记账" @tap.stop="openQuick('/pages/ledger/index')"><view class="quick-icon">¥</view></view>
      <view class="quick-item quick-ai" aria-label="问 AI" @tap.stop="openQuick('/pages/ai/index')"><view class="quick-icon">AI</view></view>
      <view class="quick-item quick-music" aria-label="音乐" @tap.stop="openQuick('/pages/music/index')"><view class="quick-icon">♪</view></view>
    </view>
    <view v-for="t in tabs.slice(0, 2)" :key="t.path" :id="t.key==='tools'?'fire-guide-tools':undefined" class="tab-item" :class="{ active: t.key === current }" :aria-label="t.label" @tap="switchTab(t.path)">
      <image class="tab-icon" :src="iconUri(t.key, t.key === current)" mode="aspectFit" />
    </view>
    <view class="center-action" :class="{ expanded }" @tap="toggleMenu"><text>{{ expanded ? '×' : '+' }}</text></view>
    <view v-for="t in tabs.slice(2)" :key="t.path" class="tab-item" :class="{ active: t.key === current }" :aria-label="t.label" @tap="switchTab(t.path)">
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
  props: { current: { type: String, default: '' }, guideActive:Boolean, guideMenuOpen:Boolean },
  watch:{
    guideActive(active){this.expanded=active?this.guideMenuOpen:false},
    guideMenuOpen(open){if(this.guideActive)this.expanded=open},
  },
  data() {
    return {
      _navigating: false,
      expanded: false,
      tabs: [
        { path: '/pages/index/index', key: 'home', label: '主页' },
        { path: '/pages/tools/index', key: 'tools', label: '工具' },
        { path: '/pages/community/index', key: 'community', label: '社区' },
        { path: '/pages/profile/index', key: 'profile', label: '我的' },
      ],
    }
  },
  mounted() { uni.hideTabBar({ animation: false }) },
  methods: {
    toggleMenu() { if(this.guideActive)return; this.expanded = !this.expanded },
    measureGuideTarget(key){return new Promise(resolve=>{try{uni.createSelectorQuery().in(this).select(key==='ledger'?'#fire-guide-ledger':'#fire-guide-tools').boundingClientRect(rect=>resolve(rect||null)).exec()}catch(error){resolve(null)}})},
    openQuick(url) {
      if(this.guideActive)return
      this.expanded = false
      let target = url
      if (url === '/pages/ledger/index') target = '/pages/ledger/index?add=1'
      uni.navigateTo({ url: target })
    },
    switchTab(path) {
      if (this.guideActive || this._navigating) return
      this.expanded = false
      this._navigating = true
      const current = getCurrentPages()
      const currentPath = current.length ? '/' + String(current[current.length - 1].route || '').replace(/^\//, '') : ''
      if (currentPath === path) { this._navigating = false; return }
      uni.switchTab({
        url: path,
        success: () => { setTimeout(() => { this._navigating = false }, 400) },
        fail: (err) => { this._navigating = false; console.warn('[BottomTabs] switchTab cancelled', err) },
      })
    },
    iconUri(key, active) {
      const color = active ? '#243830' : '#839084'
      const p = TAB_ICONS[key] || TAB_ICONS.home
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    },
  },
}
</script>

<style>
.bottom-tabs{position:fixed!important;left:0!important;right:0!important;bottom:0!important;width:100vw!important;height:calc(60px + env(safe-area-inset-bottom));display:grid;grid-template-columns:1fr 1fr 60px 1fr 1fr;align-items:center;background:rgba(250,251,247,.96)!important;border-top:1px solid rgba(36,56,48,.08);padding:6px 10px calc(6px + env(safe-area-inset-bottom));z-index:99999!important;box-sizing:border-box;backdrop-filter:blur(14px);box-shadow:0 -8px 24px rgba(33,58,47,.06)}.tab-item{box-sizing:border-box;min-height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:6px 0;border-radius:14px;transition:transform 180ms ease,background-color 180ms ease}.tab-item.active{background:#edf3eb}.tab-item:active{transform:scale(.96)}.tab-icon{width:22px;height:22px}.center-action{width:48px;height:48px;margin:-14px auto 0;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#2c5a49,#173d35);color:#fff;border:4px solid #fafbf7;box-shadow:0 7px 18px rgba(23,61,53,.18);font-size:32px;font-weight:500;line-height:1;transition:background .2s ease,transform .2s ease;z-index:3}.center-action text{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:28px;font-weight:600;line-height:1;transform:translateY(-1px)}.center-action.expanded{background:#527059}.center-action.expanded text{transform:translateY(-1px)}.center-action:active{transform:scale(.95)}.menu-mask{position:fixed;left:0;right:0;top:0;bottom:calc(60px + env(safe-area-inset-bottom));background:rgba(23,61,53,.08);z-index:1}.quick-menu{position:absolute;left:50%;bottom:calc(36px + env(safe-area-inset-bottom));width:0;height:0;transform:scale(.65);transform-origin:0 0;opacity:0;pointer-events:none;z-index:4;transition:transform .24s cubic-bezier(.22,1,.36,1),opacity .2s ease}.quick-menu.open{transform:scale(1);opacity:1;pointer-events:auto}.quick-item{position:absolute;width:48px;height:48px;display:flex;flex-direction:column;align-items:center;gap:5px;color:#243830;font-size:12px}.quick-icon{box-sizing:border-box;flex-shrink:0;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #dce8dc;box-shadow:0 7px 18px rgba(23,61,53,.16);font-size:14px;font-weight:600;color:#173d35}.quick-ledger{left:34px;top:-66px}.quick-ai{left:-24px;top:-100px}.quick-music{left:-82px;top:-66px}.quick-item:active{transform:scale(.95)}
@media screen and (max-width:390px){.bottom-tabs{height:calc(56px + env(safe-area-inset-bottom));padding:4px 7px calc(4px + env(safe-area-inset-bottom));grid-template-columns:1fr 1fr 52px 1fr 1fr}.tab-item{min-height:40px;padding:3px 0;border-radius:10px}.tab-icon{width:20px;height:20px}.center-action{width:44px;height:44px;margin:-10px auto 0;border-width:3px}.center-action text{font-size:25px}.quick-menu{bottom:calc(32px + env(safe-area-inset-bottom))}}
</style>
