<template>
  <view class="curve-page" :class="{ dark: darkMode }">
    <view class="topbar">
      <view><text class="eyebrow">FIRE 工具</text><text class="title">普通人一生存款曲线</text></view>
      <text class="close" @tap="close">×</text>
    </view>

    <view class="intro-card" v-if="!started">
      <text class="intro-title">看见钱会怎样走</text>
      <text class="intro-copy">用 100 道简单选择题，估算从现在到预期寿命的存款变化。</text>
      <view class="intro-row"><text>本地计算</text><text>不上传财务数据</text><text>可随时修改</text></view>
      <view class="field-row">
        <text>你的当前年龄</text>
        <input v-model.number="age" type="number" class="age-input" />
        <text>岁</text>
      </view>
      <view class="field-row">
        <text>预计寿命</text>
        <input v-model.number="lifeExpectancy" type="number" class="age-input" />
        <text>岁</text>
      </view>
      <button class="primary" @tap="start">开始回答</button>
    </view>

    <view v-else>
      <view class="progress-row"><text>第 {{ questionIndex + 1 }} / {{ visibleQuestions.length }} 题</text><text>{{ Math.round((questionIndex + 1) / visibleQuestions.length * 100) }}%</text></view>
      <view class="question-card" v-if="currentQuestion">
        <text class="question-tag">{{ currentQuestion.tag }}</text>
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
        <view class="chart-card">
          <svg class="chart" viewBox="0 0 360 190" preserveAspectRatio="none">
            <line v-for="y in [25,70,115,160]" :key="y" x1="28" :y1="y" x2="350" :y2="y" class="grid-line" />
            <polyline :points="chartPoints" class="curve-line" />
            <circle v-for="p in chartDots" :key="p.age" :cx="p.x" :cy="p.y" r="3.5" class="curve-dot" />
          </svg>
          <view class="chart-labels"><text>{{ age }}岁</text><text>{{ lifeExpectancy }}岁</text></view>
        </view>
        <view class="summary-grid"><view><text>预计峰值</text><strong>¥{{ formatMoney(peakBalance) }}</strong></view><view><text>最低余额</text><strong>¥{{ formatMoney(minBalance) }}</strong></view><view><text>退休时</text><strong>¥{{ formatMoney(retirementBalance) }}</strong></view></view>

        <view class="events-card">
          <view class="section-head"><view><text class="section-title">自定义人生事件</text><text class="section-sub">最多添加 5 个，实时影响曲线</text></view><text class="count">{{ customEvents.length }}/5</text></view>
          <view v-for="(event, i) in customEvents" :key="i" class="event-row">
            <input v-model.number="event.age" type="number" placeholder="年龄" />
            <input v-model.number="event.amount" type="number" placeholder="金额" />
            <input v-model.number="event.duration" type="number" placeholder="年限" />
            <text @tap="removeEvent(i)">×</text>
          </view>
          <button v-if="customEvents.length < 5" class="event-add" @tap="addEvent">＋ 添加事件</button>
          <text class="hint">正数表示收入，负数表示支出。</text>
        </view>

        <view class="actions"><button class="secondary" @tap="save">保存到本机</button><button class="primary" @tap="recalculate">重新计算</button></view>
        <text class="privacy">数据只保存在本机，不会上传服务器。</text>
      </view>
    </view>
    <BottomTabs current="tools" />
  </view>
</template>

<script>
import BottomTabs from '@/components/BottomTabs.vue'

