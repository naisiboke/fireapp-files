<template>
  <view v-if="visible" class="fire-overlay" :class="{ 'fire-overlay-feedback': elevated }" :style="viewportStyle" @tap="backdropTap" @touchmove.stop.prevent>
    <view class="fire-overlay-panel" :class="{ 'fire-overlay-wide': wide }" role="dialog" aria-modal="true" :aria-label="label" @tap.stop @touchmove.stop>
      <slot />
    </view>
  </view>
</template>

<script>
import { registerFeedbackOverlay } from '@/utils/feedback.js'
export default {
  props: {
    visible: Boolean,
    ownerId: Number,
    label: { type: String, default: '提示' },
    dismissible: { type: Boolean, default: true },
    wide: Boolean,
    elevated: Boolean,
  },
  emits: ['close'],
  data() { return { keyboardHeight: 0, viewportHeight: 0, viewportTop: 0 } },
  computed: {
    viewportStyle() {
      const availableHeight = this.viewportHeight ? this.viewportHeight + 'px' : '100vh - ' + this.keyboardHeight + 'px'
      const panelHeight = 'calc(' + availableHeight + ' - 40px - env(safe-area-inset-top) - env(safe-area-inset-bottom))'
      if (this.viewportHeight) return { top: this.viewportTop + 'px', height: this.viewportHeight + 'px', bottom: 'auto', '--fire-panel-height': panelHeight }
      return { bottom: this.keyboardHeight + 'px', '--fire-panel-height': panelHeight }
    },
  },
  watch: { visible() { this.syncRegistration() } },
  mounted() {
    this.syncRegistration()
    this.keyboardListener = event => { this.keyboardHeight = Math.max(0, Number(event.height) || 0) }
    // #ifndef H5
    if (uni.onKeyboardHeightChange) uni.onKeyboardHeightChange(this.keyboardListener)
    // #endif
    // #ifdef H5
    if (typeof window !== 'undefined' && window.visualViewport) {
      this.viewportListener = () => {
        this.viewportHeight = window.visualViewport.height
        this.viewportTop = window.visualViewport.offsetTop
      }
      window.visualViewport.addEventListener('resize', this.viewportListener)
      window.visualViewport.addEventListener('scroll', this.viewportListener)
      this.viewportListener()
    }
    // #endif
  },
  beforeUnmount() {
    if (this.unregisterOverlay) this.unregisterOverlay()
    // #ifndef H5
    if (uni.offKeyboardHeightChange) uni.offKeyboardHeightChange(this.keyboardListener)
    // #endif
    // #ifdef H5
    if (typeof window !== 'undefined' && window.visualViewport && this.viewportListener) {
      window.visualViewport.removeEventListener('resize', this.viewportListener)
      window.visualViewport.removeEventListener('scroll', this.viewportListener)
    }
    // #endif
  },
  methods: {
    backdropTap() { if (this.dismissible) this.$emit('close') },
    syncRegistration() {
      if (this.unregisterOverlay) this.unregisterOverlay()
      this.unregisterOverlay = null
      if (this.visible) this.unregisterOverlay = registerFeedbackOverlay(this.ownerId, () => this.$emit('close'), this.dismissible)
    },
  },
}
</script>

<style>
.fire-overlay{position:fixed!important;inset:0;z-index:200000;display:flex;align-items:center;justify-content:center;padding:20px 16px;padding-top:calc(20px + env(safe-area-inset-top));padding-bottom:calc(20px + env(safe-area-inset-bottom));box-sizing:border-box;background:rgba(20,35,29,.38);color:#243830;animation:fireOverlayIn .16s ease-out;overflow:hidden}
.fire-overlay-feedback{z-index:400000}
.fire-overlay-panel{width:100%;max-width:360px;max-height:var(--fire-panel-height,100%);min-height:0;overflow-y:auto;overscroll-behavior:contain;background:#fff;border:1px solid #e3e9e1;border-radius:20px;box-shadow:0 16px 48px rgba(20,35,29,.16);box-sizing:border-box;animation:firePanelIn .18s ease-out}
.fire-overlay-wide{max-width:560px}
@keyframes fireOverlayIn{from{opacity:0}to{opacity:1}}
@keyframes firePanelIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.fire-overlay,.fire-overlay-panel{animation:none}}
</style>
