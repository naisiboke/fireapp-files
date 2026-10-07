<template>
  <view class="home-view">

    <view class="home-masthead">
      <view class="masthead-bg" :style="mastheadBgStyle"></view>
      <view class="masthead-fade"></view>

      <view class="masthead-title">
        <text class="masthead-h1">我的自由计划</text>
        <text class="masthead-date">{{ todayText }}</text>
      </view>

      <view v-if="!financeConfigured" class="home-unconfigured">
        <text class="unconfigured-label">从了解自己开始</text>
        <text class="unconfigured-sub">自由日：待填写 · 剩余年份：待填写</text>
        <text class="unconfigured-sub">当前资产：待填写</text>
        <text class="unconfigured-h2">先填写你的财务数据</text>
        <text class="unconfigured-sub">填写资产、每月存入和退休后消费，就能看到你的自由日与计划进度。</text>
        <view class="btn-primary" @tap="goCalculator">
          <text class="btn-primary-text">填写财务数据</text>
        </view>
      </view>

      <view v-else class="freedom-summary" @tap="goResult">
        <view class="freedom-head">
          <text class="freedom-label">预计自由日</text>
          <text class="plan-link">查看计划 ›</text>
        </view>

        <view v-if="fireResult.date" class="day-countdown">
          <view class="calendar-unit">
            <AnimatedNumber class="calendar-num" :value="years" />
            <text class="calendar-label">年</text>
          </view>
          <view class="calendar-unit">
            <AnimatedNumber class="calendar-num" :value="months" />
            <text class="calendar-label">个月</text>
          </view>
          <view class="calendar-unit">
            <AnimatedNumber class="calendar-num" :value="days" />
            <text class="calendar-label">日</text>
          </view>
        </view>

        <view v-if="fireResult.date" class="countdown-clock">
          <view class="clock-unit"><AnimatedNumber class="clock-num" :value="pad(hours)" /><text class="clock-label">时</text></view>
          <view class="clock-unit"><AnimatedNumber class="clock-num" :value="pad(minutes)" /><text class="clock-label">分</text></view>
          <view class="clock-unit"><AnimatedNumber class="clock-num" :value="pad(seconds)" /><text class="clock-label">秒</text></view>
        </view>

        <text class="countdown-target">{{ targetText }}</text>

        <view class="progress"><view class="progress-fill" :style="{ width: fireResult.progress + '%' }"></view></view>

        <view class="freedom-foot">
          <text class="foot-left">当前资产 ¥ {{ formatMoney(state.finance.assets) }}</text>
          <text class="foot-right">进度 {{ fireResult.progress.toFixed(1) }}%</text>
        </view>
      </view>
    </view>

    <view v-if="homeGoal && homeGoal.name" class="goal-card goal-card-mini" @tap="goGoal">
      <text class="goal-card-name">{{ homeGoal.name }}</text>
      <text class="goal-card-meta">{{ homeGoal.remainingDays !== null ? '还剩 ' + homeGoal.remainingDays + ' 天' : '目标进度 ' + homeGoal.progress.toFixed(0) + '%' }}</text>
      <view class="goal-card-progress"><view class="goal-card-progress-fill" :style="{ width: (homeGoal.progress || 0) + '%' }"></view></view>
    </view>

    <view class="home-content">

      <view class="home-metrics">
        <view class="metric" @tap="goLedger">
          <text class="metric-label">本月消费 ›</text>
          <text class="metric-value metric-expense">{{ financeConfigured ? '¥ ' + formatAmount(expenseTotal / 100) : '待填写' }}</text>
        </view>
        <view class="metric" @tap="goLedger">
          <text class="metric-label">本月收入 ›</text>
          <text class="metric-value metric-income">{{ financeConfigured ? '¥ ' + formatAmount(incomeTotal / 100) : '待填写' }}</text>
        </view>
        <view class="metric">
          <text class="metric-label">拔草已省下</text>
          <text class="metric-value">{{ financeConfigured ? '¥ ' + formatAmount(wishlistSaved) : '待填写' }}</text>
        </view>
      </view>

      <view v-if="wishlistCount" class="wishlist-home-card">
        <view class="wishlist-home-head"><text class="section-title">我的拔草</text><text class="wishlist-home-count">{{ wishlistCount }} 项进行中</text></view>
        <view v-for="item in wishlistPreview" :key="item.id" class="wishlist-home-row" @tap="goWishlist">
          <view class="wishlist-home-copy"><text class="wishlist-home-name">{{ item.name }}</text><text class="wishlist-home-sub">¥ {{ formatMoney(item.amount) }} · {{ wishlistStatus(item) }}</text></view>
          <text class="wishlist-home-arrow">›</text>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="section-title">今日行动</text>
          <text class="section-count">{{ todayCount }} / 3</text>
        </view>

        <view
          v-for="t in todayTasks"
          :key="t.id"
          class="task-row"
          :class="{ 'task-row-done': taskDone(t.id) }"
          @tap="goTask(t)"
        >
          <view class="task-icon">
            <image class="task-icon-img" :src="taskIcon(t.id)" mode="aspectFit" />
          </view>
          <view class="task-text">
            <text class="task-title">{{ t.title }}</text>
            <text class="task-sub">{{ taskLabel(t) }} · {{ taskDone(t.id) ? '今天已完成' : '完成操作后自动记录' }}</text>
          </view>
          <text class="task-reward" :class="{ done: taskDone(t.id) }">
            {{ taskDone(t.id) ? '✓ +10 EXP' : '去完成 ›' }}
          </text>
        </view>
      </view>

      <text class="safe-note">F.I.R.E · 让选择回到自己手中</text>
    </view>
    <BottomTabs current="home" />
  </view>