const OPTION_SETS = {
  money: [{ label: '没有 / 0 元', value: 0 }, { label: '1 千以内', value: 500 }, { label: '1–5 千', value: 3000 }, { label: '5 千–2 万', value: 12000 }, { label: '2 万以上', value: 30000 }],
  income: [{ label: '没有收入', value: 0 }, { label: '每月 3 千以内', value: 2500 }, { label: '每月 3–8 千', value: 5500 }, { label: '每月 8 千–2 万', value: 14000 }, { label: '每月 2 万以上', value: 25000 }],
  rate: [{ label: '几乎不存', value: 0.05 }, { label: '存下两成', value: 0.2 }, { label: '存下一半', value: 0.5 }, { label: '存下七成', value: 0.7 }, { label: '大部分都存', value: 0.9 }],
  years: [{ label: '还没有计划', value: 0 }, { label: '1–3 年', value: 2 }, { label: '4–8 年', value: 6 }, { label: '9–15 年', value: 12 }, { label: '15 年以上', value: 20 }],
  ratePercent: [{ label: '0%', value: 0 }, { label: '1–2%', value: 0.015 }, { label: '3–4%', value: 0.035 }, { label: '5–7%', value: 0.06 }, { label: '8%以上', value: 0.08 }],
}

function makeQuestions() {
  const questions = []
  const youth = ['每年压岁钱大约有多少？', '每月零花钱大约有多少？', '你愿意把多少零花钱存起来？', '教育金或兴趣班每年大约花多少？', '你希望成年前存下多少钱？', '每年收到的礼物和红包大约多少？', '你每年用于学习的支出是多少？', '你愿意为兴趣爱好存多久？', '家庭希望为你准备多少教育金？', '你想为第一个目标存多少钱？']
  const adult = ['你目前的存款大约是多少？', '你每月到手收入大约是多少？', '每月收入中你能存下多少？', '你每月固定生活支出大约多少？', '你计划几年后买房？', '首付预算大约是多少？', '你计划几年后结婚？', '婚礼和彩礼预算大约多少？', '你计划几年后要孩子？', '孩子每年教育支出大约多少？', '你希望几年内还清房贷？', '父母医疗储备目标是多少？', '你希望退休时存下多少钱？', '你预计收入每年增长多少？', '你愿意承担多大投资波动？', '你每年旅行和娱乐支出多少？', '你每年保险支出多少？', '你希望每年给自己留多少自由支出？', '你是否有长期副业收入？', '你愿意为学习提升投入多少？']
  const later = ['房贷还剩多少年？', '子女教育金还缺多少？', '父母养老储备还缺多少？', '退休后每月希望花多少？', '你预计还会工作多少年？', '未来十年每年能存多少？', '你希望留下多少应急金？', '你是否计划换房？', '你是否计划帮助子女买房？', '你希望给家庭留下多少资产？']
  for (let i = 0; i < 100; i++) {
    let text
    let type = 'money'
    let tag = '基础情况'
    if (i < 10) { text = youth[i]; tag = '成长阶段'; type = i === 2 ? 'rate' : 'money' }
    else if (i < 80) { text = adult[(i - 10) % adult.length]; tag = i < 35 ? '青年阶段' : i < 60 ? '家庭阶段' : '长期规划'; type = [1, 19, 34, 48, 63, 77].includes(i) ? 'income' : [2, 13, 33, 54, 68].includes(i) ? 'rate' : [4, 10, 22, 44, 55, 70].includes(i) ? 'years' : [14, 28, 42, 66].includes(i) ? 'ratePercent' : 'money' }
    } else { text = later[(i - 80) % later.length]; tag = '中后期规划'; type = [84, 85, 88].includes(i) ? 'years' : i === 83 ? 'income' : 'money' }
    questions.push({ id: 'q' + (i + 1), text, tag, type, options: OPTION_SETS[type] })
  }
  return questions
}

