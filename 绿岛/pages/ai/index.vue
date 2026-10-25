<template>
  <view class="ai-page">
    <view class="head"><text class="back" @tap="back">‹</text><text class="title">问 AI</text><text class="close" @tap="close">×</text></view>
    <view v-if="!ready" class="setup-card">
      <view class="setup-mark">⌁</view>
      <text class="setup-title">完成两项资料，解锁 AI</text>
      <text class="setup-sub">资产报告必须完成；人格测试只需完成大五人格或 MBTI 任意一个。</text>
      <view class="requirement" :class="{ complete: financeReady }">
        <view class="requirement-copy"><text class="requirement-title">① FIRE 资产报告</text><text class="requirement-sub">{{ financeReady ? '已完成，可以继续使用' : '填写资产、每月存入和退休后消费' }}</text></view>
        <text class="requirement-state">{{ financeReady ? '✓ 已完成' : '未完成' }}</text>
      </view>
      <button v-if="!financeReady" class="setup-button" @tap="goCalculator">去填写资产报告</button>
      <view class="requirement choice-requirement" :class="{ complete: personalityReady }">
        <view class="requirement-copy"><text class="requirement-title">② 人格测试（二选一）</text><text class="requirement-sub">{{ personalityReady ? '已完成，大五人格或 MBTI 均可' : '完成其中一个即可解锁 AI' }}</text></view>
        <text class="requirement-state">{{ personalityReady ? '✓ 已完成' : '任选一个' }}</text>
      </view>
      <view v-if="!personalityReady" class="choice-buttons"><button class="setup-button secondary-setup" @tap="goPersonality('bigfive')">大五人格 · 50题</button><button class="setup-button secondary-setup" @tap="goPersonality('mbti')">MBTI · 100题</button></view>
      <view v-if="financeReady && personalityReady" class="unlock-note">两项资料已完成，正在解锁 AI…</view>
    </view>
    <view v-else class="chat-shell">
      <view class="chat-intro"><text class="kicker">行为建议 AI</text><text class="intro-sub">只讨论消费、记录和生活习惯，不提供金融服务或投资建议。</text><view v-if="!isMember" class="member-banner" @tap="goMembership"><text>{{ quotaText }}</text><text class="member-arrow">›</text></view></view>
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
import { state, persist } from '@/store/index.js'
import { hasValidFinance, freedomResult } from '@/utils/finance-plan.js'
import { askBehaviorAI } from '@/utils/api-service.js'
import { isMembershipActive } from '@/utils/membership.js'

