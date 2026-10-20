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
      <view v-if="!showResult">
      <view class="progress-row"><text>第 {{ questionIndex + 1 }} / {{ visibleQuestions.length }} 题</text><text>{{ Math.round((questionIndex + 1) / visibleQuestions.length * 100) }}%</text></view>
      <view class="question-card" v-if="currentQuestion">
        <text class="question-tag">{{ stageLabel(currentQuestion.stage || currentQuestion.category) }}</text>
        <text class="question-title">{{ currentQuestion.text }}</text>
        <view class="options">
          <view v-for="(option, i) in currentQuestion.options" :key="i" class="option" :class="{ selected: answers[currentQuestion.id] === option.value && customAnswers[currentQuestion.id] === undefined }" @tap="choose(option.value)">
            <text class="option-dot">{{ String.fromCharCode(65 + i) }}</text><text>{{ option.label }}</text>
          </view>
          <view class="option custom-option" :class="{ selected: customAnswers[currentQuestion.id] !== undefined }" @tap="beginCustom">
            <text class="option-dot">F</text><text>自定义</text>
          </view>
          <view v-if="customEditing === currentQuestion.id" class="custom-input-row">
            <input class="custom-input" v-model="customDraft" type="number" placeholder="请输入数值" />
            <text class="custom-unit">{{ unitLabel(currentQuestion) }}</text>
            <button class="custom-confirm" @tap="confirmCustom">确定</button>
          </view>
        </view>
      </view>
      <view class="nav-row"><button class="secondary" :disabled="questionIndex === 0" @tap="previous">上一题</button><button class="secondary draft-action" @tap="saveDraft">保存到我的草稿</button><button class="primary small" @tap="next">{{ questionIndex === visibleQuestions.length - 1 ? '查看曲线' : '下一题' }}</button></view>

      </view>

      <view v-if="showResult" class="result-area">
        <view class="section-head"><view><text class="section-title">你的存款曲线</text><text class="section-sub">从 {{ age }} 岁推算到 {{ lifeExpectancy }} 岁</text></view><text class="theme-toggle" @tap="darkMode = !darkMode">{{ darkMode ? '浅色' : '深色' }}</text></view>
        <view v-if="answerSummary.length" class="answer-summary"><text class="section-title">本次答案摘要</text><view v-for="item in answerSummary" :key="item.id"><text>{{ item.text }}</text><strong>{{ item.label }}</strong></view></view>
        <view class="chart-card result-chart" v-if="curve.length">
          <view class="chart-header"><view><text class="chart-total">¥{{ formatCompact(retirementBalance) }}</text><text class="chart-age">{{ lifeExpectancy }} 岁</text></view><text class="chart-caption">存款 · 人生曲线</text></view>
          <svg class="chart" viewBox="0 0 360 230" preserveAspectRatio="none">
            <line v-for="y in [38,78,118,158,198]" :key="y" x1="28" :y1="y" x2="350" :y2="y" class="grid-line" />
            <line x1="28" y1="158" x2="350" y2="158" class="chart-baseline" />
            <polygon v-for="seg in chartSegments" :key="'area-' + seg.key" :points="seg.area" :class="seg.negative ? 'curve-area negative' : 'curve-area positive'" />
            <polyline v-for="seg in chartSegments" :key="'line-' + seg.key" :points="seg.points" :class="seg.negative ? 'curve-line negative' : 'curve-line positive'" />
            <text x="26" y="40" class="axis-label">{{ formatCompact(chartDomainMax) }}</text>
            <text x="14" y="162" class="axis-label">0</text>
            <text v-if="chartDomainMin < 0" x="26" y="198" class="axis-label">{{ formatCompact(chartDomainMin) }}</text>
            <circle v-for="p in animatedChartDots" :key="p.age" :cx="p.x" :cy="p.y" r="3.2" class="curve-dot" />
            <text v-for="marker in eventMarkers" :key="marker.age + marker.label" :x="marker.x" :y="marker.y" class="event-marker">{{ marker.label }}</text>
          </svg>
          <view class="chart-labels"><text>{{ age }} 岁</text><text>{{ Math.round((Number(age)+Number(lifeExpectancy))/2) }} 岁</text><text>{{ lifeExpectancy }} 岁</text></view>
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
        <view class="result-note"><text>结果说明</text><text>本结果根据你选择的范围估算，不代表确定结果。</text></view>
        <view class="ai-card"><view class="section-head"><view><text class="section-title">AI 解析</text><text class="section-sub">只给重点建议，内容不超过 300 字</text></view></view><text v-if="aiAnalysis" class="ai-copy">{{ aiAnalysis }}</text><button class="secondary full" @tap="runAIAnalysis">{{ analysisLoading ? '分析中…' : '获取 AI 解析' }}</button></view><text class="privacy">数据会保存在本机，并按当前登录账号尝试同步云端。</text>
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
  data() { return { age: '', lifeExpectancy: '', started: false, profileStep: false, draftPanel: false, historyPanel: false, draftData: null, historyItems: [], questionIndex: 0, answers: {}, customAnswers: {}, customEditing: '', customDraft: '', showResult: false, darkMode: false, generating: false, generationTimer: null, chartTimer: null, chartProgress: 0, customEvents: [], questions: SAVINGS_QUESTIONS, curve: [], aiAnalysis: '', analysisLoading: false } },
  computed: {
    visibleQuestions() {
      let stages
      if (this.age < 18) stages = ['youth']
      else if (this.age < 40) stages = ['young']
      else if (this.age < 60) stages = ['middle']
      else stages = ['later']
      const event = this.questions.find(item => item.id === 'q100')
      const eligible = this.questions.filter(item => item.id !== 'q100' && stages.indexOf(item.stage) >= 0).slice(0, 49)
      return event ? eligible.concat(event) : eligible
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
        const y = 158 - (point.balance - this.chartDomainMin) / range * 120
        return x.toFixed(1) + ',' + y.toFixed(1)
      }).join(' ')
    },
    animatedChartDots() {
      if (!this.animatedCurve.length) return []
      const range = Math.max(1, this.chartDomainMax - this.chartDomainMin)
      return this.animatedCurve.filter((point, index) => index % Math.max(1, Math.floor(this.curve.length / 5)) === 0 || index === this.animatedCurve.length - 1).map(point => {
        const index = this.curve.indexOf(point)
        return { age: point.age, x: 28 + index * 322 / Math.max(1, this.curve.length - 1), y: 158 - (point.balance - this.chartDomainMin) / range * 120 }
      })
    },
    chartSegments() {
      if (!this.animatedCurve.length) return []
      const range = Math.max(1, this.chartDomainMax - this.chartDomainMin)
      const coordinate = (point, index) => {
        const x = 28 + index * 322 / Math.max(1, this.curve.length - 1)
        const y = 158 - (point.balance - this.chartDomainMin) / range * 120
        return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) }
      }
      if (this.animatedCurve.length === 1) {
        const p = coordinate(this.animatedCurve[0], 0)
        return [{ key: 0, negative: this.animatedCurve[0].balance < 0, coords: [p], points: p.x + ',' + p.y, area: '' }]
      }
      const segments = []
      let segment = { key: 0, negative: this.animatedCurve[0].balance < 0, coords: [coordinate(this.animatedCurve[0], 0)] }
      this.animatedCurve.slice(1).forEach((point, offset) => {
        const index = offset + 1
        const nextNegative = point.balance < 0
        const current = coordinate(point, index)
        if (nextNegative !== segment.negative) {
          const previous = coordinate(this.animatedCurve[index - 1], index - 1)
          segment.coords.push(previous)
          segments.push(segment)
          segment = { key: index, negative: nextNegative, coords: [previous, current] }
        } else {
          segment.coords.push(current)
        }
      })
      segments.push(segment)
      return segments.map(item => {
        const points = item.coords.map(p => p.x + ',' + p.y).join(' ')
        const first = item.coords[0]
        const last = item.coords[item.coords.length - 1]
        const area = item.coords.length > 1 ? points + ' ' + last.x + ',158 ' + first.x + ',158' : ''
        return { key: item.key, negative: item.negative, coords: item.coords, points, area }
      })
    },
    eventMarkers() {
      const markers = (this.customEvents || []).map(event => ({ age: Number(event.age), label: event.label || '事件' }))
      const answerFor = (matcher) => {
        const question = this.questions.find(item => matcher(item.text))
        return question && this.answers[question.id] !== undefined ? Number(this.answers[question.id]) : 0
      }
      const addPlanned = (timeMatcher, amountMatcher, label) => {
        const years = answerFor(timeMatcher)
        const amount = answerFor(amountMatcher)
        if (years > 0 && amount > 0) markers.push({ age: Number(this.age) + years, label })
      }
      addPlanned(text => text.includes('几年后买房'), text => text.includes('首付'), '买房')
      addPlanned(text => text.includes('几年后买车'), text => text.includes('买车的预算'), '买车')
      addPlanned(text => text.includes('计划结婚'), text => text.includes('结婚和彩礼'), '结婚')
      return markers.map(event => {
        const index = this.curve.findIndex(point => point.age === event.age)
        if (index < 0) return null
        return { age: event.age, label: event.label, x: 28 + index * 322 / Math.max(1, this.curve.length - 1), y: 210 }
      }).filter(Boolean)
    },
    historyCount() {
      const history = uni.getStorageSync('fire_savings_curve_history_v1')
      return Array.isArray(history) ? history.length : 0
    },
    answerSummary() {
      const answered = this.visibleQuestions.filter(item => this.answers[item.id] !== undefined)
      const key = answered.filter(item => /退休|收入中断|稳定收入|停止工作/.test(item.text))
      const selected = []
      answered.slice(0, 6).concat(key).forEach(item => {
        if (!selected.some(existing => existing.id === item.id)) selected.push(item)
      })
      return selected.slice(0, 12).map(item => {
        const option = (item.options || []).find(choice => choice.value === this.answers[item.id])
        return { id: item.id, text: item.text, label: option ? option.label : this.formatCustomValue(item, this.answers[item.id]) }
      })
    },
    draftTime() { return this.draftData ? this.formatDate(this.draftData.updatedAt) : '' },
    peakBalance() { return this.curve.length ? Math.max(...this.curve.map(p => p.balance)) : 0 },
    minBalance() { return this.curve.length ? Math.min(...this.curve.map(p => p.balance)) : 0 },
    retirementBalance() { return this.curve.length ? this.curve[this.curve.length - 1].balance : 0 },
  },
  methods: {
    close() { uni.navigateBack() },
    stageLabel(value) { return { youth: '成长阶段', young: '青年阶段', middle: '家庭阶段', later: '后期规划', basic: '基础信息' }[value] || value },
    unitLabel(question) {
      const type = question && question.type
      if (type === 'ratio' || type === 'percent') return '%'
      if (type === 'years') return '年'
      if (type === 'retirement_age') return '岁'
      if (type === 'balance' || type === 'income_monthly' || type === 'retirement_income_monthly' || type === 'expense_monthly' || type === 'amount' || type === 'event') return '元'
      return ''
    },
    formatCustomValue(question, value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return String(value)
      const unit = this.unitLabel(question)
      return number.toLocaleString('zh-CN') + (unit ? ' ' + unit : '')
    },
    beginCustom() {
      if (!this.currentQuestion) return
      this.customEditing = this.currentQuestion.id
      this.customDraft = this.customAnswers[this.currentQuestion.id] !== undefined ? String(this.customAnswers[this.currentQuestion.id]) : ''
    },
    confirmCustom() {
      if (!this.currentQuestion || this.customEditing !== this.currentQuestion.id) return
      const value = Number(this.customDraft)
      if (!Number.isFinite(value)) {
        uni.showToast({ title: '请输入有效数字', icon: 'none' })
        return
      }
      const type = this.currentQuestion.type
      if ((type === 'ratio' || type === 'percent') && (value < 0 || value > 100)) {
        uni.showToast({ title: '百分比需在 0 到 100 之间', icon: 'none' })
        return
      }
      if (type === 'years' && (value < 0 || value > 100)) {
        uni.showToast({ title: '年数需在 0 到 100 之间', icon: 'none' })
        return
      }
      if (type !== 'event' && type !== 'ratio' && type !== 'percent' && type !== 'years' && value < 0) {
        uni.showToast({ title: '金额不能小于 0', icon: 'none' })
        return
      }
      this.customAnswers = Object.assign({}, this.customAnswers, { [this.currentQuestion.id]: value })
      this.answers[this.currentQuestion.id] = value
      this.customEditing = ''
      this.customDraft = ''
      this.saveDraft(false)
    },
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
    async deleteDraft() { uni.removeStorageSync('fire_savings_curve_draft_v1'); this.draftData = null; state.savingsCurveDraft = null; persist(); await syncStateToServer(); },
    async deleteHistory(index) { this.historyItems.splice(index, 1); uni.setStorageSync('fire_savings_curve_history_v1', this.historyItems); state.savingsCurveHistory = this.historyItems; persist(); await syncStateToServer(); },
    formatDate(value) { return value ? new Date(value).toLocaleString('zh-CN') : '' },
    viewHistory(item) { this.age = item.age; this.lifeExpectancy = item.lifeExpectancy; this.answers = item.answers || {}; this.customAnswers = item.customAnswers || {}; this.customEvents = item.events || []; this.curve = item.curve || []; this.started = true; this.profileStep = false; this.historyPanel = false; this.showResult = true; this.chartProgress = 1 },

    choose(value) {
      if (!this.currentQuestion) return
      this.answers[this.currentQuestion.id] = value
      const nextCustom = Object.assign({}, this.customAnswers)
      delete nextCustom[this.currentQuestion.id]
      this.customAnswers = nextCustom
      this.customEditing = ''
      this.customDraft = ''
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
      const visible = this.visibleQuestions.filter(item => item.type === wanted)
      const q = visible.find(item => this.answers[item.id] !== undefined) || visible[0] || this.questions.find(item => item.type === wanted)
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
        const years = Math.max(1, this.lifeExpectancy - this.age)
        const answerValue = (matcher, fallback = 0) => {
          const visible = this.visibleQuestions.find(item => matcher(item.text))
          const question = visible || this.questions.find(item => matcher(item.text))
          return question && this.answers[question.id] !== undefined ? Number(this.answers[question.id]) : fallback
        }
        const baseExpense = this.value('expense', 3000)
        const fixedMonthlyExpense = answerValue(text => text.includes('房贷还款'), 0) + answerValue(text => text.includes('养车支出'), 0)
        const expense = Math.max(0, baseExpense + fixedMonthlyExpense)
        const growth = answerValue(text => text.includes('收入增长率') || text.includes('工资每年固定增长'), this.value('ratePercent', 3.5)) / 100
        const inflation = answerValue(text => text.includes('通货膨胀率') || text.includes('生活成本每年增长率'), 2.5) / 100
        const returnRate = answerValue(text => text.includes('复利年化收益率'), 3.5) / 100
        const retirementAge = answerValue(text => text.includes('预计在多少岁退休') || text.includes('退休时年龄'), this.lifeExpectancy + 1)
        const incomeCutoffAge = answerValue(text => text.includes('主动收入预计在多少岁中断') || text.includes('停止工作'), retirementAge)
        const retirementIncome = answerValue(text => text.includes('退休后每月') && text.includes('稳定收入'), 0)
        const plannedEvents = []
        const addPlanned = (timeMatcher, amountMatcher, label) => {
          const afterYears = answerValue(timeMatcher, 0)
          const amount = answerValue(amountMatcher, 0)
          if (afterYears > 0 && amount > 0) plannedEvents.push({ age: this.age + afterYears, amount: -amount, label })
        }
        addPlanned(text => text.includes('攒够首付'), text => text.includes('买房的首付'), '买房')
        addPlanned(text => text.includes('还清车贷'), text => text.includes('买车的预算'), '买车')
        const marriageAmount = answerValue(text => text.includes('结婚的一次性'), 0) + answerValue(text => text.includes('彩礼金额'), 0) + answerValue(text => text.includes('婚礼酒席'), 0)
        if (marriageAmount > 0) plannedEvents.push({ age: this.age + 2, amount: -marriageAmount, label: '结婚' })
        const educationAmount = answerValue(text => text.includes('子女教育金目标'), 0)
        if (educationAmount > 0) plannedEvents.push({ age: this.age + 5, amount: -educationAmount, label: '教育金' })
        const customEventAmount = answerValue(text => text.includes('自定义人生事件'), 0)
        if (customEventAmount !== 0) plannedEvents.push({ age: this.age + 1, amount: customEventAmount, label: '自定义事件' })
        const reserveKeywords = ['预算', '支出', '医疗', '旅游', '婚礼', '学习提升', '兴趣班', '体检', '家电家具']
        const reserveAmount = this.visibleQuestions.filter(question => question.type === 'amount' && reserveKeywords.some(keyword => question.text.includes(keyword)) && !question.text.includes('首付') && !question.text.includes('买车的预算') && !question.text.includes('结婚的一次性') && !question.text.includes('彩礼') && !question.text.includes('医疗准备') && !question.text.includes('教育金目标')).reduce((sum, question) => {
          const amount = this.answers[question.id] !== undefined ? Number(this.answers[question.id]) : 0
          if (!amount) return sum
          return sum + (question.text.includes('每年') ? amount : amount / Math.max(1, Math.min(5, years)))
        }, 0)
        const plannedAt = age => plannedEvents.filter(event => event.age === age).reduce((sum, event) => sum + event.amount, 0)
        let balance = startSavings
        const rows = [{ age: this.age, balance: Math.round(balance) }]
        for (let i = 1; i <= years; i++) {
          const currentAge = this.age + i
          const eventTotal = this.customEvents.filter(event => Number(event.age) === currentAge).reduce((sum, event) => sum + Number(event.amount || 0), 0) + plannedAt(currentAge)
          const activeIncome = currentAge >= incomeCutoffAge ? retirementIncome : income * Math.pow(1 + growth, i - 1)
          const annualIncome = activeIncome * 12
          const annualExpense = (expense * 12 + reserveAmount) * Math.pow(1 + inflation, i - 1)
          balance = balance * (1 + returnRate) + annualIncome * saveRate - annualExpense + eventTotal
          rows.push({ age: currentAge, balance: Math.round(balance) })
        }
        this.curve = rows
        this.chartProgress = 0
        this.showResult = true
        const history = uni.getStorageSync('fire_savings_curve_history_v1')
        const savedHistory = Array.isArray(history) ? history : []
        savedHistory.push({ age: this.age, lifeExpectancy: this.lifeExpectancy, answers: this.answers, customAnswers: this.customAnswers, events: this.customEvents, curve: rows, updatedAt: Date.now() })
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
        uni.setStorageSync('fire_savings_curve_v1', { age: this.age, lifeExpectancy: this.lifeExpectancy, answers: this.answers, customAnswers: this.customAnswers, events: this.customEvents, updatedAt: Date.now() })
      }, 5000)
    },
    addEvent() { this.customEvents.push({ label: '买房', age: this.age + 5, amount: -100000, duration: 1 }) },
    removeEvent(index) { this.customEvents.splice(index, 1); this.recalculate() },
    async saveDraft(showToast = true) {
      const draft = { age: this.age, lifeExpectancy: this.lifeExpectancy, answers: this.answers, customAnswers: this.customAnswers, questionIndex: this.questionIndex, completedCount: Object.keys(this.answers).length, events: this.customEvents, updatedAt: Date.now() }
      uni.setStorageSync('fire_savings_curve_draft_v1', draft)
      state.savingsCurveDraft = draft
      persist()
      const result = await syncStateToServer()
      if (!showToast) return result
      if (result && result.synced) uni.showToast({ title: '草稿已保存', icon: 'success' })
      else if (result && result.configured === false) uni.showToast({ title: '已保存本机，云端未配置', icon: 'none' })
      else uni.showToast({ title: '云端保存失败，请重试', icon: 'none' })
      return result
    },
    loadDraft() {
      const draft = uni.getStorageSync('fire_savings_curve_draft_v1')
      if (!draft) { uni.showToast({ title: '还没有草稿', icon: 'none' }); return }
      this.age = draft.age; this.lifeExpectancy = draft.lifeExpectancy; this.answers = draft.answers || {}; this.customAnswers = draft.customAnswers || {}; this.questionIndex = draft.questionIndex || 0; this.customEvents = draft.events || []; this.started = true; this.profileStep = false; this.draftPanel = false
    },
    loadHistory() {
      const history = uni.getStorageSync('fire_savings_curve_history_v1')
      if (!Array.isArray(history) || !history.length) { uni.showToast({ title: '还没有历史测算', icon: 'none' }); return }
      const latest = history[history.length - 1]
      this.age = latest.age; this.lifeExpectancy = latest.lifeExpectancy; this.answers = latest.answers || {}; this.customAnswers = latest.customAnswers || {}; this.customEvents = latest.events || []; this.curve = latest.curve || []; this.started = true; this.showResult = true; this.chartProgress = 1
    },
    save() { this.saveDraft(); this.recalculate() },
    async runAIAnalysis() {
      if (this.analysisLoading) return
      this.analysisLoading = true
      setTimeout(() => {
        const peak = this.formatMoney(this.peakBalance)
        const current = this.formatMoney(this.curve.length ? this.curve[0].balance : 0)
        const ending = this.formatMoney(this.retirementBalance)
        this.aiAnalysis = '你的当前存款约为 ¥' + current + '，模型预计峰值约为 ¥' + peak + '，预计寿命时余额约为 ¥' + ending + '。建议先保持储蓄比例，再优先准备应急金；买房、买车等大额事件要单独预留预算。结果只用于行为规划，不代表确定结果。'
        this.analysisLoading = false
      }, 900)
    },
    formatMoney(value) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 }) },
    formatCompact(value) {
      const n = Number(value || 0)
      if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(1) + ' 亿'
      if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + ' 万'
      return this.formatMoney(n)
    },
  },
  onLoad() {
    const saved = uni.getStorageSync('fire_savings_curve_v1')
    if (saved) { this.age = saved.age || 28; this.lifeExpectancy = saved.lifeExpectancy || 85; this.answers = saved.answers || {}; this.customAnswers = saved.customAnswers || {}; this.customEvents = saved.events || [] }
  },
}
</script>

