<template>
  <view class="ai-page fire-page-ai-index" :style="[pageLayoutStyle, pageStyle]" :class="{'keyboard-open':keyboardHeight>0 || inputFocused}">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="head"><text class="back" @tap="back">‹</text><text class="title">问 AI</text><text class="close" @tap="close">×</text></view>
    <FireOverlay :visible="drawerOpen" :owner-id="feedbackOwnerId" label="历史聊天" wide @close="drawerOpen=false"><view class="chat-drawer"><view class="drawer-head"><text>历史聊天</text><button class="fire-modal-close" aria-label="关闭" @tap="drawerOpen=false"><view class="fire-close-mark"></view></button></view><view class="new-drawer" @tap="newChat">＋ 新建聊天</view><scroll-view scroll-y class="chat-list"><view v-for="chat in chats" :key="chat.id" class="chat-item" :class="{active:chat.id===currentChatId}" @tap="selectChat(chat.id)"><text>{{ chat.title || '新对话' }}</text><text>{{ formatChatDate(chat.updatedAt) }}</text></view><text v-if="!chats.length" class="chat-empty">还没有历史聊天</text></scroll-view></view></FireOverlay>
    <view v-if="!ready" class="setup-card">
      <view class="setup-mark">⌁</view>
      <text class="setup-title">让 AI 更了解你</text>
      <text class="setup-sub">完成财务资料和一项性格测试，即可开始对话。</text>
      <view class="requirement" :class="{ complete: financeReady }">
        <view class="requirement-copy"><text class="requirement-title">① FIRE 资产报告</text><text class="requirement-sub">{{ financeReady ? '已完成，可以继续使用' : '填写资产、每月存入和退休后消费' }}</text></view>
        <text class="requirement-state">{{ financeReady ? '✓ 已完成' : '未完成' }}</text>
      </view>
      <button v-if="!financeReady" class="setup-button" @tap="goCalculator">补充资产报告</button>
      <view class="requirement choice-requirement" :class="{ complete: personalityReady }">
        <view class="requirement-copy"><text class="requirement-title">② 人格测试（二选一）</text><text class="requirement-sub">{{ personalityReady ? '已完成，大五人格或 MBTI 均可' : '完成其中一个即可解锁 AI' }}</text></view>
        <text class="requirement-state">{{ personalityReady ? '✓ 已完成' : '任选一个' }}</text>
      </view>
      <view v-if="!personalityReady" class="choice-buttons"><button class="setup-button secondary-setup" @tap="goPersonality('bigfive')">了解自己 · 大五人格 50题</button><button class="setup-button secondary-setup" @tap="goPersonality('mbti')">了解自己 · MBTI 100题</button></view>

      <view v-if="financeReady && personalityReady" class="unlock-note">资料已完成，正在进入对话…</view>
    </view>
    <view v-else class="chat-shell">
      <view class="chat-meta">
        <button class="meta-link" @tap="goPersonality('')">我的性格 ›</button>
        <text class="meta-note">单次回复 ≤500 字</text>
        <button class="meta-link quota-link" @tap="goMembership">{{ quotaText() }} ›</button>
        <button class="meta-link" @tap="drawerOpen=true">历史</button>
      </view>
      <scroll-view class="messages" scroll-y :show-scrollbar="false" :scroll-into-view="lastMessageId">
        <view class="message-list">
        <view v-for="(message, index) in messages" :id="'message-' + index" :key="index" class="message-row" :class="message.role"><view class="message-bubble">{{ message.text }}</view></view>
        <view v-if="loading" class="message-row assistant"><view class="message-bubble typing">正在整理建议…</view></view>
          <view id="chat-bottom" class="scroll-anchor"></view>
        </view>
      </scroll-view>
      <view class="composer">
        <view class="input-row">
          <button class="profile-button" aria-label="结合我的情况给建议" :disabled="loading" @tap="sendProfile">建议</button>
          <input v-model="question" maxlength="2000" class="question" confirm-type="send" :adjust-position="false" placeholder="聊聊你的想法…" placeholder-class="placeholder" @focus="focusComposer" @blur="inputFocused=false" @confirm="send" />
          <button class="send" :disabled="loading" @tap="send">发送</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { limitAIAnswer } from '@/utils/ai-answer.js'
