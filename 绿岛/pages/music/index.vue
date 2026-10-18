<template>
  <view class="music-page">
    <view class="topbar"><text class="brand">音乐</text><view class="tabs"><text class="tab active">推荐</text><text class="tab">音乐库</text></view><text class="close" @tap="close">×</text></view>

    <view v-if="loading" class="loading">正在准备音乐…</view>
    <view v-else-if="error" class="empty"><text class="empty-title">音乐暂时无法加载</text><text class="empty-sub">{{ error }}</text></view>
    <view v-else class="feed">
      <view class="mood-title">轻轻听见自己的节奏</view>
      <view class="cover-card" :class="'cover-' + currentIndex">
        <view class="cover-light"></view>
        <view class="cover-island"><view class="cover-sun"></view><view class="cover-house"></view></view>
        <text class="cover-name">{{ currentTrack.name }}</text>
        <text class="cover-sub">原创音乐 · 绿岛</text>
        <button class="big-play" @tap="togglePlay"><view v-if="playing" class="pause-symbol"><i></i><i></i></view><text v-else class="play-symbol">▶</text></button>
        <view class="cover-caption">给今天留一点安静</view>
        <view class="progress"><view class="progress-fill" :style="{ width: progress + '%' }"></view></view>
        <view class="time-row"><text>{{ formatTime(currentTime) }}</text><text>{{ formatTime(duration) }}</text></view>
      </view>

      <view class="actions"><view><view class="action-icon heart-icon"></view><text>喜欢</text></view><view><view class="action-icon comment-icon"></view><text>评论</text></view><view><view class="action-icon share-icon"></view><text>分享</text></view></view>

      <view class="mini-player">
        <view class="mini-cover"><text>♫</text></view>
        <view class="mini-copy"><text>{{ currentTrack.name }}</text><text>原创音乐 · 绿岛</text></view>
        <button class="mini-button" @tap="previous">‹</button><button class="mini-button main" @tap="togglePlay"><view v-if="playing" class="pause-symbol small"><i></i><i></i></view><text v-else class="play-symbol small">▶</text></button><button class="mini-button" @tap="next">›</button>
      </view>

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
.music-page{min-height:100vh;padding:calc(20px + env(safe-area-inset-top)) 18px calc(28px + env(safe-area-inset-bottom));background:#fdfdfb;color:#243830;box-sizing:border-box}.topbar{display:flex;align-items:center;gap:18px;height:42px}.brand{font-size:19px;font-weight:700;color:#243830}.tabs{display:flex;gap:14px;flex:1}.tab{font-size:13px;color:#8b9a8d}.tab.active{color:#243830;font-weight:600}.close{font-size:28px;color:#243830;line-height:1;padding:4px}.feed{padding-top:22px}.mood-title{font-size:19px;letter-spacing:.08em;color:#527059;margin:3px 4px 16px}.cover-card{position:relative;min-height:430px;padding:24px;border-radius:24px;overflow:hidden;background:linear-gradient(150deg,#e7f0df 0%,#b5cdb3 48%,#6f957c 100%);box-shadow:0 14px 35px rgba(0,0,0,.24);box-sizing:border-box}.cover-1{background:linear-gradient(150deg,#e9efe4,#c4d3ba 48%,#789679)}.cover-2{background:linear-gradient(150deg,#e3eee9,#b4d0c1 48%,#6b9683)}.cover-light{position:absolute;right:-40px;top:-40px;width:230px;height:230px;border-radius:50%;background:rgba(255,244,190,.34);filter:blur(3px)}.cover-island{position:absolute;left:15%;right:15%;bottom:98px;height:120px;border-radius:50% 50% 35% 35%;background:linear-gradient(#7ba26e,#315d47);box-shadow:0 18px 0 rgba(22,58,44,.24)}.cover-sun{position:absolute;right:26px;top:-30px;width:65px;height:65px;border-radius:50%;background:#fff1bc;opacity:.8}.cover-house{position:absolute;left:45%;top:28px;width:45px;height:34px;background:#efe6c9;border-radius:4px;box-shadow:12px -12px 0 -4px #6d5740}.cover-name{position:relative;display:block;font-size:28px;font-weight:700;letter-spacing:.02em}.cover-sub{position:relative;display:block;font-size:12px;color:#526a58;margin-top:5px}.big-play::after,.mini-button::after{display:none!important}.big-play{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);width:70px;height:70px;padding:0;margin:0;box-sizing:border-box;border-radius:50%;border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.72);color:#173d35;font-size:25px;display:flex;align-items:center;justify-content:center}.cover-caption{position:absolute;left:24px;bottom:66px;color:#f4f8ef;font-size:13px}.progress{position:absolute;left:24px;right:24px;bottom:43px;height:3px;border-radius:3px;background:rgba(255,255,255,.35)}.progress-fill{height:100%;border-radius:3px;background:#fff}.time-row{position:absolute;left:24px;right:24px;bottom:19px;display:flex;justify-content:space-between;font-size:10px;color:#e8f1e2}.actions{display:flex;gap:32px;padding:18px 10px;color:#71807a;font-size:11px}.actions>view{display:flex;flex-direction:column;align-items:center;gap:4px}.action-icon{position:relative;width:30px;height:30px;display:flex;align-items:center;justify-content:center;color:#527059}.heart-icon:before{content:'♡';font-size:30px;line-height:1}.comment-icon{border:1.8px solid #527059;border-radius:50%}.comment-icon:after{content:'···';position:absolute;left:5px;top:0;font-size:15px;letter-spacing:0}.share-icon:before{content:'↗';font-size:30px;line-height:1}.mini-player{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(215,229,187,.24);border-radius:18px;background:#f1f5ef;border:1px solid #dce8dc}.mini-cover{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#d7e5bb;color:#173d35;font-size:21px}.mini-copy{flex:1;min-width:0}.mini-copy text{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mini-copy text:first-child{font-size:13px;color:#243830}.mini-copy text:last-child{font-size:10px;color:#71807a;margin-top:3px}.mini-button{width:32px;height:32px;padding:0;margin:0;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:#173d35;font-size:23px}.mini-button.main{border:1px solid #b8cbb9;border-radius:50%;font-size:13px}.track-list{margin-top:24px}.list-title{display:block;color:#527059;font-size:15px;font-weight:600;margin-bottom:10px}.track-row{display:flex;align-items:center;gap:10px;padding:12px 4px;border-bottom:1px solid #e5e9e0}.track-row.selected{color:#527059}.track-number{width:20px;color:#8b9a8d;font-size:12px}.track-copy{flex:1}.track-copy text{display:block}.track-copy text:first-child{font-size:14px}.track-copy text:last-child{font-size:10px;color:#71807a;margin-top:3px}.track-state{font-size:11px;color:#527059}
.play-symbol{font-size:24px;line-height:1}.pause-symbol{display:flex;gap:4px;align-items:center;justify-content:center}.pause-symbol i{display:block;width:4px;height:22px;border-radius:2px;background:#173d35}.pause-symbol.small i{width:3px;height:12px}.play-symbol.small{font-size:13px}
</style>