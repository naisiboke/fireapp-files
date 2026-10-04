<template>
  <view class="tools-view">

    <view class="tools-head">
      <text class="tools-h1">工具</text>
      <text class="tools-sub">规划、行动、消费，都从这里开始</text>
    </view>

    <text class="group-title">常用功能</text>
    <view class="tool-grid">
      <view v-for="t in commonTools" :key="t.route" class="tool-card" @tap="goTool(t)">
        <view class="tool-icon" :style="{ background: t.bg }">
          <image class="tool-icon-img" :src="iconUri(t.icon, t.color)" mode="aspectFit" />
        </view>
        <view class="tool-text">
          <text class="tool-name">{{ t.name }}</text>
          <text class="tool-desc">{{ t.desc }}</text>
        </view>
        <text class="tool-arrow">›</text>
      </view>
    </view>

    <text class="group-title second">更多工具</text>
    <view class="tool-grid">
      <view v-for="t in uncommonTools" :key="t.route" class="tool-card" @tap="goTool(t)">
        <view class="tool-icon" :style="{ background: t.bg }">
          <image class="tool-icon-img" :src="iconUri(t.icon, t.color)" mode="aspectFit" />
        </view>
        <view class="tool-text">
          <text class="tool-name">{{ t.name }}</text>
          <text class="tool-desc">{{ t.desc }}</text>
        </view>
        <text class="tool-arrow">›</text>
      </view>
    </view>

    <text class="safe-note">更多工具正在开发</text>
    <BottomTabs current="tools" />
  </view>
</template>

<script>
import BottomTabs from '@/components/BottomTabs.vue'
import { state, persist } from '@/store/index.js'

const ICONS = {
  calculator: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 7h8M8 11h.5M12 11h.5M16 11h.5M8 15h.5M12 15h.5M16 15h.5M8 19h8',
  hero: 'M12 3l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 3z',
  wishlist: 'M7 7V5a5 5 0 0 1 10 0v2M3 7h18v14H3zM8 14l3 3 5-5',
  ledger: 'M5 3h14v18l-3-2-4 2-4-2-3 2zM8 7h8M8 11h8M8 15h5',
  books: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5zM4 5.5v16M8 7h8M8 11h8',
  time: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
}

const TOOL_CATALOG = [
  { route: 'ledger', url: '/pages/ledger/index', icon: 'ledger', color: '#426052', bg: '#edf2e9', name: '记账', desc: '轻松记下每笔消费' },
  { route: 'calculator', url: '', icon: 'calculator', color: '#426052', bg: '#edf2e9', name: '躺平倒计时', desc: '计算你的自由日' },
  { route: 'wishlist', url: '', icon: 'wishlist', color: '#426052', bg: '#edf2e9', name: '极简拔草清单', desc: '给心动一点时间' },
  { route: 'hero', url: '', icon: 'hero', color: '#426052', bg: '#edf2e9', name: 'FIRE 英雄传', desc: '每日行动与成长' },
  { route: 'reading-library', url: '/pages/reading-library/index', icon: 'books', color: '#426052', bg: '#edf2e9', name: '认知书库', desc: '打开阅读内容' },
  { route: 'time-ledger', url: '', icon: 'time', color: '#426052', bg: '#edf2e9', name: '时间复利计算器', desc: '算清你的生命时薪' },
]

function svgUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

export default {
  components: { BottomTabs },
  data() { return { state } },
  computed: {
    sortedTools() {
      const usage = state.toolUsage || {}
      return TOOL_CATALOG.map(function (t, i) {
        const u = usage[t.route] || {}
        const score = (Number(u.clicks) || 0) + (Number(u.visits) || 0)
        return { tool: t, score, index: i }
      }).sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score
        return a.index - b.index
      }).map(function (x) { return x.tool })
    },
    commonTools() { return this.sortedTools.slice(0, 4) },
    uncommonTools() { return this.sortedTools.slice(4) },
  },
  methods: {
    iconUri(key, color) {
      const p = ICONS[key] || ICONS.ledger
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`
      return svgUri(svg)
    },
    goTool(t) {
      if (!state.toolUsage) state.toolUsage = {}
      const u = state.toolUsage[t.route] || { clicks: 0, visits: 0 }
      u.clicks = (Number(u.clicks) || 0) + 1
      u.lastUsed = Date.now()
      state.toolUsage[t.route] = u
      persist()
      if (t.url) uni.navigateTo({ url: t.url })
      else uni.showToast({ title: t.name + ' 开发中', icon: 'none' })
    },
  },
}
</script>

<style>
@keyframes toolPageIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toolSlideIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
.tools-view { min-height: 100vh; padding: 60px 24px 140px; background: #f3f4f2; box-sizing: border-box; animation: toolPageIn .32s cubic-bezier(.22,1,.36,1) both; }
.tool-card { animation: toolSlideIn .48s cubic-bezier(.22,1,.36,1) both; }
.tool-card:nth-child(2) { animation-delay: .06s; }.tool-card:nth-child(3) { animation-delay: .12s; }.tool-card:nth-child(4) { animation-delay: .18s; }.tool-card:nth-child(5) { animation-delay: .24s; }.tool-card:nth-child(6) { animation-delay: .3s; }
.tool-card:active { transform: translateX(3px) scale(.99); transition: transform .12s ease; }
.tools-head { margin-bottom: 24px; }
.tools-h1 { display: block; font-size: 28px; font-weight: 700; color: #143e37; letter-spacing: 0.5px; }
.tools-sub { display: block; font-size: 13px; color: #71807a; margin-top: 8px; }
.group-title { display: block; font-size: 13px; color: #71807a; margin-bottom: 12px; }
.group-title.second { margin-top: 28px; }
.tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tool-card {
  position: relative;
  min-height: 120px;
  padding: 14px 12px;
  background: #ffffff;
  border-radius: 17px;
  border: 1px solid #e9ece7;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 11px;
  box-sizing: border-box;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tool-card:active { transform: scale(0.97); }
.tool-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tool-icon-img { width: 19px; height: 19px; }
.tool-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tool-name { display: block; font-size: 14px; font-weight: 500; color: #243830; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tool-desc { display: block; font-size: 11px; color: #71807a; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tool-arrow { position: absolute; right: 12px; top: 17px; font-size: 18px; color: #8c998f; line-height: 1; }
.safe-note { display: block; text-align: center; font-size: 11px; color: #8b9489; margin-top: 40px; }
</style>