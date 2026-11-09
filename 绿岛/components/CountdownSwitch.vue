
<template>
 <view class="countdown-switch" role="group" aria-label="倒计时类型">
  <view class="countdown-switch-indicator" :class="{'on-goal':activeGoal}" aria-hidden="true"></view>
  <button class="countdown-switch-option" :class="{selected:!activeGoal}" :aria-pressed="!activeGoal" @mousedown.prevent @tap.stop="$emit('change','fire')" @keydown.right.prevent="$emit('change','goal')"><text>自由日</text></button>
  <button class="countdown-switch-option" :class="{selected:activeGoal}" :aria-pressed="activeGoal" @mousedown.prevent @tap.stop="$emit('change','goal')" @keydown.left.prevent="$emit('change','fire')"><text>我的目标</text></button>
 </view>
</template>
<script>
export default{name:'CountdownSwitch',props:{activeGoal:Boolean},emits:['change']}
</script>
<style>
.countdown-switch{position:relative;z-index:4;display:flex;width:180px;height:32px;max-width:100%;padding:0;box-sizing:border-box;background:transparent;margin:12px 0 18px;border:0;box-shadow:none}
.countdown-switch-indicator{position:absolute;left:calc(25% - 18px);bottom:0;width:36px;height:1.5px;border-radius:1px;background:#7d9181;transition:left .24s cubic-bezier(.22,1,.36,1);pointer-events:none}
.countdown-switch-indicator.on-goal{left:calc(75% - 18px)}
.countdown-switch-option{position:relative;flex:1;min-width:0!important;min-height:32px!important;height:32px!important;margin:0!important;padding:0 8px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#718072!important;font-size:13px!important;font-weight:400!important;line-height:1.4!important;box-shadow:none;display:flex;align-items:center;justify-content:center;transition:color .2s ease!important}
.countdown-switch-option.selected{color:#2c4938!important;font-weight:600!important}
.countdown-switch-option::after{border:0}
@media(prefers-reduced-motion:reduce){.countdown-switch-indicator,.countdown-switch-option{transition:none!important}}
</style>