</template>

<script>
import BottomTabs from '@/components/BottomTabs.vue'
import AnimatedNumber from '@/components/AnimatedNumber.vue'
import { state, refreshFinance } from '@/store/index.js'
import { freedomResult, hasValidFinance } from '@/utils/finance-plan.js'
import { GoalEngine, LedgerSummary, ReelCalendarParts } from '@/utils/engine.js'

const TASK_ICONS = {
  ledger:   'M5 3h14v18l-3-2-4 2-4-2-3 2zM8 7h8M8 11h8M8 15h5',
  assets:   'm3 10 9-7 9 7v10H3zM9 20v-7h6v7',
  savings:  'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  wishlist: 'M7 7V5a5 5 0 0 1 10 0v2M3 7h18v14H3zm5 7 3 3 5-5',
  read:     'M12 22V12M12 16C3 16 3 8 3 8s9-1 9 8M12 12c0-9 9-9 9-9s1 9-9 9',
}

function svgUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

export default {
  components: { BottomTabs, AnimatedNumber },
  data() {
    return {
      state,
      years: 0, months: 0, days: 0,
      hours: 0, minutes: 0, seconds: 0,
      timer: null,
      timeout: null,
      raf: null,
      visibilityHandler: null,
      pageShowHandler: null,
      pageHideHandler: null,
      pageVisible: false,
    }
  },

  computed: {
    todayText() {
      return new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
    },
    mastheadBgStyle() {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1e4032"/>
            <stop offset="0.55" stop-color="#456b56"/>
            <stop offset="1" stop-color="#6d8c73"/>
          </linearGradient>
          <radialGradient id="sun" cx="0.82" cy="0.18" r="0.35">
            <stop offset="0" stop-color="#e4eed9" stop-opacity="0.55"/>
            <stop offset="1" stop-color="#e4eed9" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="800" height="500" fill="url(#sky)"/>
        <rect width="800" height="500" fill="url(#sun)"/>
        <path d="M0 380c120-60 200-20 320-70s220-100 480-30v220H0z" fill="#143e37" opacity="0.32"/>
        <path d="M0 430c150-50 250 0 400-50s250-60 400 0v120H0z" fill="#0d2b24" opacity="0.42"/>
      </svg>`
      return { backgroundImage: `url("${svgUri(svg.trim())}")` }
    },
    financeConfigured() { return hasValidFinance(state) },
    fireResult() { return freedomResult(state) },
    homeGoal() {
      const plan = state.goalPlan
      if (!plan) return null
      const r = GoalEngine(plan)
      return { ...plan, progress: r.progress, targetDate: r.date ? r.date.toLocaleDateString('zh-CN') : '100年内暂未可达', remainingDays: r.date ? Math.max(0, Math.ceil((r.date.getTime() - Date.now()) / 86400000)) : null }
    },
    targetText() {
      const r = this.fireResult
      if (r.months === 0) return '已达到当前目标'
      if (r.date) return '预计到达 ' + r.date.toLocaleDateString('zh-CN')
      return '调整收入、支出或计算假设，重新规划'
    },
    expenseTotal() { return LedgerSummary(state, undefined, 'expense').total },
    incomeTotal()  { return LedgerSummary(state, undefined, 'income').total },
    wishlistSaved() {
      return (state.items || [])
        .filter(x => x.status === 'abandoned' && Number(x.amount) > 0)
        .reduce((sum, x) => sum + Number(x.amount), 0)
    },
    wishlistCount() {
      return (state.items || []).filter(x => x.status === 'active').length
    },
    wishlistPreview() {
      return (state.items || []).filter(x => x.status === 'active').slice(0, 3)
    },
    todayCount() {
      if (!state.hero) return 0
      return state.hero.slots.filter(s => s.done).length + Number(state.hero.ledgerDone)
    },
    todayTasks() {
      if (!state.hero) return []
      const all = {
        ledger:   { id: 'ledger',   title: '记录今天的消费' },
        assets:   { id: 'assets',   title: '记录本月资产' },
        savings:  { id: 'savings',  title: '检视储蓄目标' },
        wishlist: { id: 'wishlist', title: '处理一笔待消费计划' },
        read:     { id: 'read',     title: '阅读10分钟' },
      }
      return [
        ...state.hero.slots.map(s => all[s.id]).filter(Boolean),
        all.ledger,
      ]
    },
  },

  onLoad() {
    // 与 App.vue 保持相同的启动判断，避免默认首页抢先渲染
    const hasSeenIsland = uni.getStorageSync('fire_island_onboarding_done') === true
    const hasLoggedIn = uni.getStorageSync('fire_login_status') === true
    const guestMode = uni.getStorageSync('fire_guest_mode') === true
    if (!hasSeenIsland) {
      uni.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }
    if (!hasLoggedIn && !guestMode) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    if (!state.started) {
      state.started = true
    }
    this.bindVisibilityEvents()
    this.startCountdown()
  },
  onShow() {
    this.pageVisible = true
    refreshFinance()
    const savedWishlist = uni.getStorageSync('fire_wishlist_v1')
    if (Array.isArray(savedWishlist)) state.items = savedWishlist
    this.startCountdown()
  },
  onHide() {
    this.pageVisible = false
    this.stopCountdown()
  },
  onUnload() {
    this.unbindVisibilityEvents()
    this.stopCountdown()
  },
  beforeUnmount() {
    this.unbindVisibilityEvents()
    this.stopCountdown()
  },

  methods: {
    clearCountdownTasks() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
      if (this.timeout) {
        clearTimeout(this.timeout)
        this.timeout = null
      }
      if (this.raf) {
        cancelAnimationFrame(this.raf)
        this.raf = null
      }
    },
    startCountdown() {
      this.clearCountdownTasks()
      if (!this.pageVisible) return
      // #ifdef H5
      if (typeof document !== 'undefined' && document.hidden) return
      // #endif
      this.tick()
      if (!this.financeConfigured || !this.fireResult.date) return
      this.timer = setInterval(() => {
        this.tick()
      }, 1000)
    },
    stopCountdown() {
      this.clearCountdownTasks()
    },
    bindVisibilityEvents() {
      // H5 标签页切换、锁屏恢复时，按当前系统时间重新计算
      // #ifdef H5
      if (typeof document !== 'undefined' && !this.visibilityHandler) {
        this.visibilityHandler = () => {
          if (document.visibilityState === 'visible') this.startCountdown()
          else this.stopCountdown()
        }
      }
      if (typeof window !== 'undefined' && !this.pageShowHandler) {
        this.pageShowHandler = () => this.startCountdown()
        this.pageHideHandler = () => this.stopCountdown()
      }
      if (typeof document !== 'undefined' && this.visibilityHandler) {
        document.addEventListener('visibilitychange', this.visibilityHandler)
      }
      if (typeof window !== 'undefined' && this.pageShowHandler) {
        window.addEventListener('pageshow', this.pageShowHandler)
        window.addEventListener('pagehide', this.pageHideHandler)
      }
      // #endif
    },
    unbindVisibilityEvents() {
      // #ifdef H5
      if (typeof document !== 'undefined' && this.visibilityHandler) {
        document.removeEventListener('visibilitychange', this.visibilityHandler)
      }
      if (typeof window !== 'undefined' && this.pageShowHandler) {
        window.removeEventListener('pageshow', this.pageShowHandler)
        window.removeEventListener('pagehide', this.pageHideHandler)
      }
      // #endif
      this.visibilityHandler = null
      this.pageShowHandler = null
      this.pageHideHandler = null
    },
    tick() {
      const r = this.fireResult
      if (!r.date) { this.years = this.months = this.days = 0; this.hours = this.minutes = this.seconds = 0; return }
      const p = ReelCalendarParts(r.date)
      this.years = p.years; this.months = p.months; this.days = p.days
      this.hours = p.hours; this.minutes = p.minutes; this.seconds = p.seconds
    },
    pad(n) { return String(n).padStart(2, '0') },
    formatMoney(n) { return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 0 }) },
    formatAmount(n) {
      const v = Number(n)
      if (!Number.isFinite(v)) return '0.00'
      return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    taskDone(id) {
      if (!state.hero) return false
      if (id === 'ledger') return !!state.hero.ledgerDone
      return !!state.hero.slots.find(s => s.id === id)?.done
    },
    taskLabel(t) {
      return { ledger: '记账', assets: '我的基础数据', savings: '我的基础数据', wishlist: '极简拔草', read: '自由笔记' }[t.id] || '行动'
    },
    taskIcon(id) {
      const p = TASK_ICONS[id] || TASK_ICONS.assets
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#769383" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`
      return svgUri(svg)
    },
    goCalculator() { uni.navigateTo({ url: '/pages/calculator/index' }) },
    goResult() { uni.navigateTo({ url: '/pages/calculator/index' }) },
    goGoal() { uni.navigateTo({ url: '/pages/calculator/index?mode=goal' }) },
    goLedger() { uni.navigateTo({ url: '/pages/ledger/index' }) },
    goWishlist() { uni.navigateTo({ url: '/pages/wishlist/index' }) },
    wishlistStatus(item) {
      const left = Math.max(0, Math.ceil((Number(item.created || Date.now()) + Number(item.days || 7) * 86400000 - Date.now()) / 86400000))
      return left ? '冷静期剩余 ' + left + ' 天' : '冷静期已结束'
    },
    goTask(t) {
      if (t.id === 'ledger') uni.navigateTo({ url: '/pages/ledger/index' })
      else uni.showToast({ title: '这个任务待开发', icon: 'none' })
    },
  },
}
</script>

