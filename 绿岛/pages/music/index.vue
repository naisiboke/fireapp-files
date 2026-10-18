<template>
  <view class="music-page">
    <view class="head"><text class="title">音乐</text><text class="close" @tap="close">×</text></view>
    <view class="hero"><text class="kicker">专注一下</text><text class="hero-title">给今天留一点安静</text><text class="hero-sub">这里会放入你的三首原创音乐。</text></view>
    <view class="empty">
      <view class="music-mark">♫</view>
      <text class="empty-title">还没有音乐</text>
      <text class="empty-sub">你之后可以把 MP3 文件放到音乐目录，再在这里播放。</text>
    </view>
    <text class="note">支持轻量 MP3 音频；当前页面已清空示例歌曲。</text>
  </view>
</template>

<script>
export default {
  methods: { close() { uni.navigateBack() } },
}
</script>

<style>
.music-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 20px 32px;background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:10;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#fdfdfb;border-bottom:1px solid #edf1eb;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#243830}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#243830}.hero{padding:22px 4px 20px}.kicker{display:block;color:#527059;font-size:12px;letter-spacing:.14em;font-weight:600}.hero-title{display:block;color:#173d35;font-size:27px;font-weight:700;line-height:1.4;margin-top:10px}.hero-sub{display:block;color:#71807a;font-size:13px;line-height:1.7;margin-top:10px}.empty{min-height:230px;padding:24px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #e5e9e0;border-radius:18px;background:#f2f5ef}.music-mark{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dce9d9;color:#426052;font-size:30px}.empty-title{display:block;color:#243830;font-size:16px;font-weight:600;margin-top:16px}.empty-sub{display:block;max-width:250px;color:#71807a;font-size:13px;line-height:1.7;text-align:center;margin-top:8px}.note{display:block;text-align:center;color:#8b9489;font-size:12px;line-height:1.6;margin:20px 10px}
</style>
