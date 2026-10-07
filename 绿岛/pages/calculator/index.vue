<template>
  <view class="calculator-page">
    <view class="page-head">
      <button class="back" aria-label="返回" @click="back">‹</button>
      <text class="page-title">躺平倒计时</text>
      <view class="head-space"></view>
    </view>
    <text class="intro-title">{{ mode === 'fire' ? '计算你的自由日' : '为目标安排资金与时间' }}</text>
    <text class="intro-sub">按你填写的数据测算，修改后可重新计算。</text>
    <view class="mode-tabs" role="tablist">
      <button role="tab" :aria-selected="mode === 'fire'" :class="{ active: mode === 'fire' }" @click="switchMode('fire')">FIRE 退休模式</button>
      <button role="tab" :aria-selected="mode === 'goal'" :class="{ active: mode === 'goal' }" @click="switchMode('goal')">目标储蓄模式</button>
    </view>
    <text v-if="!configured && mode === 'fire'" class="empty-hint">先填写你的财务数据。没有数据时，不展示自由日或倒计时。</text>

    <view v-show="mode === 'fire'" class="form-panel">
      <view v-for="field in fireFields" :key="field.key" class="form-row">
        <label :for="'fire-' + field.key">{{ field.label }}</label>
        <view class="input-row">
          <input :id="'fire-' + field.key" v-model="fire[field.key]" type="text" :aria-label="field.label + '，' + field.unit" :placeholder="field.placeholder" :adjust-position="true" :cursor-spacing="32" @input="invalidate('fire')" />
          <text class="unit">{{ field.unit }}</text>
        </view>
      </view>
      <view class="form-row">
        <label for="passive">月被动收入（可选，仅用于诊断）</label>
        <view class="input-row"><input id="passive" v-model="fire.passive" type="text" aria-label="月被动收入，可选，元每月" placeholder="不填则保留原数据" :adjust-position="true" :cursor-spacing="32" @input="invalidate('fire')" /><text class="unit">元/月</text></view>
      </view>
      <text class="formula">FIRE 目标资产 = 退休后每月消费 × 12 ÷ 年度提取率。收益按月复利，每月存入在月末投入。</text>
    </view>

    <view v-show="mode === 'goal'" class="form-panel">
      <view class="form-row">
        <label for="goal-name">目标名称</label>
        <view class="input-row"><input id="goal-name" v-model="goal.name" type="text" aria-label="目标名称" placeholder="例如房子、车子或旅行" maxlength="60" :adjust-position="true" :cursor-spacing="32" @input="invalidate('goal')" /></view>
      </view>
      <view v-for="field in goalFields" :key="field.key" class="form-row">
        <label :for="'goal-' + field.key">{{ field.label }}</label>
        <view class="input-row"><input :id="'goal-' + field.key" v-model="goal[field.key]" type="text" :aria-label="field.label + '，' + field.unit" :placeholder="field.placeholder" :adjust-position="true" :cursor-spacing="32" @input="invalidate('goal')" /><text class="unit">{{ field.unit }}</text></view>
      </view>
      <text class="formula">目标资金单独记录，不修改自由计划资产。期望时间用于计算每月需要存入的金额。</text>
    </view>

    <view v-if="errors.length" class="error-panel" role="alert" aria-live="polite"><text v-for="message in errors" :key="message">{{ message }}</text></view>
    <button class="primary" :disabled="saving" @click="calculate">{{ saving ? '保存中…' : mode === 'fire' ? '计算并保存自由日' : '计算目标日' }}</button>

    <view v-if="result" class="result-panel">
      <text class="result-label">{{ mode === 'fire' ? '我的自由计划' : goal.name }}</text>
      <template v-if="result.date">
        <view class="countdown-line">
          <view v-for="part in countdownUnits" :key="part.id" class="countdown-unit">
            <text :key="part.id + ':' + part.value" class="countdown-number">{{ part.value }}</text><text class="countdown-label">{{ part.label }}</text>
          </view>
        </view>
        <text class="result-sub">剩余 {{ totalDays }} 天 · {{ result.months === 0 ? '已达到目标' : '预计到达 ' + dateText(result.date) }}</text>
      </template>
      <text v-else class="unreachable">当前假设下，100 年内暂未达到目标</text>
      <view class="progress"><view class="progress-fill" :style="{width:result.progress + '%'}"></view></view>
      <view class="result-row"><text>当前进度</text><text>{{ result.progress.toFixed(1) }}%</text></view>
      <view class="result-row"><text>{{ mode === 'fire' ? '当前资产' : '为目标已准备' }}</text><text>{{ money(resultAssets) }} 元</text></view>
      <view class="result-row"><text>{{ mode === 'fire' ? 'FIRE 目标门槛' : '目标金额' }}</text><text>{{ money(result.target) }} 元</text></view>
      <view class="result-row"><text>每月存入</text><text>{{ money(result.monthlySaving) }} 元/月</text></view>
      <template v-if="mode === 'goal'">
        <view class="result-row"><text>期望时间</text><text>{{ calculatedGoal.expectedMonths }} 个月</text></view>
        <view class="result-row"><text>按期达成需要存入</text><text>{{ money(Math.ceil(result.requiredMonthly * 100) / 100) }} 元/月</text></view>
        <view class="result-row"><text>期望日期预计资金</text><text>{{ money(result.projectedAtExpected) }} 元</text></view>
        <text class="result-sub">{{ result.onTime ? '按当前计划可在期望时间内达到' : '当前计划未达到期望时间，请调整存入金额或时间' }}</text>
        <button class="primary" :disabled="saving" @click="publishGoal">更新目标到首页</button>
        <text class="formula">仅计算会保存目标草稿；确认更新后，首页才展示这项目标。</text>
      </template>
      <template v-else>
        <button class="secondary" @click="showDiagnosis = !showDiagnosis">{{ showDiagnosis ? '收起' : '查看' }} PRO 深度诊断</button>
        <view v-if="showDiagnosis" class="diagnosis">
          <view class="result-row"><text>被动收入覆盖度</text><text>{{ coverage === null ? '未填写' : coverage.toFixed(1) + '%' }}</text></view>
          <view class="result-row"><text>月储蓄率</text><text>{{ savingsRate === null ? '未填写月收入' : savingsRate.toFixed(1) + '%' }}</text></view>
          <view class="result-row"><text>收益率降低 2 个百分点</text><text>{{ conservative.years === null ? '100 年内暂未可达' : conservative.years + ' 年' }}</text></view>
          <text class="formula">覆盖度使用被动收入 ÷ 退休后每月消费；储蓄率使用每月存入 ÷ 已记录月收入。收益敏感性仍使用同一 FIRE 引擎。</text>
        </view>
      </template>
      <button class="secondary" @click="goHome">返回首页</button>
      <text class="formula">固定收益和存入假设，不计税费与通胀。</text>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref, onUnmounted } from 'vue'