import { accountId } from '@/utils/account-cache.js'
import AppFeedback from '@/components/AppFeedback.vue'
import FireOverlay from '@/components/FireOverlay.vue'
import { feedbackPageMixin } from '@/utils/feedback-page.js'
import { showNotice, dismissFeedback } from '@/utils/feedback.js'
import { state, persist, refreshMembershipFromServer } from '@/store/index.js'
import { hasValidFinance, freedomResult } from '@/utils/finance-plan.js'
import { askBehaviorAI } from '@/utils/api-service.js'
import { isMembershipActive } from '@/utils/membership.js'
import { loadAIChats, saveAIChats } from '@/utils/ai-chat-store.js'

export default {
  components: { AppFeedback, FireOverlay },
  mixins: [feedbackPageMixin],
  onBackPress() { return dismissFeedback(this.feedbackOwnerId) },
  data() { return { state, accountUid:accountId(), ready: false, financeReady: false, personalityReady: false, question: '', messages: [], loading: false, lastMessageId: '', isMember: false, freeUsed: 0, chats: [], currentChatId: '', drawerOpen: false, viewportHeight: 0, baseWindowHeight: 0, keyboardHeight: 0, inputFocused: false, keyboardListener: null } },
  computed: { pageStyle() { return this.viewportHeight>0?{height:this.viewportHeight+'px'}:{} } },
  async onLoad() {
    this.setupViewport()
    this.isMember = isMembershipActive(state)
    this.refreshQuota()
    this.syncPrerequisites()
    this.chats = await loadAIChats(state.aiChats || [])
    if (this.chats.length) this.selectChat(this.chats[0].id)
    else this.newChat()
  },
  onShow() { this.syncPrerequisites(); this.refreshMembershipStatus() },
  onResize(event) { this.resizeViewport(Number(event?.size?.windowHeight)||0) },
  onUnload() { if(this.keyboardListener&&typeof uni.offKeyboardHeightChange==='function')uni.offKeyboardHeightChange(this.keyboardListener) },
  methods: {
    windowHeight() {
      try { const info=typeof uni.getWindowInfo==='function'?uni.getWindowInfo():uni.getSystemInfoSync();return Number(info.windowHeight)||0 } catch(error){return 0}
    },
    setupViewport() {
      this.baseWindowHeight=this.windowHeight()
      this.viewportHeight=this.baseWindowHeight
      if(typeof uni.onKeyboardHeightChange==='function'){
        this.keyboardListener=event=>{
          this.keyboardHeight=Math.max(0,Number(event.height)||0)
          const current=this.windowHeight()||this.baseWindowHeight
          this.viewportHeight=this.keyboardHeight?Math.max(0,Math.min(current,this.baseWindowHeight-this.keyboardHeight)):this.baseWindowHeight
          this.scrollToLast()
        }
        uni.onKeyboardHeightChange(this.keyboardListener)
      }
    },
    focusComposer() { if(!this.keyboardHeight)this.baseWindowHeight=this.windowHeight()||this.viewportHeight;this.inputFocused=true },
    resizeViewport(height) {
      if(height<=0)return
      if(!this.keyboardHeight&&!this.inputFocused)this.baseWindowHeight=height
      this.viewportHeight=this.keyboardHeight?Math.max(0,Math.min(height,this.baseWindowHeight-this.keyboardHeight)):height
      this.scrollToLast()
    },
    async refreshMembershipStatus() {
      this.isMember=isMembershipActive(state);this.refreshQuota()
      try { await refreshMembershipFromServer();this.isMember=isMembershipActive(state);this.refreshQuota() }
      catch(error){console.warn('[membership-refresh]',error.code||'')}
    },
    syncPrerequisites() { const f=state.finance||{}; const countdown=freedomResult(state); this.financeReady = !!state.financeEntered && hasValidFinance(state) && !!countdown.date; this.personalityReady = !!((state.personalityTests && (state.personalityTests.bigfive || state.personalityTests.mbti)) || (state.personality && state.personality.completed)); this.ready = this.financeReady && this.personalityReady },
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
    goLedger() { uni.navigateTo({ url: '/pages/ledger/index' }) },
    goPersonality(kind) { uni.navigateTo({ url: '/pages/personality/index?type=' + encodeURIComponent(kind || ''), fail: () => showNotice({ title: '人格测试页面暂未部署，请重新构建 APP', icon: 'none' }) }) },
    goMembership() { uni.navigateTo({ url: '/pages/profile/membership?upgrade=1&feature=ai' }) },
    quotaText() { return this.isMember?'VIP 已开通':this.freeUsed>=3?'升级会员':'免费 '+Math.max(0,3-this.freeUsed)+' 次' },
    formatChatDate(value) { if (!value) return ''; const d=new Date(value); return (d.getMonth()+1)+'/'+d.getDate() },
    newChat() { this.drawerOpen=false; this.currentChatId='chat-'+Date.now()+'-'+Math.random().toString(36).slice(2,7); this.messages=[]; this.question=''; this.lastMessageId='' },
    selectChat(id) { const chat=this.chats.find(x=>x.id===id); if(!chat)return; this.currentChatId=chat.id; this.messages=Array.isArray(chat.messages)?chat.messages.map(x=>({...x,text:x.role==='assistant'?limitAIAnswer(x.text):x.text})):[]; this.drawerOpen=false; this.scrollToLast() },
    async saveCurrentChat() { if(this.accountUid!==accountId()||!this.messages.length)return; const first=this.messages.find(x=>x.role==='user'); const existing=this.chats.find(x=>x.id===this.currentChatId); const chat={id:this.currentChatId||('chat-'+Date.now()),title:existing&&existing.title||((first&&first.text)||'新对话').slice(0,28),messages:this.messages.map(x=>({...x})),updatedAt:Date.now()}; this.chats=[chat,...this.chats.filter(x=>x.id!==chat.id)]; this.currentChatId=chat.id; state.aiChats=this.chats; persist(); try{await saveAIChats(this.chats)}catch(error){console.warn('[chat-sync]',error.code||'CLOUD_CALL_FAILED')} },
    personalitySummary() { const p=state.personalityTests||{}, names=[]; if(p.bigfive) names.push('大五人格已完成'); if(p.mbti) names.push('MBTI '+String(p.mbti.title||'已完成').replace('你的 MBTI 参考类型：','')); return names.join(' · ') || '尚未完成测试' },
    personalityPayload() { const p=state.personalityTests||{}, legacy=state.personality||{}; return { bigFive:p.bigfive || (legacy.type==='bigfive'?legacy.result:'暂未填写'), mbti:p.mbti || (legacy.type==='mbti'?legacy.result:'暂未填写') } },
    countdownText() {
      const result = freedomResult(state)
      if (!result.date) return '我的 FIRE 倒计时：暂未计算出目标日期'
      const d = new Date(result.date); return '我的 FIRE 倒计时：预计 ' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日达到目标，目前约 ' + (result.months || 0) + ' 个月'
    },
    sendContext(text) { if(!this.ready)return this.goCalculator(); if(!text||this.loading)return; this.question=text; this.send() },
    sendCountdown() { this.sendContext(this.countdownText()) },
    sendProfile() { this.sendContext('请结合我的财务情况和性格测试结果，分析目前最需要调整的生活习惯，并给出可执行的建议。') },
    scrollToLast() { this.lastMessageId='';this.$nextTick(() => { this.lastMessageId='chat-bottom' }) },
    formatAnswer(value) { return limitAIAnswer(value) },

    typeAnswer(text) {
      return new Promise(resolve => {
        const message={role:'assistant',text:''}
        this.messages.push(message)
        const characters=Array.from(limitAIAnswer(text))
        let index=0
        const step=()=>{
          if(index>=characters.length){this.scrollToLast();resolve();return}
          message.text += characters[index++]
          this.scrollToLast()
          setTimeout(step, Math.max(16, text.length>240 ? 12 : 26))
        }
        step()
      })
    },
    async send() {
      this.isMember=isMembershipActive(state)
      if (!this.isMember && this.freeUsed >= 3) {
        showNotice({ title: '今日免费额度已用完，请升级会员继续使用', icon: 'none', duration: 2600 })
        return
      }
      const question = this.question.trim()
      if (!question || this.loading) return
      this.question = ''
      this.messages.push({ role: 'user', text: question })
      this.scrollToLast()
      this.saveCurrentChat()
      this.loading = true
      const requestOwner=this.accountUid
      const startedAt = Date.now()
      try {
        const result = await askBehaviorAI({ question, finance: state.finance, countdown: this.countdownText(), personality: this.personalityPayload() })
        if(requestOwner!==accountId())return
        const answer = result && (result.reply || result.message || result.content)
        if (!answer) throw new Error('AI 暂时没有返回建议')
        if(!this.isMember){if(Number.isSafeInteger(result.used)){this.freeUsed=result.used;state.toolUsage=state.toolUsage||{};state.toolUsage.aiDaily={date:this.todayKey(),count:result.used};persist()}else this.consumeQuota()}
        const elapsed = Date.now() - startedAt
        if (elapsed < 1200) await new Promise(resolve => setTimeout(resolve, 1200 - elapsed))
        if(requestOwner!==accountId())return
        await this.typeAnswer(this.formatAnswer(String(answer)))
        this.saveCurrentChat()
      } catch (error) {
        if(requestOwner===accountId())this.messages.push({ role: 'assistant', text: this.formatAnswer(error.message || 'AI 暂时无法回答，请稍后再试') })
      } finally { this.loading = false; this.scrollToLast() }
    },
  },
}
</script>

