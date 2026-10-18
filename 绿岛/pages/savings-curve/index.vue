<template>
  <view class="curve-page" :class="{ dark: darkMode }">
    <view class="topbar">
      <view><text class="eyebrow">FIRE 工具</text><text class="title">普通人一生存款曲线</text></view>
      <text class="close" @tap="close">×</text>
    </view>

    <view class="intro-card" v-if="!started && !draftPanel && !historyPanel">
      <text class="intro-title">普通人一生存款曲线</text>
      <text class="intro-copy">用选择题整理你的收入、支出和人生计划。</text>
      <button class="primary entry-main" @tap="start">开始新的计算</button>
      <button class="entry-button" @tap="openDraftPanel">查看我的草稿</button>
      <button class="entry-button" @tap="openHistoryPanel">查看我的历史结果</button>
    </view>
    <view v-else-if="draftPanel" class="intro-card list-panel">
      <text class="intro-title">我的草稿</text>
      <view v-if="draftData" class="saved-row"><text>已完成 {{ draftData.completedCount || 0 }} 题 · 上次第 {{ Number(draftData.questionIndex || 0) + 1 }} 题</text><text>{{ draftTime }}</text><button class="primary small" @tap="loadDraft">继续答题</button><button class="entry-button" @tap="deleteDraft">删除草稿</button></view>
      <text v-else class="empty-copy">暂无草稿</text>
      <button class="entry-button" @tap="closePanels">返回</button>
    </view>
    <view v-else-if="historyPanel" class="intro-card list-panel">
      <text class="intro-title">历史结果</text>
      <view v-if="historyItems.length" v-for="(item, index) in historyItems" :key="index" class="saved-row"><text>第 {{ index + 1 }} 次测算 · {{ item.age }} 岁</text><text>{{ formatDate(item.updatedAt) }}</text><button class="entry-button" @tap="viewHistory(item)">查看详情</button><button class="entry-button" @tap="deleteHistory(index)">删除</button></view>
      <text v-else class="empty-copy">暂无历史结果</text>
      <button class="entry-button" @tap="closePanels">返回</button>
    </view>
    <view v-else-if="started && profileStep" class="intro-card profile-step">
      <text class="intro-title">先告诉我两个数字</text>
      <view class="field-row"><text>当前年龄</text><input v-model="age" type="number" placeholder="请输入你的当前年龄" class="age-input" /><text>岁</text></view>
      <view class="field-row"><text>预计寿命</text><input v-model="lifeExpectancy" type="number" placeholder="请输入你的预计寿命" class="age-input" /><text>岁</text></view>
      <button class="primary" @tap="beginQuestions">进入第 1 题</button>
    </view>

    <view v-if="generating" class="generating-mask">
      <view class="spinner"></view>
      <text class="generating-title">正在整理你的人生计划…</text>
      <text class="generating-sub">沿着年龄线，计算每一个重要节点</text>
      <text class="generating-time">预计需要 5 秒</text>
    </view>

    <view v-else-if="started && !profileStep && !draftPanel && !historyPanel">
      <view class="progress-row"><text>第 {{ questionIndex + 1 }} / {{ visibleQuestions.length }} 题</text><text>{{ Math.round((questionIndex + 1) / visibleQuestions.length * 100) }}%</text></view>
      <view class="question-card" v-if="currentQuestion">
        <text class="question-tag">{{ currentQuestion.stage || currentQuestion.category }}</text>
        <text class="question-title">{{ currentQuestion.text }}</text>
        <view class="options">
          <view v-for="(option, i) in currentQuestion.options" :key="i" class="option" :class="{ selected: answers[currentQuestion.id] === option.value }" @tap="choose(option.value)">
            <text class="option-dot">{{ String.fromCharCode(65 + i) }}</text><text>{{ option.label }}</text>
          </view>
        </view>
      </view>
      <view class="nav-row"><button class="secondary" :disabled="questionIndex === 0" @tap="previous">上一题</button><button class="primary small" @tap="next">{{ questionIndex === visibleQuestions.length - 1 ? '查看曲线' : '下一题' }}</button></view>

      <view v-if="showResult" class="result-area">
        <view class="section-head"><view><text class="section-title">你的存款曲线</text><text class="section-sub">从 {{ age }} 岁推算到 {{ lifeExpectancy }} 岁</text></view><text class="theme-toggle" @tap="darkMode = !darkMode">{{ darkMode ? '浅色' : '深色' }}</text></view>
        <view class="chart-card" v-if="curve.length">
          <svg class="chart" viewBox="0 0 360 190" preserveAspectRatio="none">
            <line v-for="y in [25,70,115,160]" :key="y" x1="28" :y1="y" x2="350" :y2="y" class="grid-line" />
            <polyline :points="animatedChartPoints" class="curve-line" />
            <circle v-for="p in animatedChartDots" :key="p.age" :cx="p.x" :cy="p.y" r="3.5" class="curve-dot" />
          </svg>
          <text class="axis-y">存款金额</text><view class="chart-labels"><text>{{ age }}岁</text><text>{{ lifeExpectancy }}岁</text></view>
        </view>
        <view class="summary-grid"><view><text>预计峰值</text><strong>¥{{ formatMoney(peakBalance) }}</strong></view><view><text>最低余额</text><strong>¥{{ formatMoney(minBalance) }}</strong></view><view><text>退休时</text><strong>¥{{ formatMoney(retirementBalance) }}</strong></view></view>

        <view class="events-card">
          <view class="section-head"><view><text class="section-title">自定义人生事件</text><text class="section-sub">最多添加 5 个，实时影响曲线</text></view><text class="count">{{ customEvents.length }}/5</text></view>
          <view v-for="(event, i) in customEvents" :key="i" class="event-row">
            <input v-model="event.label" placeholder="事件" />
            <input v-model.number="event.age" type="number" placeholder="年龄" />
            <input v-model.number="event.amount" type="number" placeholder="金额" />
            <input v-model.number="event.duration" type="number" placeholder="年限" />
            <text @tap="removeEvent(i)">×</text>
          </view>
          <button v-if="customEvents.length < 5" class="event-add" @tap="addEvent">＋ 添加事件</button>
          <text class="hint">正数表示收入，负数表示支出。</text>
        </view>

        <view class="actions"><button class="secondary" @tap="save">保存草稿并同步</button><button class="primary" @tap="recalculate">重新计算</button></view>
        <text class="privacy">数据只保存在本机，不会上传服务器。</text>
      </view>
    </view>
    <BottomTabs current="tools" />
  </view>