<style>
@keyframes firePageIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fireCardIn { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.home-view { min-height: 100vh; background: #fdfdfb; padding-bottom: 140px; animation: firePageIn .32s cubic-bezier(.22,1,.36,1) both; }
.home-masthead { animation: fireCardIn .48s cubic-bezier(.22,1,.36,1) both; }
.home-metrics { animation: fireCardIn .48s .06s cubic-bezier(.22,1,.36,1) both; }
.task-row { animation: fireCardIn .42s cubic-bezier(.22,1,.36,1) both; }
.task-row:nth-child(2) { animation-delay: .08s; }.task-row:nth-child(3) { animation-delay: .14s; }.task-row:nth-child(4) { animation-delay: .2s; }
.goal-card { animation: fireCardIn .48s .1s cubic-bezier(.22,1,.36,1) both; }
.goal-card-mini { margin: -4px 24px 12px auto; width: min(42vw, 180px); min-height: 0; padding: 10px 12px; border-radius: 12px; cursor: pointer; }
.goal-card-mini .goal-card-name { margin: 0; font-size: 13px; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.goal-card-mini .goal-card-meta { margin-top: 4px; font-size: 11px; line-height: 1.4; }
.goal-card-mini .goal-card-progress { height: 3px; margin: 7px 0 0; }
.btn-primary:active,.task-row:active,.metric:active { transform: scale(.98); transition: transform .12s ease; }

.home-masthead { position: relative; padding: 60px 24px 24px; overflow: hidden; }
.masthead-bg { position: absolute; left: 0; top: 0; right: 0; height: 375px; background-size: cover; background-position: center; z-index: 0; }
.masthead-fade {
  position: absolute; left: 0; top: 0; right: 0; height: 375px; z-index: 1;
  background: linear-gradient(to bottom, rgba(253,253,251,0) 0%, rgba(253,253,251,0) 20%, rgba(253,253,251,0.65) 50%, rgba(253,253,251,0.98) 76%, #fdfdfb 100%);
  pointer-events: none;
}
.masthead-title { position: relative; z-index: 2; min-height: 167px; }
.masthead-h1 { display: block; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; line-height: 1.3; }
.masthead-date { display: block; font-size: 13px; color: #e6e9e3; margin-top: 8px; }

.freedom-summary { position: relative; z-index: 2; display: block; padding: 0; }
.freedom-head { display: flex; justify-content: space-between; align-items: center; }
.freedom-label { font-size: 18px; font-weight: 700; color: #203c2b; letter-spacing: 0.4px; }
.plan-link { font-size: 14px; color: #527059; }
.day-countdown { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; margin-top: 14px; }
.calendar-unit { display: inline-flex; align-items: baseline; gap: 3px; }
.calendar-num { font-size: 48px; font-weight: 800; color: #1e342a; letter-spacing: -1px; line-height: 1.1; }
.calendar-label { font-size: 16px; font-weight: 500; color: #526a58; }
.countdown-clock { display: flex; align-items: center; gap: 10px; margin: 8px 0 10px; }
.clock-unit { display: inline-flex; align-items: baseline; gap: 3px; }
.clock-num { font-size: 22px; font-weight: 500; color: #314b38; letter-spacing: 1.3px; font-variant-numeric: tabular-nums; }
.clock-label { font-size: 16px; color: #314b38; opacity: 0.72; }
.countdown-target { display: block; font-size: 12px; color: #687760; line-height: 1.7; margin: 0 0 20px; }
.progress { width: 100%; height: 6px; background: #dfe8db; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #527059; border-radius: 4px; transition: width 0.4s ease; }
.freedom-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
.foot-left, .foot-right { font-size: 12px; color: #687760; }

.home-unconfigured { position: relative; z-index: 2; padding: 16px 0 24px; }
.unconfigured-label { display: block; font-size: 18px; font-weight: 700; color: #203c2b; }
.unconfigured-h2 { display: block; font-size: 24px; font-weight: 600; color: #243830; margin: 14px 0 10px; line-height: 1.5; }
.unconfigured-sub { display: block; font-size: 14px; line-height: 1.8; color: #52605a; }
.btn-primary { margin-top: 24px; padding: 16px 20px; border-radius: 10px; background: #243830; display: flex; justify-content: center; align-items: center; }
.btn-primary-text { color: #fff; font-size: 15px; font-weight: 500; }

.goal-card { margin: 0 24px 24px; padding: 20px; border-radius: 18px; background: linear-gradient(135deg, #eef4e8, #e3eee4); border: 1px solid #d9e6d6; box-sizing: border-box; }
.goal-card-head, .goal-card-foot { display: flex; justify-content: space-between; align-items: center; }
.goal-card-label { font-size: 14px; color: #527059; font-weight: 700; }
.goal-card-link, .goal-card-meta, .goal-card-foot { font-size: 12px; color: #718074; }
.goal-card-name { display: block; margin: 14px 0 6px; font-size: 23px; color: #243830; font-weight: 700; }
.goal-card-meta { display: block; line-height: 1.7; }
.goal-card-progress { height: 6px; margin: 16px 0 12px; border-radius: 6px; background: #d5e3d4; overflow: hidden; }
.goal-card-progress-fill { height: 100%; border-radius: 6px; background: #527059; }
.home-content { padding: 0 24px; }
.home-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 24px 0; border-top: 1px solid #e5e9e0; border-bottom: 1px solid #e5e9e0; }
.metric { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.metric-label { font-size: 12px; color: #52605a; line-height: 1.4; white-space: nowrap; }
.metric-value { font-size: 18px; font-weight: 500; color: #243830; line-height: 1.4; word-break: break-all; }
.metric-value.metric-expense { color: #8a4f16; }
.metric-value.metric-income  { color: #25613f; }

.wishlist-home-card { margin-top: 24px; padding: 18px; border: 1px solid #e1e7de; border-radius: 16px; background: #f4f8f1; }
.wishlist-home-head { display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; }
.wishlist-home-count { font-size: 12px; color: #718074; }
.wishlist-home-row { display:flex; align-items:center; padding: 13px 0; border-top:1px solid #e1e7de; }
.wishlist-home-copy { flex:1; min-width:0; }
.wishlist-home-name { display:block; color:#243830; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wishlist-home-sub { display:block; margin-top:4px; color:#718074; font-size:11px; }
.wishlist-home-arrow { color:#718074; font-size:22px; }
\n.section { margin-top: 28px; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 18px; font-weight: 700; color: #143e37; }
.section-count { font-size: 14px; color: #527059; }
.task-row { display: flex; align-items: center; gap: 12px; padding: 16px 0; border-bottom: 1px solid #e5e9e0; }
.task-row-done { opacity: 0.75; }
.task-icon { width: 38px; height: 38px; border-radius: 12px; background: #ecf2e6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.task-icon-img { width: 19px; height: 19px; }
.task-text { flex: 1; min-width: 0; }
.task-title { display: block; font-size: 14px; color: #243830; line-height: 1.6; word-break: break-all; }
.task-sub { display: block; font-size: 11px; color: #7b887e; margin-top: 4px; line-height: 1.5; }
.task-reward { font-size: 12px; color: #648575; white-space: nowrap; flex-shrink: 0; }
.task-reward.done { color: #527059; font-weight: 600; }
.safe-note { display: block; text-align: center; font-size: 11px; color: #8b9489; margin: 40px 0 8px; letter-spacing: 1px; }
</style>