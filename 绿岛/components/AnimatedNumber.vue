<template>
  <text class="animated-number" :class="{ 'number-fading': fading }">{{ displayed }}</text>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({ value: { type: [String, Number], default: '' } })
const displayed = ref(props.value)
const fading = ref(false)
let changeTimer = null
function cancelChange() {
  if (changeTimer !== null) clearTimeout(changeTimer)
  changeTimer = null
}
watch(() => props.value, value => {
  cancelChange()
  if (value === displayed.value) { fading.value = false; return }
  // #ifdef H5
  if (typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    displayed.value = value
    fading.value = false
    return
  }
  // #endif
  fading.value = true
  // 旧数字淡出120ms，再更新数字并淡入120ms；相同数字不触发动画。
  changeTimer = setTimeout(() => {
    displayed.value = value
    fading.value = false
    changeTimer = null
  }, 120)
})
onBeforeUnmount(cancelChange)
</script>

<style scoped>
.animated-number {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  opacity: 1;
  transition: opacity 120ms ease;
}
.number-fading { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .animated-number { transition: none; }
}
</style>