</template>

<script>
import BottomTabs from '@/components/BottomTabs.vue'
import { state, persist, syncStateToServer } from '@/store/index.js'
import { SAVINGS_QUESTIONS } from '@/utils/savings-questions.js'

export default {
  components: { BottomTabs },
  data() { return { age: '', lifeExpectancy: '', started: false, profileStep: false, draftPanel: false, historyPanel: false, draftData: null, historyItems: [], questionIndex: 0, answers: {}, showResult: false, darkMode: false, generating: false, generationTimer: null, chartTimer: null, chartProgress: 0, customEvents: [], questions: SAVINGS_QUESTIONS, curve: [] } },
  computed: {
    visibleQuestions() {
      if (this.age < 18) return this.questions.filter(q => q.stage === 'youth')
      if (this.age < 40) return this.questions.filter(q => q.stage === 'youth' || q.stage === 'young')
      if (this.age < 60) return this.questions.filter(q => q.stage !== 'later')
      return this.questions
    },
    currentQuestion() { return this.visibleQuestions[this.questionIndex] },
    animatedCurve() {
      const count = Math.max(1, Math.floor(this.curve.length * this.chartProgress))
      return this.curve.slice(0, count)
    },
    chartDomainMin() { return Math.min(0, this.minBalance) },
    chartDomainMax() { return Math.max(this.peakBalance, this.curve.length ? this.curve[0].balance : 0, 1) },
    animatedChartPoints() {
      if (!this.animatedCurve.length) return ''
      const range = Math.max(1, this.chartDomainMax - this.chartDomainMin)
      return this.animatedCurve.map((point, index) => {
        const x = 28 + index * 322 / Math.max(1, this.curve.length - 1)
        const y = 160 - (point.balance - this.chartDomainMin) / range * 135
        return x.toFixed(1) + ',' + y.toFixed(1)
      }).join(' ')
    },
    animatedChartDots() {
      if (!this.animatedCurve.length) return []
      const range = Math.max(1, this.chartDomainMax - this.chartDomainMin)
      return this.animatedCurve.filter((point, index) => index % Math.max(1, Math.floor(this.curve.length / 5)) === 0 || index === this.animatedCurve.length - 1).map(point => {
        const index = this.curve.indexOf(point)
        return { age: point.age, x: 28 + index * 322 / Math.max(1, this.curve.length - 1), y: 160 - (point.balance - this.chartDomainMin) / range * 135 }
      })
    },
    historyCount() {
      const history = uni.getStorageSync('fire_savings_curve_history_v1')
      return Array.isArray(history) ? history.length : 0
    },
    peakBalance() { return this.curve.length ? Math.max(...this.curve.map(p => p.balance)) : 0 },
    minBalance() { return this.curve.length ? Math.min(...this.curve.map(p => p.balance)) : 0 },
    retirementBalance() { return this.curve.length ? this.curve[this.curve.length - 1].balance : 0 },
  },
  methods: {
    close() { uni.navigateBack() },
    start() { this.started = true; this.profileStep = true; this.age = ''; this.lifeExpectancy = '' },
    beginQuestions() {
      const age = Number(this.age)
      const life = Number(this.lifeExpectancy)
      if (!Number.isFinite(age) || age < 8 || age > 90) { uni.showToast({ title: '请输入正确的当前年龄', icon: 'none' }); return }
      if (!Number.isFinite(life) || life <= age || life > 110) { uni.showToast({ title: '请输入正确的预计寿命', icon: 'none' }); return }
      this.age = age; this.lifeExpectancy = life; this.profileStep = false
    },
    openDraftPanel() { this.draftData = uni.getStorageSync('fire_savings_curve_draft_v1') || null; this.draftPanel = true },
    openHistoryPanel() { const items = uni.getStorageSync('fire_savings_curve_history_v1'); this.historyItems = Array.isArray(items) ? items : []; this.historyPanel = true },
    closePanels() { this.draftPanel = false; this.historyPanel = false },
    deleteDraft() { uni.removeStorageSync('fire_savings_curve_draft_v1'); this.draftData = null },
    deleteHistory(index) { this.historyItems.splice(index, 1); uni.setStorageSync('fire_savings_curve_history_v1', this.historyItems) },
    formatDate(value) { return value ? new Date(value).toLocaleString('zh-CN') : '' },
    viewHistory(item) { this.age = item.age; this.lifeExpectancy = item.lifeExpectancy; this.answers = item.answers || {}; this.customEvents = item.events || []; this.curve = item.curve || []; this.started = true; this.profileStep = false; this.historyPanel = false; this.showResult = true; this.chartProgress = 1 },

    choose(value) {
      if (!this.currentQuestion) return
      this.answers[this.currentQuestion.id] = value
      this.saveDraft(false)
    },
    previous() { if (this.questionIndex > 0) this.questionIndex-- },
    next() {
      if (!this.currentQuestion) return
      const answered = Object.prototype.hasOwnProperty.call(this.answers, this.currentQuestion.id)
      if (!answered && this.currentQuestion.required !== false) {
        uni.showToast({ title: '请先选择一个答案', icon: 'none' })
        return
      }
      if (this.questionIndex < this.visibleQuestions.length - 1) {
        this.questionIndex++
        this.saveDraft(false)
        return
      }
      this.recalculate()
    },
    value(type, fallback) {
      const aliases = { income: 'income_monthly', expense: 'expense_monthly', rate: 'ratio', ratePercent: 'percent' }
      const wanted = aliases[type] || type
      const q = this.questions.find(item => item.type === wanted)
      return q && this.answers[q.id] !== undefined ? Number(this.answers[q.id]) : fallback
    },
    recalculate() {
      if (this.generating) return
      this.generating = true
      this.showResult = false
      if (this.generationTimer) clearTimeout(this.generationTimer)
      this.generationTimer = setTimeout(() => {
        const startSavings = this.value('balance', 3000)
        const income = this.value('income', 8000)
        const saveRate = this.value('rate', 30) / 100
        const expense = Math.max(0, this.value('expense', 3000))
        const growth = this.value('ratePercent', 3.5) / 100
        const inflation = 0.025
        const years = Math.max(1, this.lifeExpectancy - this.age)
        let balance = startSavings
        const rows = [{ age: this.age, balance: Math.round(balance) }]
        for (let i = 1; i <= years; i++) {
          const currentAge = this.age + i
          const eventTotal = this.customEvents.filter(event => Number(event.age) === currentAge).reduce((sum, event) => sum + Number(event.amount || 0), 0)
          const annualIncome = income * 12 * Math.pow(1 + growth, i - 1)
          const annualExpense = expense * 12 * Math.pow(1 + inflation, i - 1)
          balance = balance * 1.035 + annualIncome * saveRate - annualExpense + eventTotal
          rows.push({ age: currentAge, balance: Math.round(balance) })
        }
        this.curve = rows
        this.chartProgress = 0
        this.showResult = true
        const history = uni.getStorageSync('fire_savings_curve_history_v1')
        const savedHistory = Array.isArray(history) ? history : []
        savedHistory.push({ age: this.age, lifeExpectancy: this.lifeExpectancy, answers: this.answers, events: this.customEvents, curve: rows, updatedAt: Date.now() })
        uni.setStorageSync('fire_savings_curve_history_v1', savedHistory.slice(-10))
        state.savingsCurveHistory = savedHistory.slice(-10)
        persist()
        syncStateToServer()
        this.generating = false
        if (this.chartTimer) clearInterval(this.chartTimer)
        this.chartTimer = setInterval(() => {
          this.chartProgress = Math.min(1, this.chartProgress + 0.008)
          if (this.chartProgress >= 1) { clearInterval(this.chartTimer); this.chartTimer = null }
        }, 16)
        this.generationTimer = null
        uni.setStorageSync('fire_savings_curve_v1', { age: this.age, lifeExpectancy: this.lifeExpectancy, answers: this.answers, events: this.customEvents, updatedAt: Date.now() })
      }, 5000)
    },
    addEvent() { this.customEvents.push({ label: '买房', age: this.age + 5, amount: -100000, duration: 1 }) },
    removeEvent(index) { this.customEvents.splice(index, 1); this.recalculate() },
    saveDraft(showToast = true) {
      const draft = { age: this.age, lifeExpectancy: this.lifeExpectancy, answers: this.answers, questionIndex: this.questionIndex, events: this.customEvents, updatedAt: Date.now() }
      uni.setStorageSync('fire_savings_curve_draft_v1', draft)
      state.savingsCurveDraft = draft
      persist()
      syncStateToServer()
      if (showToast) uni.showToast({ title: '草稿已保存', icon: 'success' })
    },
    loadDraft() {
      const draft = uni.getStorageSync('fire_savings_curve_draft_v1')
      if (!draft) { uni.showToast({ title: '还没有草稿', icon: 'none' }); return }
      this.age = draft.age || 28; this.lifeExpectancy = draft.lifeExpectancy || 85; this.answers = draft.answers || {}; this.questionIndex = draft.questionIndex || 0; this.customEvents = draft.events || []; this.started = true
    },
    loadHistory() {
      const history = uni.getStorageSync('fire_savings_curve_history_v1')
      if (!Array.isArray(history) || !history.length) { uni.showToast({ title: '还没有历史测算', icon: 'none' }); return }
      const latest = history[history.length - 1]
      this.age = latest.age; this.lifeExpectancy = latest.lifeExpectancy; this.answers = latest.answers || {}; this.customEvents = latest.events || []; this.curve = latest.curve || []; this.started = true; this.showResult = true; this.chartProgress = 1
    },
    save() { this.saveDraft(); this.recalculate() },
    formatMoney(value) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 }) },
  },
  onLoad() {
    const saved = uni.getStorageSync('fire_savings_curve_v1')
    if (saved) { this.age = saved.age || 28; this.lifeExpectancy = saved.lifeExpectancy || 85; this.answers = saved.answers || {}; this.customEvents = saved.events || [] }
  },
}
</script>