export default {
  components: { BottomTabs },
  data() { return { age: 28, lifeExpectancy: 85, started: false, questionIndex: 0, answers: {}, showResult: false, darkMode: false, customEvents: [], questions: makeQuestions(), curve: [] } },
  computed: {
    visibleQuestions() { return this.questions.filter(q => this.age >= 20 || q.tag === '成长阶段' || q.tag === '基础情况') },
    currentQuestion() { return this.visibleQuestions[this.questionIndex] },
    chartPoints() { return this.curve.length ? this.curve.map((p, i) => (28 + i * 322 / Math.max(1, this.curve.length - 1)).toFixed(1) + ',' + (160 - (p.balance - this.minBalance) / Math.max(1, this.peakBalance - this.minBalance) * 135).toFixed(1)).join(' ') : '' },
    chartDots() { if (!this.curve.length) return []; const step = Math.max(1, Math.floor(this.curve.length / 5)); return this.curve.filter((p, i) => i % step === 0 || i === this.curve.length - 1).map((p, i) => ({ age: p.age, x: 28 + this.curve.indexOf(p) * 322 / Math.max(1, this.curve.length - 1), y: 160 - (p.balance - this.minBalance) / Math.max(1, this.peakBalance - this.minBalance) * 135 })) },
    peakBalance() { return this.curve.length ? Math.max(...this.curve.map(p => p.balance)) : 0 },
    minBalance() { return this.curve.length ? Math.min(...this.curve.map(p => p.balance)) : 0 },
    retirementBalance() { return this.curve.length ? this.curve[this.curve.length - 1].balance : 0 },
  },
  methods: {
    close() { uni.navigateBack() },
    start() { this.age = Math.max(8, Math.min(90, Number(this.age) || 28)); this.lifeExpectancy = Math.max(this.age + 1, Math.min(110, Number(this.lifeExpectancy) || 85)); this.started = true },
    choose(value) { if (this.currentQuestion) this.answers[this.currentQuestion.id] = value },
    previous() { if (this.questionIndex > 0) this.questionIndex-- },
    next() { if (this.questionIndex < this.visibleQuestions.length - 1) { this.questionIndex++; return } this.recalculate() },
    value(type, fallback) { const q = this.questions.find(x => x.type === type); return q && this.answers[q.id] !== undefined ? Number(this.answers[q.id]) : fallback },
    recalculate() {
      const startSavings = this.value('money', 3000)
      const income = this.value('income', 8000)
      const saveRate = this.value('rate', 0.3)
      const expense = Math.max(0, this.value('money', 3000) * 0.45)
      const growth = this.value('ratePercent', 0.035)
      const inflation = 0.025
      const years = Math.max(1, this.lifeExpectancy - this.age)
      let balance = startSavings
      const rows = []
      for (let i = 0; i <= years; i++) {
        const currentAge = this.age + i
        const eventTotal = this.customEvents.filter(e => Number(e.age) === currentAge).reduce((sum, e) => sum + Number(e.amount || 0), 0)
        const annualIncome = income * 12 * Math.pow(1 + growth, i)
        const annualExpense = expense * 12 * Math.pow(1 + inflation, i)
        balance = balance * 1.035 + annualIncome * saveRate - annualExpense + eventTotal
        rows.push({ age: currentAge, balance: Math.round(balance) })
      }
      this.curve = rows
      this.showResult = true
      uni.setStorageSync('fire_savings_curve_v1', { age: this.age, lifeExpectancy: this.lifeExpectancy, answers: this.answers, events: this.customEvents, updatedAt: Date.now() })
    },
    addEvent() { this.customEvents.push({ age: this.age + 5, amount: 0, duration: 1 }) },
    removeEvent(index) { this.customEvents.splice(index, 1); this.recalculate() },
    save() { this.recalculate(); uni.showToast({ title: '已保存到本机', icon: 'success' }) },
    formatMoney(value) { return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 }) },
  },
  onLoad() {
    const saved = uni.getStorageSync('fire_savings_curve_v1')
    if (saved) { this.age = saved.age || 28; this.lifeExpectancy = saved.lifeExpectancy || 85; this.answers = saved.answers || {}; this.customEvents = saved.events || [] }
  },
}
</script>

