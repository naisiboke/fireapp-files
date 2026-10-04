<template>
  <view class="onboarding">
    <view class="noise">
      <text v-for="(word,i) in words" :key="i" class="word" :class="{core:word.core,bg:word.bg}" :style="word.style">{{ word.text }}</text>
    </view>
    <button class="skip" @tap="skip">跳过引导</button>
    <view class="hope">
      <view class="beacon"></view>
      <text class="hope-title">在喧嚣中，抓住你的绿岛。</text>
      <button class="start" @tap="enter">踏上绿岛</button>
    </view>
    <view v-if="revealing" class="reveal"></view>
  </view>
</template>
<script>
import { state, persist } from '@/store/index.js'
export default {
  data(){return{state, revealing:false, timer:null, words:[]}},
  onLoad(){this.makeWords();this.timer=setTimeout(()=>{},8200)},
  onUnload(){if(this.timer)clearTimeout(this.timer)},
  methods:{
    makeWords(){
      const pool=['来不及了','养老负债','35岁危机','没有退路了','房贷','焦虑','加班','失业','通胀','比较','绩效','责任','时间不够','要是失败','存款太少','不敢停下','未来怎么办','压力','选择太少','还不能休息'];
      this.words=Array.from({length:54},(_,i)=>{const angle=(i/54)*Math.PI*2-Math.PI/2;const radiusX=core?30:38;const radiusY=core?28:36;const x=50+Math.cos(angle)*radiusX;const y=50+Math.sin(angle)*radiusY;const core=['来不及了','养老负债','35岁危机','没有退路了'].includes(pool[(i*17)%pool.length]);return{text:pool[(i*17)%pool.length],core,bg:i%5===0&&!core,style:{left:x+'%',top:y+'%',fontSize:core?'clamp(30px,22vw,86px)':'clamp(16px,5vw,29px)','--angle':((i*7%17)-8)+'deg','--word-delay':(i%15*.07)+'s',animationDelay:(i%15*.07)+'s'}}})
    },
    skip(){this.enter(true)},
    enter(skip=false){if(this.revealing)return;if(skip){state.started=true;persist();uni.reLaunch({url:'/pages/index/index'});return}this.revealing=true;setTimeout(()=>{state.started=true;persist();uni.reLaunch({url:'/pages/index/index'})},650)},
  },
}
</script>
<style>
.onboarding{position:fixed;inset:0;overflow:hidden;background:#0a0a0a;color:#fff}.noise{position:absolute;inset:0;background:radial-gradient(circle at 50% 48%,rgba(92,8,8,.22),transparent 54%);overflow:hidden}.noise:after{content:"";position:absolute;inset:0;background:radial-gradient(circle,transparent 35%,rgba(0,0,0,.48) 100%)}.word{position:absolute;z-index:1;color:#ff5148;font-family:"STSong",serif;font-weight:900;line-height:1.2;white-space:nowrap;text-shadow:0 1px 3px #000,0 0 7px #000;animation-name:wordIn;animation-duration:7s;animation-timing-function:cubic-bezier(.25,.46,.45,.94);animation-fill-mode:both;animation-delay:var(--word-delay)}.word.bg{color:#660000;opacity:.72}.word.core{color:#ff3333;text-shadow:0 0 5px #ff3333,0 0 14px rgba(255,51,51,.9),0 2px 4px #000}.skip{position:absolute;z-index:5;right:20px;top:24px;padding:9px 14px;border:1px solid #ffffff29;border-radius:999px;background:#ffffff0a;color:#ffffff99;font-size:12px}.hope{position:absolute;z-index:3;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;animation:hopeIn 1s cubic-bezier(.2,.9,.22,1) 8.2s both}.beacon{width:8px;height:8px;border-radius:50%;background:#00e676;box-shadow:0 0 10px #00e676,0 0 36px #00e676b3,0 0 80px #00e67655;animation:beaconIn .9s ease-out 8s both,breathe 1.8s ease-in-out 8.95s infinite}.hope-title{margin-top:32px;color:#ffffffe8;font-size:clamp(21px,5.5vw,28px);font-weight:300;letter-spacing:.12em}.start{margin-top:34px;padding:12px 26px;border:1px solid #00e676b8;border-radius:999px;background:#00e67614;color:#b9ffd7;font-size:14px;letter-spacing:.12em;opacity:0;animation:buttonIn .8s ease 8.95s both}.reveal{position:absolute;z-index:10;inset:0;background:#164b31;animation:reveal .65s cubic-bezier(.645,.045,.355,1) both}@keyframes wordIn{0%{opacity:0;transform:translateY(-14px) scale(.72) rotate(var(--angle));filter:blur(4px)}22%{opacity:.85;transform:translateY(0) scale(1.06) rotate(var(--angle));filter:blur(0)}52%{opacity:.85;transform:scale(1)}66%{opacity:.7;filter:blur(7px)}82%{opacity:.45;transform:translateY(24px);filter:blur(16px)}100%{opacity:0;transform:translateY(160px);filter:blur(20px)}}@keyframes hopeIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes beaconIn{from{opacity:0;transform:scale(.2);filter:blur(8px)}to{opacity:1;transform:scale(1);filter:blur(0)}}@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}@keyframes buttonIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes reveal{from{clip-path:circle(0 at 50% 78%)}to{clip-path:circle(150% at 50% 78%)}}@media(prefers-reduced-motion:reduce){.word{animation:none;opacity:.55}.hope{animation:none;opacity:1}.start{animation:none;opacity:1}.beacon{animation:breathe 2s infinite}}
</style>