<style>
.ai-page{height:100vh;height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#eef5ef;box-sizing:border-box;padding-top:calc(48px + var(--fire-status-top, env(safe-area-inset-top)))}
.head{position:fixed;z-index:20;top:0;left:0;right:0;height:calc(48px + var(--fire-status-top, env(safe-area-inset-top)));padding:var(--fire-status-top, env(safe-area-inset-top)) 14px 0;display:flex;align-items:center;justify-content:space-between;background:#f7fbf6;border-bottom:1px solid #dce9dc;box-sizing:border-box}
.back,.close{width:36px;height:40px;display:flex;align-items:center;justify-content:center;color:#173d35;font-size:28px}.title{font-size:17px;font-weight:600;color:#173d35}
.chat-shell{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.chat-meta{flex-shrink:0;display:flex;align-items:center;gap:6px;min-height:38px;padding:0 12px;border-bottom:1px solid #e0e9df;box-sizing:border-box}
.meta-link{flex-shrink:0;display:flex;align-items:center;justify-content:center;min-height:36px;margin:0;padding:0 2px;border:0;background:transparent;color:#527059;font-size:11px;line-height:1.4}
.meta-link::after,.profile-button::after,.send::after{border:0}.meta-note{flex:1;min-width:0;color:#8b9489;font-size:10px;white-space:nowrap;text-align:right}.quota-link{margin-left:2px;color:#39705b}
.messages{flex:1;min-height:0;height:0;width:100%;box-sizing:border-box}.message-list{padding:6px 12px 12px}.scroll-anchor{height:1px}
.message-row{display:flex;margin:10px 0}.message-row.assistant{justify-content:flex-start}.message-row.user{justify-content:flex-end}
.message-bubble{max-width:94%;padding:11px 13px;border-radius:15px;color:#243830;font-size:14px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;box-sizing:border-box}
.assistant .message-bubble{background:#fff;border-top-left-radius:4px}.user .message-bubble{max-width:86%;background:#d7e9d6;border-top-right-radius:4px}.typing{color:#71807a}
.composer{flex-shrink:0;padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:#f7fbf6;border-top:1px solid #dce9dc;box-sizing:border-box}
.keyboard-open .chat-meta{display:none}.keyboard-open .composer{padding-bottom:8px}
.input-row{display:flex;gap:7px;align-items:center}.profile-button{flex-shrink:0;min-width:40px;height:40px;margin:0;padding:0 4px;border:0;border-radius:10px;background:transparent;color:#39705b;font-size:12px;line-height:40px}
.question{flex:1;min-width:0;height:42px;padding:0 12px;border-radius:21px;background:#fff;color:#243830;font-size:14px;border:1px solid #dce9dc;box-sizing:border-box}.placeholder{color:#a2afa5}
.send{flex-shrink:0;height:42px;margin:0;padding:0 15px;border:0;border-radius:21px;background:#173d35;color:#fff;font-size:13px;line-height:42px}.send[disabled],.profile-button[disabled]{opacity:.6}
.setup-card{flex:1;min-height:0;overflow-y:auto;margin:18px 14px;padding:20px 16px;border-radius:18px;background:#fff;text-align:center}
.setup-mark{width:52px;height:52px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dcecdf;color:#39705b;font-size:26px}
.setup-title{display:block;color:#173d35;font-size:20px;font-weight:600;margin-top:14px}.setup-sub{display:block;color:#71807a;font-size:12px;line-height:1.65;margin-top:8px}
.setup-button{height:42px;margin-top:14px;border:0;border-radius:10px;background:#173d35;color:#fff;font-size:13px}
.requirement{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:12px;border-radius:12px;background:#f3f7f1;border:1px solid #dfe9df;text-align:left}
.requirement.complete{background:#e6f3e5;border-color:#8fbd96}.requirement-copy{flex:1;min-width:0}.requirement-title{display:block;color:#173d35;font-size:13px;font-weight:600}.requirement-sub{display:block;margin-top:5px;color:#71807a;font-size:11px;line-height:1.5}
.requirement-state{color:#a35d4e;font-size:11px;white-space:nowrap}.requirement.complete .requirement-state{color:#39705b}.choice-buttons{display:flex;gap:8px;margin-top:10px}.choice-buttons .setup-button{flex:1;margin-top:0;padding:0 5px;font-size:11px}.secondary-setup{background:#39705b}.unlock-note{margin-top:14px;color:#39705b;font-size:12px}
.chat-drawer{width:100%;height:65vh;padding:16px;box-sizing:border-box;background:#f7fbf6;border-radius:18px}.drawer-head{display:flex;align-items:center;justify-content:space-between;color:#173d35;font-size:17px;font-weight:600}
.new-drawer{margin-top:14px;padding:12px;border-radius:11px;background:#e3f0df;color:#315f4a;font-size:13px}.chat-list{height:calc(100% - 110px);margin-top:12px}.chat-item{padding:12px;border-radius:10px;margin-bottom:6px}.chat-item.active{background:#e3f0df}.chat-item text{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chat-item text:first-child{font-size:13px;color:#243830}.chat-item text:last-child{margin-top:4px;font-size:10px;color:#8b9489}.chat-empty{display:block;padding:30px 10px;text-align:center;color:#8b9489;font-size:12px}
@media screen and (max-width:350px){.chat-meta{gap:4px;padding:0 8px}.meta-note{display:none}.quota-link{margin-left:auto}.message-list{padding-left:9px;padding-right:9px}}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-ai-index > .head{height:var(--fire-header-height);padding-top:var(--fire-page-top);box-sizing:border-box}
 .fire-page-ai-index{padding-top:var(--fire-header-height)}
</style>
