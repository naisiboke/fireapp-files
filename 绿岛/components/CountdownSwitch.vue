
<template>
 <view class="countdown-switch" role="group" aria-label="倒计时类型">
  <view class="countdown-switch-indicator" :class="{'on-goal':activeGoal}" aria-hidden="true"></view>
  <button class="countdown-switch-option" :class="{selected:!activeGoal}" :aria-pressed="!activeGoal" @mousedown.prevent @tap.stop="$emit('change','fire')" @keydown.right.prevent="$emit('change','goal')"><view class="countdown-switch-mark" aria-hidden="true"></view><text>自由日</text></button>
  <button class="countdown-switch-option" :class="{selected:activeGoal}" :aria-pressed="activeGoal" @mousedown.prevent @tap.stop="$emit('change','goal')" @keydown.left.prevent="$emit('change','fire')"><view class="countdown-switch-mark" aria-hidden="true"></view><text>我的目标</text></button>
 </view>
</template>
<script>
export default{name:'CountdownSwitch',props:{activeGoal:Boolean},emits:['change']}
</script>
<style>
.countdown-switch{position:relative;z-index:4;display:flex;width:248px;max-width:100%;padding:4px;box-sizing:border-box;isolation:isolate;border:1px solid #c4d0c0;border-radius:15px;background:#f1f4eb;margin:14px 0 18px;box-shadow:0 2px 9px rgba(30,59,41,.05)}
.countdown-switch-indicator{position:absolute;left:4px;top:4px;bottom:4px;width:calc((100% - 8px) / 2);border-radius:11px;background:#294f40;box-shadow:0 2px 6px rgba(33,65,45,.16);transition:transform .26s cubic-bezier(.22,1,.36,1);pointer-events:none}
.countdown-switch-indicator.on-goal{transform:translateX(100%)}
.countdown-switch-option{position:relative;z-index:1;flex:1;min-width:0!important;min-height:40px!important;height:auto!important;margin:0!important;padding:8px 10px!important;border:0!important;border-radius:11px!important;background:transparent!important;color:#586e58!important;font-size:14px!important;font-weight:500!important;line-height:1.4!important;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;transition:color .18s ease!important}
.countdown-switch-option.selected{color:#fff!important;font-weight:650!important}
.countdown-switch-mark{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:0;flex-shrink:0}.countdown-switch-option.selected .countdown-switch-mark{opacity:1}
@media(prefers-reduced-motion:reduce){.countdown-switch-indicator,.countdown-switch-option{transition:none!important}}
</style>