<style>
.curve-page{min-height:100vh;padding:calc(22px + env(safe-area-inset-top)) 18px 120px;background:#f7f6f1;color:#243830;box-sizing:border-box}.dark{background:#17231e;color:#e8efe8}.topbar{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}.eyebrow{display:block;font-size:12px;color:#6c8c77;margin-bottom:5px}.title{display:block;font-size:23px;font-weight:700}.close{font-size:30px;line-height:1;color:#355f4f;padding:0 6px}.intro-card,.question-card,.chart-card,.events-card{background:rgba(255,255,255,.82);border-radius:20px;padding:20px;box-shadow:0 8px 24px rgba(33,58,47,.07)}.dark .intro-card,.dark .question-card,.dark .chart-card,.dark .events-card{background:#21352b}.intro-title{display:block;font-size:25px;font-weight:700;margin-bottom:9px}.intro-copy,.section-sub,.privacy,.hint{display:block;color:#71807a;font-size:13px;line-height:1.7}.intro-row{display:flex;justify-content:space-between;margin:18px 0;color:#527059;font-size:11px}.field-row{display:flex;align-items:center;gap:8px;padding:13px 0;border-bottom:1px solid rgba(80,110,90,.12);font-size:14px}.age-input{width:70px;padding:7px 10px;text-align:center;border-radius:10px;border:1px solid #dce8dc;background:#fff;color:#243830}.primary,.secondary,.event-add{border-radius:13px;padding:0 18px;min-height:46px;margin-top:18px;line-height:46px;font-size:14px}.primary{background:#2d5b49;color:#fff}.secondary{background:#edf2eb;color:#355f4f}.small{min-width:130px}.progress-row{display:flex;justify-content:space-between;color:#6c8c77;font-size:12px;margin-bottom:10px}.question-tag{display:block;color:#6c8c77;font-size:12px;margin-bottom:10px}.question-title{display:block;font-size:22px;font-weight:700;line-height:1.45;margin-bottom:18px}.options{display:flex;flex-direction:column;gap:9px}.option{display:flex;align-items:center;gap:10px;padding:13px;border-radius:13px;background:#f1f5ee;color:#405a4b;font-size:14px}.option.selected{background:#dbead8;color:#1e4c39;font-weight:600}.option-dot{width:24px;height:24px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px}.nav-row{display:flex;justify-content:space-between;gap:12px}.nav-row button{flex:1}.result-area{margin-top:28px}.section-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}.section-title{display:block;font-size:19px;font-weight:700}.theme-toggle,.count{color:#527059;font-size:12px;padding-top:4px}.chart-card{padding:14px 12px 10px}.chart{width:100%;height:190px;display:block}.grid-line{stroke:#dbe5dc;stroke-width:1}.curve-line{fill:none;stroke:#3b7557;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.curve-dot{fill:#f7f6f1;stroke:#3b7557;stroke-width:2}.chart-labels{display:flex;justify-content:space-between;color:#71807a;font-size:11px}.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.summary-grid view{padding:12px 8px;border-radius:14px;background:#edf2eb}.summary-grid text,.summary-grid strong{display:block}.summary-grid text{font-size:11px;color:#71807a}.summary-grid strong{font-size:14px;color:#2d5b49;margin-top:5px}.events-card{margin-top:14px}.event-row{display:grid;grid-template-columns: .8fr 1fr .8fr 24px;gap:6px;margin:8px 0}.event-row input{min-width:0;padding:9px 5px;text-align:center;border:1px solid #dce8dc;border-radius:9px;font-size:12px}.event-row text{font-size:22px;color:#8c6a62;text-align:center}.event-add{width:100%;background:#f1f5ee;color:#527059;border:1px dashed #b8cdbb;margin-top:8px}.actions{display:flex;gap:10px;margin-top:16px}.actions button{flex:1}.privacy{text-align:center;margin-top:15px;font-size:11px}@media (prefers-color-scheme:dark){.curve-page:not(.dark){background:#17231e;color:#e8efe8}.curve-page:not(.dark) .intro-card,.curve-page:not(.dark) .question-card,.curve-page:not(.dark) .chart-card,.curve-page:not(.dark) .events-card{background:#21352b}}
</style>
