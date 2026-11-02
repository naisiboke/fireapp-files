<template><view class="register-page fire-page-register-register" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" /><text class="back" @tap="back">‹</text><text class="title">注册Fire生活账号</text><text class="sub">目前仅支持邮箱验证码注册和登录。返回登录页，输入邮箱并获取验证码即可。</text><view class="button" @tap="back">返回登录</view></view></template>
<script setup>
import { pageLayoutStyle } from '@/utils/page-layout.js'
import AppFeedback from '@/components/AppFeedback.vue'
import { useFeedbackPage } from '@/utils/feedback-page.js'
const feedbackOwnerId = useFeedbackPage()
function back(){uni.navigateBack()}
</script>
<style lang="scss">.register-page{min-height:100vh;background:#f5f7f2;padding:calc(28px + var(--fire-status-top, env(safe-area-inset-top))) 24px;box-sizing:border-box;color:#173d35;display:flex;flex-direction:column;align-items:center}.back{align-self:flex-start;min-width:44px;min-height:44px;font-size:32px;line-height:40px}.title{margin-top:50px;font-size:26px;font-weight:700}.sub{margin-top:14px;color:#6b7c70;font-size:14px}.button{margin-top:40px;min-height:48px;width:100%;max-width:360px;border-radius:12px;background:#173d35;color:#fff;display:flex;align-items:center;justify-content:center}
/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-register-register{padding-top:var(--fire-page-top)}
</style>