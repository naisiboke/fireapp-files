<template>
  <view class="music-page">
    <view class="topbar"><text class="brand">绿岛音乐</text><view class="tabs"><text class="tab active">推荐</text><text class="tab">原创音乐</text></view><text class="search">⌕</text></view>

    <view v-if="loading" class="loading">正在准备音乐…</view>
    <view v-else-if="error" class="empty"><text class="empty-title">音乐暂时无法加载</text><text class="empty-sub">{{ error }}</text></view>
    <view v-else class="feed">
      <view class="mood-title">轻轻听见自己的节奏</view>
      <view class="cover-card" :class="'cover-' + currentIndex">
        <view class="cover-light"></view>
        <view class="cover-island"><view class="cover-sun"></view><view class="cover-house"></view></view>
        <text class="cover-name">{{ currentTrack.name }}</text>
        <text class="cover-sub">原创音乐 · 绿岛</text>
        <button class="big-play" @tap="togglePlay">{{ playing ? 'Ⅱ' : '▶' }}</button>
        <view class="cover-caption">给今天留一点安静</view>
        <view class="progress"><view class="progress-fill" :style="{ width: progress + '%' }"></view></view>
        <view class="time-row"><text>{{ formatTime(currentTime) }}</text><text>{{ formatTime(duration) }}</text></view>
      </view>

      <view class="actions"><view><text class="action-icon">♡</text><text>喜欢</text></view><view><text class="action-icon">○</text><text>评论</text></view><view><text class="action-icon">↗</text><text>分享</text></view></view>

      <view class="mini-player">
        <view class="mini-cover"><text>♫</text></view>
        <view class="mini-copy"><text>{{ currentTrack.name }}</text><text>原创音乐 · 绿岛</text></view>
        <button class="mini-button" @tap="previous">‹</button><button class="mini-button main" @tap="togglePlay">{{ playing ? 'Ⅱ' : '▶' }}</button><button class="mini-button" @tap="next">›</button>
      </view>

      <view class="track-list"><text class="list-title">我的音乐</text><view v-for="(track,index) in tracks" :key="track.name" class="track-row" :class="{ selected:index===currentIndex }" @tap="selectTrack(index)"><view class="track-number">{{ index + 1 }}</view><view class="track-copy"><text>{{ track.name }}</text><text>原创 MP3</text></view><text class="track-state">{{ index===currentIndex && playing ? '正在播放' : '播放' }}</text></view></view>
    </view>
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
  data() { return { tracks: [], currentIndex: 0, playing: false, loading: true, error: '', currentTime: 0, duration: 0, audio: null } },
  computed: { currentTrack() { return this.tracks[this.currentIndex] || { name: '绿岛音乐' } }, progress() { return this.duration ? Math.min(100, this.currentTime / this.duration * 100) : 0 } },
  async onLoad() {
    try {
      const urls = await Promise.all(FILES.map(file => getMediaURL(file.id)))
      this.tracks = FILES.map((file,index) => ({ ...file, url: urls[index] })).filter(file => file.url)
      if (!this.tracks.length) throw new Error('请确认云存储允许登录用户读取')
      this.audio = uni.createInnerAudioContext()
      this.audio.src = this.tracks[0].url
      this.audio.onTimeUpdate(() => { this.currentTime = this.audio.currentTime; this.duration = this.audio.duration || 0 })
      this.audio.onEnded(() => { this.next() })
      this.audio.onError(() => { this.playing = false; this.error = '音乐播放失败，请稍后重试' })
    } catch (error) { this.error = error.message || '请稍后重试' } finally { this.loading = false }
  },
  onUnload() { if (this.audio) { this.audio.stop(); this.audio.destroy() } },
  methods: {
    close() { uni.navigateBack() },
    formatTime(value) { const seconds = Math.floor(Number(value) || 0); return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') },
    togglePlay() { if (!this.audio) return; if (this.playing) { this.audio.pause(); this.playing = false } else { this.audio.play(); this.playing = true } },
    selectTrack(index) { if (!this.tracks[index]) return; this.currentIndex = index; this.audio.src = this.tracks[index].url; this.currentTime = 0; this.duration = 0; this.audio.play(); this.playing = true },
    next() { this.selectTrack((this.currentIndex + 1) % this.tracks.length) },
    previous() { this.selectTrack((this.currentIndex - 1 + this.tracks.length) % this.tracks.length) },
  },
}
</script>

