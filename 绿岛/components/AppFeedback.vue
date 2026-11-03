<template>
  <view class="fire-feedback-host">
    <WishlistReminder :owner-id="ownerId" />
    <FireOverlay :visible="!!dialog" :owner-id="ownerId" :dismissible="false" elevated :label="dialog ? dialog.title : '提示'">
      <view v-if="dialog" class="fire-dialog">
        <view class="fire-dialog-head">
          <text class="fire-dialog-title">{{ dialog.title }}</text>
          <button class="fire-dialog-close" aria-label="关闭" @tap="closeDialog(false)"><view class="fire-close-mark"></view></button>
        </view>
        <text v-if="dialog.content" class="fire-dialog-content" selectable>{{ dialog.content }}</text>
        <view class="fire-dialog-actions">
          <button v-if="dialog.showCancel" class="fire-dialog-button fire-dialog-secondary" @tap="closeDialog(false)">{{ dialog.cancelText }}</button>
          <button class="fire-dialog-button fire-dialog-primary" :class="{ 'fire-dialog-danger': dialog.danger }" @tap="closeDialog(true)">{{ dialog.confirmText }}</button>
        </view>
      </view>
    </FireOverlay>
    <view v-if="notice" class="fire-notice" role="status" aria-live="polite">
      <text v-if="notice.success" class="fire-notice-check">✓</text>
      <text class="fire-notice-text">{{ notice.title }}</text>
    </view>
  </view>
</template>

<script>
import WishlistReminder from './WishlistReminder.vue'
import FireOverlay from './FireOverlay.vue'
import { feedbackState, closeDialog } from '@/utils/feedback.js'
export default {
  components: { FireOverlay, WishlistReminder },
  props: { ownerId: Number },
  computed: {
    dialog() { return feedbackState.owner === this.ownerId ? feedbackState.dialog : null },
    notice() { return feedbackState.owner === this.ownerId ? feedbackState.notice : null },
  },
  methods: { closeDialog },
}
</script>

<style>
.fire-feedback-host{position:fixed;top:0;left:0;width:0;height:0;z-index:400000;overflow:visible}
.fire-dialog{padding:20px;box-sizing:border-box;background:#fff;color:#243830}
.fire-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.fire-dialog-title{flex:1;min-width:0;font-size:18px;line-height:1.5;font-weight:600;color:#173d35;overflow-wrap:anywhere}
.fire-dialog-close{width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important;padding:0!important;margin:0!important;display:flex;align-items:center;justify-content:center;border:0!important;border-radius:50%!important;background:#f2f5f0!important;box-shadow:none!important;flex-shrink:0}
.fire-dialog-close::after{border:0!important}
.fire-close-mark{position:relative;display:block;width:16px;height:16px}
.fire-close-mark::before,.fire-close-mark::after{content:'';position:absolute;top:7px;left:0;width:16px;height:2px;border-radius:1px;background:#52635b;transform:rotate(45deg)}
.fire-close-mark::after{transform:rotate(-45deg)}
.fire-dialog-content{display:block;font-size:14px;line-height:1.75;color:#718078;white-space:pre-wrap;overflow-wrap:anywhere;max-height:45vh;overflow-y:auto}
.fire-dialog-actions{display:flex;gap:10px;margin-top:24px}
.fire-dialog-button{flex:1;min-width:0!important;min-height:44px!important;height:auto!important;padding:12px!important;margin:0!important;border:0!important;border-radius:12px!important;display:flex;align-items:center;justify-content:center;font-size:14px!important;line-height:1.4!important;box-shadow:none!important}
.fire-dialog-primary{background:#173d35!important;color:#fff!important}
.fire-dialog-secondary{background:#f0f3ee!important;color:#52635b!important}
.fire-dialog-danger{background:#a35d4e!important;color:#fff!important}
.fire-notice{position:fixed;z-index:500000;top:calc(76px + var(--fire-status-top, env(safe-area-inset-top)));left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 40px);display:flex;align-items:center;gap:8px;padding:12px 16px;box-sizing:border-box;border:1px solid #e3e9e1;border-radius:12px;background:#fff;box-shadow:0 8px 28px rgba(20,35,29,.12);pointer-events:none}
.fire-notice-check{font-size:16px;color:#315f4a;flex-shrink:0}
.fire-notice-text{font-size:13px;line-height:1.6;color:#243830;overflow-wrap:anywhere}
</style>
