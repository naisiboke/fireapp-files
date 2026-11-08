
<template>
 <view class="fire-loading-spinner" :class="{'fire-loading-light':light}" :style="{width:size+'px',height:size+'px'}" role="status" :aria-label="label"><view class="fire-loading-ring" aria-hidden="true"></view></view>
</template>
<script>
export default{name:'LoadingSpinner',props:{size:{type:Number,default:20},light:Boolean,label:{type:String,default:'加载中'}}}
</script>
<style>
.fire-loading-spinner{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;vertical-align:middle;color:#7a907d;line-height:0}
.fire-loading-spinner.fire-loading-light{color:#fff}
.fire-loading-ring{display:block;width:100%;height:100%;box-sizing:border-box;border:2px solid transparent;border-top-color:currentColor;border-left-color:currentColor;border-bottom-color:currentColor;border-radius:50%;animation:fireLoadingTurn .85s linear infinite;will-change:transform}
@keyframes fireLoadingTurn{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.fire-loading-ring{animation:none;will-change:auto}}
</style>