<style>
.music-page{min-height:100vh;padding:calc(20px + env(safe-area-inset-top)) 18px calc(28px + env(safe-area-inset-bottom));background:#102b24;color:#f4f8ef;box-sizing:border-box}.topbar{display:flex;align-items:center;gap:18px;height:42px}.brand{font-size:19px;font-weight:700}.tabs{display:flex;gap:14px;flex:1}.tab{font-size:13px;color:#9bb6a3}.tab.active{color:#fff;font-weight:600}.search{font-size:26px;color:#d7e5bb}.feed{padding-top:22px}.mood-title{font-size:19px;letter-spacing:.08em;color:#d7e5bb;margin:3px 4px 16px}.cover-card{position:relative;min-height:430px;padding:24px;border-radius:24px;overflow:hidden;background:linear-gradient(150deg,#d6e4c8 0%,#759878 48%,#1b4a3a 100%);box-shadow:0 14px 35px rgba(0,0,0,.24);box-sizing:border-box}.cover-1{background:linear-gradient(150deg,#e2d9c1,#8b9e7b 48%,#24483c)}.cover-2{background:linear-gradient(150deg,#cad7d1,#6b9183 48%,#183d38)}.cover-light{position:absolute;right:-40px;top:-40px;width:230px;height:230px;border-radius:50%;background:rgba(255,244,190,.34);filter:blur(3px)}.cover-island{position:absolute;left:15%;right:15%;bottom:98px;height:120px;border-radius:50% 50% 35% 35%;background:linear-gradient(#7ba26e,#315d47);box-shadow:0 18px 0 rgba(22,58,44,.24)}.cover-sun{position:absolute;right:26px;top:-30px;width:65px;height:65px;border-radius:50%;background:#fff1bc;opacity:.8}.cover-house{position:absolute;left:45%;top:28px;width:45px;height:34px;background:#efe6c9;border-radius:4px;box-shadow:12px -12px 0 -4px #6d5740}.cover-name{position:relative;display:block;font-size:28px;font-weight:700;letter-spacing:.02em}.cover-sub{position:relative;display:block;font-size:12px;color:#e9f0df;margin-top:5px}.big-play{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:70px;height:70px;border-radius:50%;border:1px solid rgba(255,255,255,.7);background:rgba(15,48,38,.58);color:#fff;font-size:25px;display:flex;align-items:center;justify-content:center}.cover-caption{position:absolute;left:24px;bottom:66px;color:#f4f8ef;font-size:13px}.progress{position:absolute;left:24px;right:24px;bottom:43px;height:3px;border-radius:3px;background:rgba(255,255,255,.35)}.progress-fill{height:100%;border-radius:3px;background:#fff}.time-row{position:absolute;left:24px;right:24px;bottom:19px;display:flex;justify-content:space-between;font-size:10px;color:#e8f1e2}.actions{display:flex;gap:32px;padding:18px 10px;color:#c4d8c0;font-size:11px}.actions>view{display:flex;flex-direction:column;align-items:center;gap:4px}.action-icon{font-size:22px;color:#f0f6e9}.mini-player{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(215,229,187,.24);border-radius:18px;background:rgba(255,255,255,.1);backdrop-filter:blur(12px)}.mini-cover{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#d7e5bb;color:#173d35;font-size:21px}.mini-copy{flex:1;min-width:0}.mini-copy text{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mini-copy text:first-child{font-size:13px;color:#fff}.mini-copy text:last-child{font-size:10px;color:#a8c3ad;margin-top:3px}.mini-button{width:28px;height:28px;padding:0;border:0;background:transparent;color:#fff;font-size:23px}.mini-button.main{border:1px solid rgba(255,255,255,.65);border-radius:50%;font-size:13px}.track-list{margin-top:24px}.list-title{display:block;color:#d7e5bb;font-size:15px;font-weight:600;margin-bottom:10px}.track-row{display:flex;align-items:center;gap:10px;padding:12px 4px;border-bottom:1px solid rgba(215,229,187,.14)}.track-row.selected{color:#d7e5bb}.track-number{width:20px;color:#93aa98;font-size:12px}.track-copy{flex:1}.track-copy text{display:block}.track-copy text:first-child{font-size:14px}.track-copy text:last-child{font-size:10px;color:#8eaa98;margin-top:3px}.track-state{font-size:11px;color:#a9c7ad}
</style>