<style>
.curve-page{min-height:100vh;padding:calc(22px + env(safe-area-inset-top)) 18px 120px;background:#f7f6f1;color:#243830;box-sizing:border-box}.dark{background:#17231e;color:#e8efe8}.topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.eyebrow{display:block;font-size:12px;color:#6c8c77;margin-bottom:5px}.title{display:block;font-size:23px;font-weight:700}.close{font-size:30px;line-height:1;color:#355f4f;padding:0 6px}.intro-card,.question-card,.chart-card,.events-card{background:rgba(255,255,255,.82);border-radius:20px;padding:20px;box-shadow:0 8px 24px rgba(33,58,47,.07)}.dark .intro-card,.dark .question-card,.dark .chart-card,.dark .events-card{background:#21352b}.intro-title{display:block;font-size:25px;font-weight:700;margin-bottom:9px}.intro-copy,.section-sub,.privacy,.hint{display:block;color:#71807a;font-size:13px;line-height:1.7}.intro-row{display:flex;justify-content:space-between;margin:18px 0;color:#527059;font-size:11px}.field-row{display:flex;align-items:center;gap:8px;padding:13px 0;border-bottom:1px solid rgba(80,110,90,.12);font-size:14px}.age-input{width:70px;padding:7px 10px;text-align:center;border-radius:10px;border:1px solid #dce8dc;background:#fff;color:#243830}.primary,.secondary,.event-add{border-radius:13px;padding:0 18px;min-height:46px;margin-top:18px;line-height:46px;font-size:14px}.primary{background:#2d5b49;color:#fff}.secondary{background:#edf2eb;color:#355f4f}.small{min-width:130px}.progress-row{display:flex;justify-content:space-between;color:#6c8c77;font-size:12px;margin-bottom:10px}.question-tag{display:block;color:#6c8c77;font-size:12px;margin-bottom:10px}.question-title{display:block;font-size:22px;font-weight:700;line-height:1.45;margin-bottom:18px}.options{display:flex;flex-direction:column;gap:9px}.option{display:flex;align-items:center;gap:10px;padding:13px;border-radius:13px;background:#f1f5ee;color:#405a4b;font-size:14px}.option.selected{background:#dbead8;color:#1e4c39;font-weight:600}.option-dot{width:24px;height:24px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px}.nav-row{display:flex;justify-content:space-between;gap:12px}.nav-row button{flex:1}.result-area{margin-top:28px}.section-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}.section-title{display:block;font-size:19px;font-weight:700}.theme-toggle,.count{color:#527059;font-size:12px;padding-top:4px}.chart-card{padding:14px 12px 10px}.chart{width:100%;height:190px;display:block}.grid-line{stroke:#dbe5dc;stroke-width:1}.curve-line{fill:none;stroke:#3b7557;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.curve-dot{fill:#f7f6f1;stroke:#3b7557;stroke-width:2}.chart-labels{display:flex;justify-content:space-between;color:#71807a;font-size:11px}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.summary-grid view{padding:12px 8px;border-radius:14px;background:#edf2eb}.summary-grid text,.summary-grid strong{display:block}.summary-grid text{font-size:11px;color:#71807a}.summary-grid strong{font-size:14px;color:#2d5b49;margin-top:5px}.events-card{margin-top:14px}.event-row{display:grid;grid-template-columns: 1fr .65fr 1fr .8fr 24px;gap:6px;margin:8px 0}.event-row input{min-width:0;padding:9px 5px;text-align:center;border:1px solid #dce8dc;border-radius:9px;font-size:12px}.event-row text{font-size:22px;color:#8c6a62;text-align:center}.event-add{width:100%;background:#f1f5ee;color:#527059;border:1px dashed #b8cdbb;margin-top:8px}.actions{display:flex;gap:10px;margin-top:16px}.actions button{flex:1}.privacy{text-align:center;margin-top:15px;font-size:11px}@media (prefers-color-scheme:dark){.curve-page:not(.dark){background:#17231e;color:#e8efe8}.curve-page:not(.dark) .intro-card,.curve-page:not(.dark) .question-card,.curve-page:not(.dark) .chart-card,.curve-page:not(.dark) .events-card{background:#21352b}}
.generating-mask{position:fixed;z-index:20;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;background:rgba(247,246,241,.97);text-align:center}.dark .generating-mask{background:rgba(23,35,30,.98)}.spinner{width:46px;height:46px;border:3px solid rgba(82,112,89,.2);border-top-color:#527059;border-radius:50%;animation:curveSpin 1s linear infinite}.generating-title{margin-top:22px;font-size:20px;font-weight:700;color:#243830}.generating-sub{margin-top:8px;color:#71807a;font-size:13px}.generating-time{margin-top:24px;color:#8b9489;font-size:11px}@keyframes curveSpin{to{transform:rotate(360deg)}}.entry-links{display:flex;justify-content:space-between;margin-top:16px;color:#527059;font-size:13px}.entry-hint{display:block;text-align:center;margin-top:10px;color:#8b9489;font-size:11px}.axis-y{display:block;color:#71807a;font-size:10px;margin:0 0 3px 12px}</style>