<style>
.curve-page{min-height:100vh;padding:calc(22px + env(safe-area-inset-top)) 18px 120px;background:#f7f6f1;color:#243830;box-sizing:border-box}.dark{background:#17231e;color:#e8efe8}.topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.eyebrow{display:block;font-size:12px;color:#6c8c77;margin-bottom:5px}.title{display:block;font-size:23px;font-weight:700}.close{font-size:30px;line-height:1;color:#355f4f;padding:0 6px}.intro-card,.question-card,.chart-card,.events-card{background:rgba(255,255,255,.82);border-radius:20px;padding:20px;box-shadow:0 8px 24px rgba(33,58,47,.07)}.dark .intro-card,.dark .question-card,.dark .chart-card,.dark .events-card{background:#21352b}.intro-title{display:block;font-size:25px;font-weight:700;margin-bottom:9px}.intro-copy,.section-sub,.privacy,.hint{display:block;color:#71807a;font-size:13px;line-height:1.7}.intro-row{display:flex;justify-content:space-between;margin:18px 0;color:#527059;font-size:11px}.field-row{display:flex;align-items:center;gap:8px;padding:13px 0;border-bottom:1px solid rgba(80,110,90,.12);font-size:14px}.age-input{width:70px;padding:7px 10px;text-align:center;border-radius:10px;border:1px solid #dce8dc;background:#fff;color:#243830}.primary,.secondary,.event-add{border-radius:13px;padding:0 18px;min-height:46px;margin-top:18px;line-height:46px;font-size:14px}.primary{background:#2d5b49;color:#fff}.secondary{background:#edf2eb;color:#355f4f}.small{min-width:130px}.progress-row{display:flex;justify-content:space-between;color:#6c8c77;font-size:12px;margin-bottom:10px}.question-tag{display:block;color:#6c8c77;font-size:12px;margin-bottom:10px}.question-title{display:block;font-size:22px;font-weight:700;line-height:1.45;margin-bottom:18px}.options{display:flex;flex-direction:column;gap:9px}.option{display:flex;align-items:center;gap:10px;padding:13px;border-radius:13px;background:#f1f5ee;color:#405a4b;font-size:14px}.option.selected{background:#dbead8;color:#1e4c39;font-weight:600}.option-dot{width:24px;height:24px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px}.nav-row{display:flex;justify-content:space-between;gap:12px}.nav-row button{flex:1}.result-area{margin-top:28px}.section-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}.section-title{display:block;font-size:19px;font-weight:700}.theme-toggle,.count{color:#527059;font-size:12px;padding-top:4px}.chart-card{padding:14px 12px 10px}.chart{width:100%;height:190px;display:block}.grid-line{stroke:#dbe5dc;stroke-width:1}.curve-line{fill:none;stroke:#3b7557;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.curve-dot{fill:#f7f6f1;stroke:#3b7557;stroke-width:2}.chart-labels{display:flex;justify-content:space-between;color:#71807a;font-size:11px}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.summary-grid view{padding:12px 8px;border-radius:14px;background:#edf2eb}.summary-grid text,.summary-grid strong{display:block}.summary-grid text{font-size:11px;color:#71807a}.summary-grid strong{font-size:14px;color:#2d5b49;margin-top:5px}.events-card{margin-top:14px}.event-row{display:grid;grid-template-columns: 1fr .65fr 1fr .8fr 24px;gap:6px;margin:8px 0}.event-row input{min-width:0;padding:9px 5px;text-align:center;border:1px solid #dce8dc;border-radius:9px;font-size:12px}.event-row text{font-size:22px;color:#8c6a62;text-align:center}.event-add{width:100%;background:#f1f5ee;color:#527059;border:1px dashed #b8cdbb;margin-top:8px}.actions{display:flex;gap:10px;margin-top:16px}.actions button{flex:1}.privacy{text-align:center;margin-top:15px;font-size:11px}@media (prefers-color-scheme:dark){.curve-page:not(.dark){background:#17231e;color:#e8efe8}.curve-page:not(.dark) .intro-card,.curve-page:not(.dark) .question-card,.curve-page:not(.dark) .chart-card,.curve-page:not(.dark) .events-card{background:#21352b}}
.generating-mask{position:fixed;z-index:20;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;background:rgba(247,246,241,.97);text-align:center}.dark .generating-mask{background:rgba(23,35,30,.98)}.spinner{width:46px;height:46px;border:3px solid rgba(82,112,89,.2);border-top-color:#527059;border-radius:50%;animation:curveSpin 1s linear infinite}.generating-title{margin-top:22px;font-size:20px;font-weight:700;color:#243830}.generating-sub{margin-top:8px;color:#71807a;font-size:13px}.generating-time{margin-top:24px;color:#8b9489;font-size:11px}@keyframes curveSpin{to{transform:rotate(360deg)}}.entry-links{display:flex;justify-content:space-between;margin-top:16px;color:#527059;font-size:13px}.entry-hint{display:block;text-align:center;margin-top:10px;color:#8b9489;font-size:11px}.axis-y{display:block;color:#71807a;font-size:10px;margin:0 0 3px 12px}.entry-main{margin-top:24px}.draft-action{margin:0;min-height:46px;font-size:12px;padding:0 8px}.nav-row{align-items:center}.nav-row button{min-width:0}.entry-button{width:100%;min-height:44px;margin-top:10px;background:transparent;color:#527059;border:1px solid rgba(82,112,89,.22);border-radius:13px}.list-panel{min-height:260px}.empty-copy{display:block;text-align:center;color:#71807a;padding:42px 0}.saved-row{padding:14px 0;border-bottom:1px solid rgba(82,112,89,.14);color:#527059;font-size:13px}.saved-row text{display:block;margin-bottom:7px}.saved-row button{width:100%;margin-top:6px}.profile-step .age-input::placeholder{color:#9aa79e;opacity:.7}.answer-summary{margin:14px 0;padding:16px;border-radius:16px;background:rgba(255,255,255,.72);box-shadow:0 4px 16px rgba(33,58,47,.05)}.answer-summary>view{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(82,112,89,.12);font-size:11px;color:#71807a}.answer-summary strong{color:#243830;font-weight:600}.result-note{margin-top:14px;padding:14px 16px;border-left:3px solid #527059;background:#edf2eb;color:#527059}.result-note text{display:block;font-size:12px;line-height:1.7}.result-note text:first-child{font-weight:700}.chart-card{background:#fff;border:1px solid #e3e3e3}.chart{background:#fff;border-radius:10px}.grid-line{stroke:#d7d7d7}.curve-line{stroke:#111;stroke-width:3.2}.curve-dot{fill:#fff;stroke:#111}.draft-action{background:#fff!important;color:#243830!important;border:1px solid #dfe7df!important;margin:0;min-height:46px;line-height:46px}.ai-card{margin-top:14px;padding:18px;border-radius:18px;background:#fff;border:1px solid #e2e8df;box-shadow:0 4px 14px rgba(33,58,47,.05)}.ai-copy{display:block;color:#243830;font-size:13px;line-height:1.75;margin:8px 0}.ai-card .secondary{margin-top:10px;background:#edf2eb!important;color:#243830!important;border:0!important}.answer-summary{background:#fff;border:1px solid #e2e8df;color:#243830}.answer-summary>view{color:#243830;border-bottom-color:#e2e8df}.answer-summary>view text{color:#243830}.answer-summary strong{color:#111;font-weight:700}.result-note{background:#fff;color:#243830;border-left-color:#2d5b49;border-top:1px solid #e2e8df;border-right:1px solid #e2e8df;border-bottom:1px solid #e2e8df;border-radius:12px}.result-note text{color:#243830}.events-card{background:#fff;border:1px solid #e2e8df}.events-card .section-sub,.events-card .hint{color:#52605a}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.actions button{margin-top:0;min-height:46px}.nav-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:stretch}.nav-row button{width:100%!important;min-width:0!important;height:46px;min-height:46px;margin-top:0!important;padding:0 6px;line-height:46px;font-size:12px;align-self:stretch}.result-chart{background:#050505!important;border:1px solid #202020!important;color:#f4eee2;border-radius:20px;padding:18px 12px 12px}.chart-header{display:flex;justify-content:space-between;align-items:flex-start;padding:0 8px 8px}.chart-total{display:block;font-size:38px;line-height:1.05;font-weight:700;color:#f4eee2;letter-spacing:-1px}.chart-age{display:block;margin-top:8px;color:#c9c0b0;font-size:14px}.chart-caption{color:#988b70;font-size:12px;padding-top:8px}.result-chart .chart{height:230px;background:#050505;border-radius:0}.result-chart .grid-line{stroke:#373737;stroke-width:1;stroke-dasharray:3 5}.chart-baseline{stroke:#8a8173;stroke-width:1;stroke-dasharray:3 4}.result-chart .curve-line{stroke:#f1c66b;stroke-width:2.5;fill:none;filter:drop-shadow(0 0 3px rgba(241,198,107,.35))}.result-chart .curve-line.negative{stroke:#ff6b55;filter:drop-shadow(0 0 3px rgba(255,107,85,.35))}.result-chart .curve-line.positive{stroke:#f1c66b}.result-chart .curve-area{stroke:none}.result-chart .curve-area.positive{fill:rgba(241,198,107,.10)}.result-chart .curve-area.negative{fill:rgba(255,107,85,.16)}.result-chart .curve-dot{fill:#050505;stroke:#f1c66b;stroke-width:2}.event-marker{fill:#e3ab54;font-size:9px;text-anchor:middle}.axis-label{fill:#b9ad9c;font-size:9px;text-anchor:end}.result-chart .chart-labels{color:#b9ad9c}.result-chart .chart-labels text{color:#b9ad9c}.custom-option{border:1px dashed #9bb6a1;background:#f7faf5}.custom-input-row{display:flex;align-items:center;gap:8px;margin-top:8px;padding:10px 12px;border-radius:12px;background:#eef4ec}.custom-input{flex:1;min-width:0;height:38px;padding:0 10px;border:1px solid #cbdcca;border-radius:9px;background:#fff;color:#243830;font-size:14px}.custom-unit{color:#527059;font-size:13px;white-space:nowrap}.custom-confirm{height:38px;min-height:38px;line-height:38px;margin:0;padding:0 14px;border-radius:9px;background:#2d5b49;color:#fff;font-size:13px}.custom-confirm::after{border:none}.custom-option.selected{background:#dbead8;color:#1e4c39;font-weight:600}</style>