import { onLoad, onShow, onHide, onUnload, onBackPress } from '@dcloudio/uni-app'
import { state, refreshFinance, persistNow } from '@/store/index.js'
import { FireEngine, GoalEngine, ReelCalendarParts, ReelParts } from '@/utils/engine.js'
import { validateFireForm, validateGoalForm, hasValidFinance, freedomResult, createFreedomPlan } from '@/utils/finance-plan.js'

const mode = ref('fire'), errors = ref([]), saving = ref(false), showDiagnosis = ref(false)
const fire = reactive({assets:'',monthlyDeposit:'',retirementExpense:'',rate:'',withdrawal:'4',passive:''})
const goal = reactive({name:'',assets:'',amount:'',monthlyDeposit:'',expectedMonths:'',rate:''})
const fireFields = [
  {key:'assets',label:'当前可投资资产',unit:'元',placeholder:'请输入当前资产，可填0'},
  {key:'monthlyDeposit',label:'每月存入金额',unit:'元/月',placeholder:'请输入每月存入，可填0'},
  {key:'retirementExpense',label:'退休后每月消费',unit:'元/月',placeholder:'请输入退休后每月消费'},
  {key:'rate',label:'预期年化收益率',unit:'%/年',placeholder:'请输入收益率，可填0'},
  {key:'withdrawal',label:'退休后年度提取率',unit:'%/年',placeholder:'计算假设，默认4'},
]
const goalFields = [
  {key:'assets',label:'为目标已准备的金额',unit:'元',placeholder:'请输入已准备金额，可填0'},
  {key:'amount',label:'目标金额',unit:'元',placeholder:'请输入目标金额'},
  {key:'monthlyDeposit',label:'每月存入金额',unit:'元/月',placeholder:'请输入每月存入，可填0'},
  {key:'expectedMonths',label:'期望多久达到',unit:'个月',placeholder:'请输入整数个月'},
  {key:'rate',label:'预期年化收益率',unit:'%/年',placeholder:'请输入收益率，可填0'},
]
const fireResult = ref(null), goalResult = ref(null), calculatedGoal = ref(null), now = ref(Date.now())
const configured = computed(() => hasValidFinance(state))
const result = computed(() => mode.value === 'fire' ? fireResult.value : goalResult.value)
const resultAssets = computed(() => mode.value === 'fire' ? state.finance.assets : calculatedGoal.value.assets)
const parts = computed(() => result.value && result.value.date ? ReelCalendarParts(result.value.date, now.value) : null)
const totalDays = computed(() => result.value && result.value.date ? ReelParts(result.value.date, now.value).days : null)
const countdownUnits = computed(() => parts.value ? [
  {id:'years',value:parts.value.years,label:'年'},{id:'months',value:parts.value.months,label:'个月'},
  {id:'days',value:parts.value.days,label:'天'},{id:'hours',value:parts.value.hours,label:'时'},
  {id:'minutes',value:parts.value.minutes,label:'分'},{id:'seconds',value:parts.value.seconds,label:'秒'},
] : [])
const coverage = computed(() => {
  const p = state.profile && state.profile.passive, expense = Number(state.finance.retirementExpense)
  return Number.isFinite(p) && expense > 0 ? p / expense * 100 : null
})
const savingsRate = computed(() => Number(state.finance.income) > 0 ? state.finance.monthlyDeposit / state.finance.income * 100 : null)
const conservative = computed(() => FireEngine({...state.finance,rate:Math.max(-50,state.finance.rate - 2)}))
let timer = null, visible = false, navigating = false
function switchMode(next) { mode.value = next; errors.value = []; now.value = Date.now() }
function invalidate(which) {
  errors.value = []
  if (which === 'fire') fireResult.value = null
  else { goalResult.value = null; calculatedGoal.value = null }
}
function money(value) { return Number(value).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function dateText(date) { return date.toLocaleDateString('zh-CN') }
function stopClock() { if (timer !== null) clearInterval(timer); timer = null }
function startClock() {
  stopClock()
  if (!visible) return
  // #ifdef H5
  if (typeof document !== 'undefined' && document.hidden) return
  // #endif
  now.value = Date.now()
  timer = setInterval(() => { now.value = Date.now() }, 1000)
}
function handleVisibility() {
  // #ifdef H5
  if (document.hidden) stopClock(); else startClock()
  // #endif
}
function returnToTools() { uni.reLaunch({url:'/pages/tools/index',complete:()=>{navigating=false}}) }
function back() {
  if (navigating) return
  navigating = true
  const pages = getCurrentPages()
  if (pages.length > 1) uni.navigateBack({delta:1,fail:returnToTools,success:()=>{navigating=false}})
  else returnToTools()
}
function goHome() { uni.reLaunch({url:'/pages/index/index'}) }

function calculate() {
  if (saving.value) return
  const parsed = mode.value === 'fire' ? validateFireForm(fire) : validateGoalForm(goal)
  errors.value = parsed.errors
  if (errors.value.length) return
  saving.value = true
  if (mode.value === 'fire') {
    const oldFinance = state.finance, oldProfile = state.profile, oldPlan = state.freedomPlan, oldEntered = state.financeEntered
    state.finance = {...state.finance,...parsed.finance}
    if ('passive' in parsed.optional) state.profile = {...state.profile,passive:parsed.optional.passive}
    state.financeEntered = true
    state.freedomPlan = createFreedomPlan(state.finance)
    if (persistNow()) {
      fireResult.value = freedomResult(state)
      uni.showToast({title:'自由计划已保存',icon:'none'})
    } else {
      state.finance = oldFinance; state.profile = oldProfile; state.freedomPlan = oldPlan; state.financeEntered = oldEntered
      errors.value = ['保存失败，请检查设备存储后重试']
    }
  } else {
    const old = state.goalDraft
    const plan = {...parsed.plan,calculatedAt:Date.now()}
    state.goalDraft = plan
    if (persistNow()) {
      calculatedGoal.value = plan; goalResult.value = GoalEngine(plan)
      uni.showToast({title:'目标草稿已保存',icon:'none'})
    } else { state.goalDraft = old; errors.value = ['保存失败，请检查设备存储后重试'] }
  }
  now.value = Date.now()
  saving.value = false
}
function publishGoal() {
  if (!calculatedGoal.value || !goalResult.value || saving.value) return
  saving.value = true
  const old = state.goalPlan
  const plan = {...calculatedGoal.value,progress:goalResult.value.progress,targetDate:goalResult.value.date ? dateText(goalResult.value.date) : '100年内暂未可达'}
  state.goalPlan = plan
  if (persistNow()) uni.showToast({title:'目标已更新到首页',icon:'none'})
  else { state.goalPlan = old; errors.value = ['保存失败，请重试'] }
  saving.value = false
}
onLoad(options => {
  refreshFinance()
  mode.value = options && options.mode === 'goal' ? 'goal' : 'fire'
  if (configured.value) {
    for (const key of ['assets','monthlyDeposit','retirementExpense','rate','withdrawal']) fire[key] = String(state.finance[key])
    fire.passive = state.profile && Number.isFinite(state.profile.passive) ? String(state.profile.passive) : ''
    fireResult.value = freedomResult(state)
  }
  const saved = state.goalDraft || state.goalPlan
  if (saved) {
    for (const key of Object.keys(goal)) goal[key] = saved[key] == null ? '' : String(saved[key])
    const parsed = validateGoalForm(goal)
    if (!parsed.errors.length) {
      calculatedGoal.value = {...saved,...parsed.plan}
      goalResult.value = GoalEngine(calculatedGoal.value)
    }
  }
  // #ifdef H5
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange',handleVisibility)
  if (typeof window !== 'undefined') { window.addEventListener('pageshow',startClock); window.addEventListener('pagehide',stopClock) }
  // #endif
})
onShow(() => { visible = true; startClock() })
onHide(() => { visible = false; stopClock() })
function cleanup() {
  visible = false
  stopClock()
  // #ifdef H5
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange',handleVisibility)
  if (typeof window !== 'undefined') { window.removeEventListener('pageshow',startClock); window.removeEventListener('pagehide',stopClock) }
  // #endif
}
onUnload(cleanup)
onUnmounted(cleanup)
onBackPress(event => {
  if (event && event.from === 'navigateBack') return false
  if (getCurrentPages().length > 1) return false
  back()
  return true
})
</script>

<style lang="scss" scoped>
.calculator-page { min-height:100vh; box-sizing:border-box; padding:calc(24px + env(safe-area-inset-top)) 24px calc(32px + env(safe-area-inset-bottom)); background:#f3f4f2; color:#243830; }
.page-head { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
.back,.head-space { width:44px; min-height:44px; flex-shrink:0; }
.back { display:flex; align-items:center; justify-content:center; padding:0; border:0; background:transparent; color:#243830; font-size:30px; }
.page-title { flex:1; font-size:18px; font-weight:600; }
.intro-title,.intro-sub,.empty-hint,.formula,.result-label,.result-sub,.unreachable { display:block; }
.intro-title { font-size:25px; font-weight:700; color:#173d35; }
.intro-sub { color:#71807a; font-size:13px; line-height:1.8; margin-top:8px; }
.mode-tabs { display:flex; gap:4px; padding:4px; margin:24px 0 16px; border-radius:12px; background:#e7ede5; }
button { min-height:44px; min-width:44px; display:flex; align-items:center; justify-content:center; line-height:1.4; font-size:14px; border-radius:10px; border:0; transition:transform 180ms ease,opacity 180ms ease; }
button::after { border:0; }
button:active { transform:scale(.98); }
button[disabled] { opacity:.5; }
.mode-tabs button { flex:1; margin:0; padding:8px 4px; background:transparent; color:#71807a; font-size:13px; }
.mode-tabs .active { background:#fff; color:#173d35; font-weight:600; box-shadow:0 1px 3px rgba(23,61,53,.04); }
.empty-hint { margin:12px 0; color:#71807a; font-size:13px; line-height:1.8; }
.form-panel,.result-panel { background:#fff; border:1px solid #e7eee7; border-radius:16px; padding:20px 16px; }
.form-row + .form-row { margin-top:18px; }
.form-row label { display:block; font-size:14px; margin-bottom:8px; }
.input-row { display:flex; align-items:center; gap:8px; padding:10px 12px; min-height:44px; box-sizing:border-box; background:#fafbf8; border:1px solid #dde7dd; border-radius:10px; }
.input-row:focus-within { border-color:#4f8068; }
.input-row input { flex:1; min-width:0; height:28px; font-size:16px; color:#173d35; pointer-events:auto; }
.unit { flex-shrink:0; color:#71807a; font-size:12px; }
.formula { margin-top:14px; color:#71807a; font-size:12px; line-height:1.8; }
.primary,.secondary { width:100%; margin:18px 0 0; padding:12px 16px; }
.primary { background:#173d35; color:#fff; }
.secondary { background:#eef2e8; color:#173d35; }
.error-panel { margin-top:16px; padding:12px; background:#fff2ed; color:#995147; border-radius:10px; }
.error-panel text { display:block; font-size:13px; line-height:1.8; }
.result-panel { margin-top:24px; }
.result-label { font-size:18px; font-weight:600; }
.countdown-line { display:flex; flex-wrap:wrap; gap:8px 12px; margin:20px 0 12px; }
.countdown-unit { display:flex; align-items:baseline; gap:3px; }
.countdown-number { display:inline-block; min-width:2ch; font-size:24px; font-weight:600; font-variant-numeric:tabular-nums; animation:numberFade .24s ease; }
.countdown-label { font-size:12px; color:#71807a; }
.result-sub,.unreachable { font-size:13px; line-height:1.8; color:#71807a; }
.progress { margin:20px 0 8px; height:6px; border-radius:6px; background:#dfe8db; overflow:hidden; }
.progress-fill { height:100%; border-radius:6px; background:#527059; }
.result-row { display:flex; justify-content:space-between; gap:12px; padding:10px 0; font-size:13px; line-height:1.7; }
.result-row text:last-child { text-align:right; }
.diagnosis { margin-top:14px; border-top:1px solid #e7eee7; }
@keyframes numberFade { 0% { opacity:.3; } 100% { opacity:1; } }
@media (prefers-reduced-motion:reduce) { button { transition:none; } button:active { transform:none; } .countdown-number { animation:none; } }
</style>
