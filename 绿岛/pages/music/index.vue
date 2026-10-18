<template>
  <view class="music-page">
    <view class="head"><text class="title">音乐</text><text class="close" @tap="close">×</text></view>
    <view class="hero"><text class="kicker">专注一下</text><text class="hero-title">给今天留一点安静</text><text class="hero-sub">你的三首音乐，适合不同的专注时刻。</text></view>
    <view v-if="loading" class="loading">正在准备音乐…</view>
    <view v-else-if="error" class="empty"><text class="empty-title">音乐暂时无法加载</text><text class="empty-sub">{{ error }}</text></view>
    <view v-else>
      <view v-for="track in tracks" :key="track.name" class="track">
        <view class="track-icon">♪</view>
        <view class="track-copy"><text class="track-name">{{ track.name }}</text><text class="track-desc">MP3 · 云端音乐</text></view>
        <audio class="audio" :src="track.url" :name="track.name" controls />
      </view>
    </view>
    <text class="note">音乐文件保存在 CloudBase 云存储中。</text>
  </view>
</template>

<script>
import { getMediaURL } from '@/utils/cloudbase-auth.js'

const FILES = [
  { name: 'Anticipate', id: 'cloud://ziyoukedu-d0gyrczqk4de53b87.7a69-ziyoukedu-d0gyrczqk4de53b87-1311439378/music/Anticipate.mp3' },
  { name: 'Fleetingme', id: 'cloud://ziyoukedu-d0gyrczqk4de53b87.7a69-ziyoukedu-d0gyrczqk4de53b87-1311439378/music/Fleetingme.mp3' },
  { name: 'Wind Trail', id: 'cloud://ziyoukedu-d0gyrczqk4de53b87.7a69-ziyoukedu-d0gyrczqk4de53b87-1311439378/music/Wind Trail.mp3' },
]

export default {
  data() { return { tracks: [], loading: true, error: '' } },
  async onLoad() {
    try {
      const urls = await Promise.all(FILES.map(file => getMediaURL(file.id)))
      this.tracks = FILES.map((file, index) => ({ ...file, url: urls[index] })).filter(file => file.url)
      if (!this.tracks.length) throw new Error('请确认云存储允许登录用户读取')
    } catch (error) {
      this.error = error.message || '请稍后重试'
    } finally { this.loading = false }
  },
  methods: { close() { uni.navigateBack() } },
}
</script>

<style>
.music-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 20px 32px;background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:10;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#fdfdfb;border-bottom:1px solid #edf1eb;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#243830}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#243830}.hero{padding:22px 4px 20px}.kicker{display:block;color:#527059;font-size:12px;letter-spacing:.14em;font-weight:600}.hero-title{display:block;color:#173d35;font-size:27px;font-weight:700;line-height:1.4;margin-top:10px}.hero-sub{display:block;color:#71807a;font-size:13px;line-height:1.7;margin-top:10px}.loading,.empty{padding:42px 20px;border:1px solid #e5e9e0;border-radius:18px;background:#f2f5ef;text-align:center}.empty-title{display:block;color:#243830;font-size:16px;font-weight:600}.empty-sub{display:block;color:#71807a;font-size:13px;line-height:1.7;margin-top:8px}.track{display:flex;align-items:center;gap:12px;padding:14px;margin-bottom:10px;border:1px solid #e5e9e0;border-radius:15px;background:#fff}.track-icon{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e8f0e6;color:#426052;font-size:24px}.track-copy{flex:1;min-width:90px}.track-name{display:block;color:#243830;font-size:14px;font-weight:600}.track-desc{display:block;color:#71807a;font-size:11px;margin-top:4px}.audio{width:150px;height:36px}.note{display:block;text-align:center;color:#8b9489;font-size:12px;line-height:1.6;margin:20px 10px}
</style>