export default {
  data() { return { state, ready: false, financeReady: false, personalityReady: false, question: '', messages: [], loading: false, lastMessageId: '', isMember: false, freeUsed: 0 } },
  onLoad() {
    this.isMember = isMembershipActive(state)
    this.refreshQuota()
    this.syncPrerequisites()
    if (this.ready) {
      this.messages = [{ role: 'assistant', text: '你好，我会根据你的 FIRE 倒计时，陪你一起观察消费和生活习惯。' }]
      this.sendCountdown()
    }
  },
  onShow() { this.syncPrerequisites(); if (this.ready && !this.messages.length) { this.messages = [{ role: 'assistant', text: '你好，我会根据你的 FIRE 倒计时和人格偏好，陪你一起观察消费和生活习惯。' }]; this.sendCountdown() } },
  methods: {
    syncPrerequisites() { this.financeReady = !!state.financeEntered && hasValidFinance(state); this.personalityReady = !!((state.personalityTests && (state.personalityTests.bigfive || state.personalityTests.mbti)) || (state.personality && state.personality.completed)); this.ready = this.financeReady && this.personalityReady },
    back() { uni.navigateBack() },
    close() { uni.switchTab({ url: '/pages/index/index' }) },
    todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') },
    refreshQuota() {
      if (this.isMember) return
      const key = this.todayKey()
      const saved = state.toolUsage && state.toolUsage.aiDaily
      this.freeUsed = saved && saved.date === key ? Number(saved.count) || 0 : 0
    },
    consumeQuota() {
      const key = this.todayKey()
      state.toolUsage = state.toolUsage || {}
      state.toolUsage.aiDaily = { date: key, count: this.freeUsed + 1 }
      this.freeUsed += 1
      persist()
    },
    goCalculator() { uni.navigateTo({ url: '/pages/calculator/index' }) },
    goPersonality(kind) { uni.navigateTo({ url: '/pages/personality/index?type=' + kind }) },
    goMembership() { uni.navigateTo({ url: '/pages/profile/membership?upgrade=1&feature=ai' }) },
    quotaText() { return this.freeUsed >= 3 ? '今日免费额度已用完，升级会员后可继续使用' : '免费用户今日剩余 ' + (3 - this.freeUsed) + ' 次，会员无限使用' },
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
      if (!this.isMember && this.freeUsed >= 3) {
        uni.showToast({ title: '今日免费额度已用完，请升级会员继续使用', icon: 'none', duration: 2600 })
        return
      }
      const question = this.question.trim()
      if (!question || this.loading) return
      this.question = ''
      if (!this.isMember) this.consumeQuota()
      this.messages.push({ role: 'user', text: question })
      this.scrollToLast()
      this.loading = true
      const startedAt = Date.now()
      try {
        const result = await askBehaviorAI({ question, finance: state.finance, countdown: this.countdownText(), personality: { bigFive: state.personalityTests && state.personalityTests.bigfive ? state.personalityTests.bigfive : null, mbti: state.personalityTests && state.personalityTests.mbti ? state.personalityTests.mbti : null } })
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
.ai-page{min-height:100vh;background:#eef5ef;box-sizing:border-box;padding-top:calc(58px + env(safe-area-inset-top))}.head{position:fixed;z-index:20;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#f7fbf6;border-bottom:1px solid #dce9dc;box-sizing:border-box}.back{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:30px;color:#173d35}.title{font-size:18px;font-weight:600;color:#173d35}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:#173d35;font-size:28px}.setup-card{margin:42px 20px;padding:28px 22px;border-radius:20px;background:#fff;text-align:center;box-shadow:0 8px 22px rgba(42,88,64,.08)}.setup-mark{width:62px;height:62px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dcecdf;color:#39705b;font-size:30px}.setup-title{display:block;color:#173d35;font-size:19px;font-weight:600;margin-top:17px}.setup-sub{display:block;color:#71807a;font-size:13px;line-height:1.8;margin-top:9px}.setup-button{height:46px;margin-top:22px;border:0;border-radius:12px;background:#173d35;color:#fff;font-size:14px}.chat-shell{height:calc(100vh - 58px - env(safe-area-inset-top));display:flex;flex-direction:column}.chat-intro{padding:17px 18px 9px}.kicker{display:block;color:#39705b;font-size:12px;font-weight:600;letter-spacing:.12em}.intro-sub{display:block;color:#71807a;font-size:11px;line-height:1.6;margin-top:4px}.messages{flex:1;padding:6px 14px 16px;box-sizing:border-box}.message-row{display:flex;margin:9px 0}.message-row.assistant{justify-content:flex-start}.message-row.user{justify-content:flex-end}.message-bubble{max-width:78%;padding:10px 13px;border-radius:16px;color:#243830;font-size:14px;line-height:1.65;box-shadow:0 2px 5px rgba(42,88,64,.06)}.assistant .message-bubble{background:#fff;border-top-left-radius:5px}.user .message-bubble{background:#cce6cc;border-top-right-radius:5px}.typing{color:#71807a}.member-banner{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;padding:10px 12px;border-radius:12px;background:#e3f0df;color:#315f4a;font-size:12px}.member-arrow{font-size:18px}.composer{padding:8px 12px calc(10px + env(safe-area-inset-bottom));background:#f7fbf6;border-top:1px solid #dce9dc}.countdown-button{height:32px;padding:0 12px;margin:0 auto 7px;border:1px solid #b9d4bc;border-radius:16px;background:#fff;color:#39705b;font-size:12px}.input-row{display:flex;gap:8px;align-items:center}.question{flex:1;height:42px;padding:0 13px;border-radius:21px;background:#fff;color:#243830;font-size:14px;border:1px solid #dce9dc}.placeholder{color:#a2afa5}.send{height:42px;padding:0 16px;border:0;border-radius:21px;background:#173d35;color:#fff;font-size:13px}.send[disabled]{opacity:.6}

.requirement{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding:14px;border-radius:14px;background:#f3f7f1;border:1px solid #dfe9df;text-align:left}.requirement.complete{background:#e6f3e5;border-color:#8fbd96}.requirement-copy{flex:1;min-width:0}.requirement-title{display:block;color:#173d35;font-size:14px;font-weight:700}.requirement-sub{display:block;margin-top:5px;color:#71807a;font-size:11px;line-height:1.5}.requirement-state{color:#a35d4e;font-size:11px;font-weight:600;white-space:nowrap}.requirement.complete .requirement-state{color:#39705b}.choice-requirement{margin-top:12px}.choice-buttons{display:flex;gap:8px;margin-top:10px}.choice-buttons .setup-button{flex:1;margin-top:0;padding:0 8px;font-size:12px}.secondary-setup{margin-top:10px;background:#39705b}.unlock-note{margin-top:18px;padding:10px;border-radius:10px;background:#e6f3e5;color:#39705b;font-size:12px}
</style>
