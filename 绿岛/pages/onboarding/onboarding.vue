<template>
  <view class="onboarding">
    <view class="noise-layer" aria-hidden="true"></view>
    <view class="word-field" aria-hidden="true">
      <text
        v-for="word in words"
        :key="word.id"
        class="anxiety-word"
        :class="{ 'is-core': word.core, 'is-dim': word.dim }"
        :style="word.style"
      >{{ word.text }}</text>
    </view>

    <button class="skip-button" @tap="skip">跳过引导</button>

    <view class="hope-layer">
      <view class="green-beacon"></view>
      <text class="hope-title">在喧嚣中，抓住你的绿岛。</text>
      <button class="enter-button" @tap="enter">踏上绿岛</button>
    </view>

    <view v-if="revealing" class="reveal-layer" :style="revealStyle"></view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { state, persist } from '@/store/index.js'

const revealing = ref(false)
const revealX = ref('50%')
const revealY = ref('50%')

const sourceWords = [
  '养老负债', '同龄人买房买车', '35岁危机', '存款为0', '通货膨胀',
  '房贷30年', '工作会消失吗', '永远存不够', '被迫加班', '中年失业',
  '孩子教育', '父母养老', '钱不够用', '房价还在涨', '贷款压着我',
  '未来没有保障', '来不及了', '没有退路', '害怕失败', '收入停滞',
  '机会太少', '生活成本', '每天都好累', '不敢停下', '时间不够',
  '要是失败', '选择太少', '压力太大'
]
const coreWords = ['35岁危机', '养老负债', '来不及了', '没有退路']

const words = computed(() => {
  const result = []
  const count = 42
  for (let i = 0; i < count; i += 1) {
    const ring = Math.floor(i / 14)
    const slot = i % 14
    const angle = slot / 14 * Math.PI * 2 - Math.PI / 2 + (ring % 2 ? 0.12 : 0)
    const radiusX = [37, 30, 22][ring]
    const radiusY = [30, 24, 18][ring]
    const x = 50 + Math.cos(angle) * radiusX
    const y = 50 + Math.sin(angle) * radiusY
    const core = ring === 2
    const text = core ? coreWords[slot % coreWords.length] : sourceWords[(i * 5) % sourceWords.length]
    const size = core ? 'clamp(28px, 9vw, 42px)' : ring === 1 ? 'clamp(18px, 5vw, 24px)' : 'clamp(16px, 4vw, 21px)'
    const delay = (ring * 0.62 + slot * 0.035).toFixed(2) + 's'
    result.push({
      id: i,
      text,
      core,
      dim: ring === 0 && slot % 4 === 0,
      style: {
        left: x + '%',
        top: y + '%',
        fontSize: size,
        '--word-angle': ((slot % 5) - 2) + 'deg',
        '--word-delay': delay
      }
    })
  }
  return result
})

const revealStyle = computed(() => ({
  '--reveal-x': revealX.value,
  '--reveal-y': revealY.value
}))

function setLightTheme() {
  uni.setStorageSync('fire_theme_v1', 'light')
}

function finishOnboarding() {
  state.started = true
  setLightTheme()
  persist()
}

function enter(event) {
  if (revealing.value) return
  const point = event?.detail || {}
  if (Number.isFinite(point.x)) revealX.value = point.x + 'px'
  if (Number.isFinite(point.y)) revealY.value = point.y + 'px'
  revealing.value = true
  setTimeout(() => {
    finishOnboarding()
    uni.reLaunch({ url: '/pages/index/index' })
  }, 620)
}

