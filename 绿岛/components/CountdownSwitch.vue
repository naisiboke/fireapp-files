
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
.countdown-switch{position:relative;z-index:4;display:flex;width:100%;height:36px;padding:3px;box-sizing:border-box;isolation:isolate;border:1px solid #e5eae1;border-radius:13px;background:#f6f8f4;margin:0 0 14px;box-shadow:none}
.countdown-switch-indicator{position:absolute;left:3px;top:3px;bottom:3px;width:calc((100% - 6px) / 2);border-radius:10px;background:#e0e9dc;transition:transform .24s cubic-bezier(.22,1,.36,1);pointer-events:none}
.countdown-switch-indicator.on-goal{transform:translateX(100%)}
.countdown-switch-option{position:relative;z-index:1;flex:1;min-width:0!important;min-height:28px!important;height:28px!important;margin:0!important;padding:0 8px!important;border:0!important;border-radius:10px!important;background:transparent!important;color:#879181!important;font-size:13px!important;font-weight:400!important;line-height:1.4!important;box-shadow:none;display:flex;align-items:center;justify-content:center;transition:color .2s ease!important}
.countdown-switch-option.selected{color:#31563c!important;font-weight:600!important}
.countdown-switch-option::after{border:0}
@media(prefers-reduced-motion:reduce){.countdown-switch-indicator,.countdown-switch-option{transition:none!important}}
</style>
