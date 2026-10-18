<template>
  <view class="music-page">
    <view class="head"><text class="title">音乐</text><text class="close" @tap="close">×</text></view>
    <view class="hero"><text class="kicker">专注一下</text><text class="hero-title">给今天留一点安静</text><text class="hero-sub">选择一个适合当前状态的氛围，开始你的专注时间。</text></view>
    <view v-for="item in tracks" :key="item.name" class="track" @tap="choose(item)"><view class="track-icon">{{ item.icon }}</view><view class="track-copy"><text class="track-name">{{ item.name }}</text><text class="track-desc">{{ item.desc }}</text></view><text class="play">{{ selected===item.name ? 'Ⅱ' : '▶' }}</text></view>
    <text class="note">音乐播放功能会在后续版本接入完整音频内容。</text>
  </view>
</template>
<script>
export default {
  data() { return { selected: '', tracks: [{ name: '清晨专注', desc: '适合开始一天的计划', icon: '☼' }, { name: '深度工作', desc: '减少打扰，专注当下', icon: '◒' }, { name: '夜晚放松', desc: '让一天慢慢收尾', icon: '☾' }] } },
  methods: { close() { uni.navigateBack() }, choose(item) { this.selected = this.selected === item.name ? '' : item.name; uni.showToast({ title: this.selected ? item.name : '已暂停', icon: 'none' }) } },
}
</script>
<style>
.music-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 20px 32px;background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:10;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#fdfdfb;border-bottom:1px solid #edf1eb;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#243830}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#243830}.hero{padding:22px 4px 20px}.kicker{display:block;color:#527059;font-size:12px;letter-spacing:.14em;font-weight:600}.hero-title{display:block;color:#173d35;font-size:27px;font-weight:700;line-height:1.4;margin-top:10px}.hero-sub{display:block;color:#71807a;font-size:13px;line-height:1.7;margin-top:10px}.track{display:flex;align-items:center;gap:13px;padding:15px;margin-bottom:10px;border:1px solid #e5e9e0;border-radius:15px;background:#fff}.track-icon{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e8f0e6;color:#527059;font-size:22px}.track-copy{flex:1}.track-name{display:block;color:#243830;font-size:15px;font-weight:600}.track-desc{display:block;color:#71807a;font-size:12px;margin-top:4px}.play{color:#173d35;font-size:16px}.note{display:block;text-align:center;color:#8b9489;font-size:12px;line-height:1.6;margin:20px 10px}
</style>