function skip() {
  if (revealing.value) return
  finishOnboarding()
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss">
.onboarding {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
  color: #fff;
  box-sizing: border-box;
  padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom);
}
.noise-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .07;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E");
}
.word-field { position: absolute; inset: 0; overflow: hidden; }
.anxiety-word {
  position: absolute;
  z-index: 1;
  max-width: 44vw;
  transform: translate(-50%, -50%) rotate(var(--word-angle));
  transform-origin: center;
  white-space: nowrap;
  color: #ff3333;
  font-family: "思源宋体 Heavy", "尚巍手书", "Source Han Serif SC", "STSong", serif;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: .02em;
  text-shadow: 0 1px 3px rgba(0,0,0,.9);
  animation: anxietyIn 7.2s cubic-bezier(.25,.46,.45,.94) var(--word-delay) both;
  will-change: transform, opacity;
}
.anxiety-word.is-dim { color: #660000; opacity: .8; }
.anxiety-word.is-core {
  color: #ff3333;
  text-shadow: 0 0 5px #ff3333, 0 0 13px rgba(255,51,51,.55), 0 2px 4px #000;
}
.skip-button {
  position: absolute;
  z-index: 5;
  top: calc(18px + env(safe-area-inset-top));
  right: 18px;
  min-width: 88px;
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 999px;
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.72);
  font-size: 12px;
  line-height: 1.2;
}
.hope-layer {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  animation: hopeIn .8s cubic-bezier(.2,.9,.22,1) 6.8s both;
}
.green-beacon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00e676;
  filter: blur(.2px);
  box-shadow: 0 0 10px #00e676, 0 0 34px rgba(0,230,118,.7), 0 0 80px rgba(0,230,118,.25);
  animation: beaconIn .75s ease-out 6.55s both, beaconBreath 2.2s ease-in-out 7.3s infinite;
}
.hope-title {
  margin-top: 30px;
  color: rgba(238,255,246,.94);
  font-size: clamp(20px, 5.5vw, 26px);
  font-weight: 300;
  letter-spacing: .12em;
  text-align: center;
}
.enter-button {
  min-width: 132px;
  min-height: 48px;
  margin-top: 30px;
  padding: 10px 24px;
  border: 1px solid #00e676;
  border-radius: 999px;
  background: rgba(0,230,118,.12);
  color: #c4ffdc;
  font-size: 14px;
  letter-spacing: .12em;
  opacity: 0;
  pointer-events: auto;
  animation: buttonIn .65s ease 7.3s both;
}
.enter-button:active { transform: scale(.96); }
.reveal-layer {
  position: absolute;
  z-index: 10;
  inset: 0;
  background: #fdfdfb;
  clip-path: circle(0 at var(--reveal-x) var(--reveal-y));
  animation: circularReveal .62s cubic-bezier(.645,.045,.355,1) forwards;
}
@keyframes anxietyIn {
  0% { opacity: 0; transform: translate(-50%, -50%) translateY(-18px) scale(.78) rotate(var(--word-angle)); }
  18% { opacity: .92; transform: translate(-50%, -50%) translateY(0) scale(1.04) rotate(var(--word-angle)); }
  48% { opacity: .9; transform: translate(-50%, -50%) scale(1) rotate(var(--word-angle)); }
  66% { opacity: .82; transform: translate(-50%, -50%) scale(1) rotate(var(--word-angle)); filter: blur(0); }
  78% { opacity: .5; transform: translate(-50%, -50%) scale(1) rotate(var(--word-angle)); filter: blur(3px); }
  100% { opacity: 0; transform: translate(-50%, calc(-50% + 30px)) scale(.98) rotate(var(--word-angle)); filter: blur(8px); }
}
@keyframes hopeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes beaconIn { from { opacity: 0; transform: scale(.2); } to { opacity: 1; transform: scale(1); } }
@keyframes beaconBreath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
@keyframes buttonIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes circularReveal { from { clip-path: circle(0 at var(--reveal-x) var(--reveal-y)); } to { clip-path: circle(150% at var(--reveal-x) var(--reveal-y)); } }
@media (prefers-reduced-motion: reduce) {
  .anxiety-word, .hope-layer, .green-beacon, .enter-button { animation: none; }
  .anxiety-word { opacity: .55; }
  .hope-layer { opacity: 1; }
  .enter-button { opacity: 1; }
}
</style>
