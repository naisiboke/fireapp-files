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
  onLoad(){this.makeWords()},
  onUnload(){if(this.timer)clearTimeout(this.timer)},
  methods:{
    makeWords(){
      const pool=['房贷','焦虑','加班','失业','通胀','比较','绩效','责任','时间不够','要是失败','存款太少','不敢停下','未来怎么办','压力','选择太少','还不能休息'];
      const coreWords=['来不及了','养老负债','35岁危机','没有退路了'];
      this.words=Array.from({length:30},(_,i)=>{
        const ring=Math.floor(i/10);
        const slot=i%10;
        const angle=(slot/10)*Math.PI*2-Math.PI/2+(ring%2)*0.16;
        const core=ring===2;
        const radiusX=[43,34,24][ring];
        const radiusY=[34,28,21][ring];
        const x=50+Math.cos(angle)*radiusX;
        const y=50+Math.sin(angle)*radiusY;
        const text=core?coreWords[slot%coreWords.length]:pool[(i*3)%pool.length];
        const size=core?'clamp(29px,12vw,54px)':ring===1?'clamp(18px,5vw,28px)':'clamp(14px,4vw,22px)';
        const delay=(ring*0.72+slot*0.045).toFixed(2)+'s';
        return {text,core,bg:ring===0&&slot%3===0,style:{left:x+'%',top:y+'%',marginLeft:'-50%',marginTop:'-50%',fontSize:size,'--angle':((slot%5)-2)+'deg','--word-delay':delay,animationDelay:delay}}
      })
    },
    skip(){this.enter(true)},
    enter(skip=false){if(this.revealing)return;if(skip){state.started=true;persist();uni.reLaunch({url:'/pages/index/index'});return}this.revealing=true;setTimeout(()=>{state.started=true;persist();uni.reLaunch({url:'/pages/index/index'})},650)},
  },
}
</script>
<style>
.onboarding{position:fixed;inset:0;overflow:hidden;background:#0a0a0a;color:#fff}.noise{position:absolute;inset:0;background:radial-gradient(circle at 50% 48%,rgba(92,8,8,.22),transparent 54%);overflow:hidden}.noise:after{content:"";position:absolute;inset:0;background:radial-gradient(circle,transparent 35%,rgba(0,0,0,.48) 100%)}.word{position:absolute;z-index:1;color:#ff5148;font-family:"STSong",serif;font-weight:900;line-height:1.2;white-space:nowrap;text-shadow:0 1px 3px #000,0 0 7px #000;animation-name:wordIn;animation-duration:3.7s;animation-timing-function:cubic-bezier(.25,.46,.45,.94);animation-fill-mode:both;animation-delay:var(--word-delay)}.word.bg{color:#660000;opacity:.72}.word.core{color:#ff3333;text-shadow:0 0 5px #ff3333,0 0 14px rgba(255,51,51,.9),0 2px 4px #000}.skip{position:absolute;z-index:5;right:20px;top:24px;padding:9px 14px;border:1px solid #ffffff29;border-radius:999px;background:#ffffff0a;color:#ffffff99;font-size:12px}.hope{position:absolute;z-index:3;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;animation:hopeIn .8s cubic-bezier(.2,.9,.22,1) 5.15s both}.beacon{width:8px;height:8px;border-radius:50%;background:#00e676;box-shadow:0 0 10px #00e676,0 0 36px #00e676b3,0 0 80px #00e67655;animation:beaconIn .7s ease-out 4.95s both,breathe 1.8s ease-in-out 5.85s infinite}.hope-title{margin-top:32px;color:#ffffffe8;font-size:clamp(21px,5.5vw,28px);font-weight:300;letter-spacing:.12em}.start{margin-top:34px;padding:12px 26px;border:1px solid #00e676b8;border-radius:999px;background:#00e67614;color:#b9ffd7;font-size:14px;letter-spacing:.12em;opacity:0;animation:buttonIn .65s ease 5.85s both}.reveal{position:absolute;z-index:10;inset:0;background:#164b31;animation:reveal .65s cubic-bezier(.645,.045,.355,1) both}@keyframes wordIn{0%{opacity:0;transform:translateY(-8px) scale(.88) rotate(var(--angle))}22%{opacity:.92;transform:translateY(0) scale(1.02) rotate(var(--angle))}62%{opacity:.88;transform:translateY(0) scale(1) rotate(var(--angle))}100%{opacity:0;transform:translateY(18px) scale(.98) rotate(var(--angle))}}@keyframes hopeIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes beaconIn{from{opacity:0;transform:scale(.2);filter:blur(8px)}to{opacity:1;transform:scale(1);filter:blur(0)}}@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}@keyframes buttonIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes reveal{from{clip-path:circle(0 at 50% 78%)}to{clip-path:circle(150% at 50% 78%)}}@media(prefers-reduced-motion:reduce){.word{animation:none;opacity:.55}.hope{animation:none;opacity:1}.start{animation:none;opacity:1}.beacon{animation:breathe 2s infinite}}
</style>