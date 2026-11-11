
<template>
 <view class="countdown-switch" role="group" aria-label="倒计时类型">
  <view class="countdown-switch-indicator" :class="{'on-goal':activeGoal}" aria-hidden="true"></view>
  <button class="countdown-switch-option" data-fire-press="true" :class="{selected:!activeGoal}" :aria-pressed="!activeGoal" @mousedown.prevent @tap.stop="$emit('change','fire')" @keydown.right.prevent="$emit('change','goal')" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text>自由日</text></button>
  <button class="countdown-switch-option" data-fire-press="true" :class="{selected:activeGoal}" :aria-pressed="activeGoal" @mousedown.prevent @tap.stop="$emit('change','goal')" @keydown.left.prevent="$emit('change','fire')" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text>我的目标</text></button>
 </view>
</template>
<script>
export default{name:'CountdownSwitch',props:{activeGoal:Boolean},emits:['change']}
</script>
<style>
.countdown-switch{position:relative;z-index:4;display:flex;width:174px;max-width:100%;height:28px;padding:0;box-sizing:border-box;isolation:isolate;margin:0 0 12px;box-shadow:none}
.countdown-switch-indicator{position:absolute;left:10px;bottom:0;width:67px;height:2px;border-radius:2px;background:#55765e;transition:transform .24s cubic-bezier(.22,1,.36,1);pointer-events:none}
.countdown-switch-indicator.on-goal{transform:translateX(87px)}
.countdown-switch-option{position:relative;z-index:1;flex:1;min-width:0!important;min-height:28px!important;height:28px!important;margin:0!important;padding:0 7px 5px!important;border:0!important;border-radius:4px!important;background:transparent!important;color:#879181!important;font-size:12px!important;font-weight:400!important;line-height:1.4!important;box-shadow:none;display:flex;align-items:center;justify-content:center}
.countdown-switch-option.selected{color:#31563c!important;font-weight:600!important}
.countdown-switch-option::after{border:0}
@media(prefers-reduced-motion:reduce){.countdown-switch-indicator,.countdown-switch-option{transition:none!important}}
</style>