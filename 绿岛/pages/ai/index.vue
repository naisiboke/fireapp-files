<template>
  <view class="ai-page">
    <view class="head"><text class="title">问 AI</text><text class="close" @tap="close">×</text></view>
    <view v-if="!ready" class="setup-card">
      <view class="setup-mark">⌁</view>
      <text class="setup-title">先完成你的 FIRE 倒计时</text>
      <text class="setup-sub">AI 会根据你的自由日提供行为建议。先填写倒计时，才能开始对话。</text>
      <button class="setup-button" @tap="goCalculator">去填写倒计时</button>
    </view>
    <view v-else class="chat-shell">
      <view class="chat-intro"><text class="kicker">行为建议 AI</text><text class="intro-sub">只讨论消费、记录和生活习惯，不提供金融服务或投资建议。</text><view v-if="!isMember" class="member-banner" @tap="goMembership"><text>开通 Fire生活通用会员，AI 无限使用</text><text class="member-arrow">›</text></view></view>
      <scroll-view class="messages" scroll-y :scroll-into-view="lastMessageId">
        <view v-for="(message, index) in messages" :id="'message-' + index" :key="index" class="message-row" :class="message.role"><view class="message-bubble">{{ message.text }}</view></view>
        <view v-if="loading" class="message-row assistant"><view class="message-bubble typing">正在整理建议…</view></view>
      </scroll-view>
      <view class="composer">
        <button class="countdown-button" @tap="sendCountdown">发送我的倒计时</button>
        <view class="input-row"><input v-model="question" class="question" confirm-type="send" placeholder="输入你想聊的习惯" placeholder-class="placeholder" @confirm="send" /><button class="send" :disabled="loading" @tap="send">发送</button></view>
      </view>
    </view>
  </view>
</template>

<script>
import { state } from '@/store/index.js'
import { hasValidFinance, freedomResult } from '@/utils/finance-plan.js'
import { askBehaviorAI } from '@/utils/api-service.js'
import { isMembershipActive } from '@/utils/membership.js'

export default {
  data() { return { state, ready: false, question: '', messages: [], loading: false, lastMessageId: '', isMember: false } },
  onLoad() {
    this.isMember = isMembershipActive(state)
    this.ready = !!state.financeEntered && hasValidFinance(state)
    if (this.ready) {
      this.messages = [{ role: 'assistant', text: '你好，我会根据你的 FIRE 倒计时，陪你一起观察消费和生活习惯。' }]
      this.sendCountdown()
    }
  },
  methods: {
    close() { uni.navigateBack() },
    goCalculator() { uni.navigateTo({ url: '/pages/calculator/index' }) },
    goMembership() { uni.navigateTo({ url: '/pages/profile/membership?upgrade=1&feature=ai' }) },
    countdownText() {
      const result = freedomResult(state)
      if (!result.date) return '我的 FIRE 倒计时：暂未计算出目标日期'
      const d = new Date(result.date); return '我的 FIRE 倒计时：预计 ' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日达到目标，目前约 ' + (result.months || 0) + ' 个月'
    },
    sendCountdown() {
      if (!this.ready) return this.goCalculator()
      const text = this.countdownText()
      if (this.messages.some(item => item.role === 'user' && item.text === text)) return
      this.messages.push({ role: 'user', text })
      this.scrollToLast()
    },
    scrollToLast() { this.$nextTick(() => { this.lastMessageId = 'message-' + (this.messages.length - 1) }) },
    formatAnswer(value) {
      const lineBreak = String.fromCharCode(10)
      let text = String(value || '').replace(/\*\*/g, '').replace(/__/g, '').trim()
      text = text.replace(/[0-9]+[.)、][ \t]*/g, lineBreak)
      text = text.split('•').join('')
      const sentences = text
        .split(/[。！？]/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 6)
      text = sentences.join('。')
      if (text && !/[。！？]$/.test(text)) text += '。'
      return text.length > 420 ? text.slice(0, 420) + '…' : text
    },

    async send() {
      if (!this.isMember) { this.goMembership(); return }
      const question = this.question.trim()
      if (!question || this.loading) return
      this.question = ''
      this.messages.push({ role: 'user', text: question })
      this.scrollToLast()
      this.loading = true
      const startedAt = Date.now()
      try {
        const result = await askBehaviorAI({ question, countdown: this.countdownText() })
        const answer = result && (result.reply || result.message || result.content)
        if (!answer) throw new Error('AI 暂时没有返回建议')
        const elapsed = Date.now() - startedAt
        if (elapsed < 1200) await new Promise(resolve => setTimeout(resolve, 1200 - elapsed))
        this.messages.push({ role: 'assistant', text: this.formatAnswer(String(answer)) })
      } catch (error) {
        this.messages.push({ role: 'assistant', text: error.message || 'AI 暂时无法回答，请稍后再试' })
      } finally { this.loading = false; this.scrollToLast() }
    },
  },
}
</script>

<style>
.ai-page{min-height:100vh;background:#eef5ef;box-sizing:border-box;padding-top:calc(58px + env(safe-area-inset-top))}.head{position:fixed;z-index:20;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#f7fbf6;border-bottom:1px solid #dce9dc;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#173d35}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:#173d35;font-size:28px}.setup-card{margin:42px 20px;padding:28px 22px;border-radius:20px;background:#fff;text-align:center;box-shadow:0 8px 22px rgba(42,88,64,.08)}.setup-mark{width:62px;height:62px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dcecdf;color:#39705b;font-size:30px}.setup-title{display:block;color:#173d35;font-size:19px;font-weight:600;margin-top:17px}.setup-sub{display:block;color:#71807a;font-size:13px;line-height:1.8;margin-top:9px}.setup-button{height:46px;margin-top:22px;border:0;border-radius:12px;background:#173d35;color:#fff;font-size:14px}.chat-shell{height:calc(100vh - 58px - env(safe-area-inset-top));display:flex;flex-direction:column}.chat-intro{padding:17px 18px 9px}.kicker{display:block;color:#39705b;font-size:12px;font-weight:600;letter-spacing:.12em}.intro-sub{display:block;color:#71807a;font-size:11px;line-height:1.6;margin-top:4px}.messages{flex:1;padding:6px 14px 16px;box-sizing:border-box}.message-row{display:flex;margin:9px 0}.message-row.assistant{justify-content:flex-start}.message-row.user{justify-content:flex-end}.message-bubble{max-width:78%;padding:10px 13px;border-radius:16px;color:#243830;font-size:14px;line-height:1.65;box-shadow:0 2px 5px rgba(42,88,64,.06)}.assistant .message-bubble{background:#fff;border-top-left-radius:5px}.user .message-bubble{background:#cce6cc;border-top-right-radius:5px}.typing{color:#71807a}.member-banner{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;padding:10px 12px;border-radius:12px;background:#e3f0df;color:#315f4a;font-size:12px}.member-arrow{font-size:18px}.composer{padding:8px 12px calc(10px + env(safe-area-inset-bottom));background:#f7fbf6;border-top:1px solid #dce9dc}.countdown-button{height:32px;padding:0 12px;margin:0 auto 7px;border:1px solid #b9d4bc;border-radius:16px;background:#fff;color:#39705b;font-size:12px}.input-row{display:flex;gap:8px;align-items:center}.question{flex:1;height:42px;padding:0 13px;border-radius:21px;background:#fff;color:#243830;font-size:14px;border:1px solid #dce9dc}.placeholder{color:#a2afa5}.send{height:42px;padding:0 16px;border:0;border-radius:21px;background:#173d35;color:#fff;font-size:13px}.send[disabled]{opacity:.6}
</style>
