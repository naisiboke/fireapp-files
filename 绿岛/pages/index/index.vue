<template>
  <view class="home-view fire-page-index-index" :style="pageLayoutStyle" :class="{ 'page-entry-reset': pageEntryReset }">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="fire-tab-content" :class="{ 'tab-content-reset':pageEntryReset, 'tab-content-slide':!pageEntryReset }" :style="tabEntryStyle">

    <view class="home-masthead">
      <view class="masthead-bg" :style="mastheadBgStyle"></view>
      <view class="masthead-fade"></view>

      <view class="masthead-title">
        <text class="masthead-h1">我的自由计划</text>
        <text class="masthead-date">fireday.cn</text>
        <button class="message-entry" aria-label="消息提醒" @tap.stop="openMessages"><view class="bell-shape"></view><view v-if="unreadMessages" class="message-dot"></view></button>
      </view>

      <CountdownSwitch v-if="state.goalPlan && state.goalPlan.name" :active-goal="activeGoal" @change="selectCountdown" />
      <view v-if="!displayConfigured" class="home-unconfigured">
        <text class="unconfigured-sub">填写资料，看看离自由还有多远。</text>
        <view id="fire-guide-finance" class="btn-primary" @tap="goCalculator">
          <text class="btn-primary-text">填写资料</text>
        </view>
      </view>

      <view v-else class="freedom-summary" @tap="goResult">
        <view class="freedom-head">
          <text class="freedom-label">{{activeGoal ? state.goalPlan.name+'目标倒计时' : '预计自由日'}}</text>
          <text id="fire-guide-finance" class="plan-link">查看计划 ›</text>
        </view>

        <view v-if="displayResult.date" class="day-countdown">
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

        <view v-if="displayResult.date" class="countdown-clock">
          <view class="clock-unit"><AnimatedNumber class="clock-num" :value="pad(hours)" /><text class="clock-label">时</text></view>
          <view class="clock-unit"><AnimatedNumber class="clock-num" :value="pad(minutes)" /><text class="clock-label">分</text></view>
          <view class="clock-unit"><AnimatedNumber class="clock-num" :value="pad(seconds)" /><text class="clock-label">秒</text></view>
        </view>

        <text class="countdown-target">{{ targetText }}</text>
        <view class="home-plan-context" :aria-hidden="activeGoal"><text v-if="!activeGoal" class="inflation-note">通胀参考：中国近五年 CPI 年化约 0.5%–1.0%</text></view>

        <view class="progress"><view class="progress-fill" :style="{ width: displayResult.progress + '%' }"></view></view>

        <view class="freedom-foot">
          <text class="foot-left">{{activeGoal ? '已准备 ¥ '+formatMoney(state.goalPlan.assets)+' / '+formatMoney(state.goalPlan.amount) : '当前资产 ¥ '+formatMoney(state.finance.assets)}}</text>
          <text class="foot-right">进度 {{ displayResult.progress.toFixed(1) }}%</text>
        </view>
      </view>
    </view>


    <view class="home-content">
      <view v-if="state.cloudSync && ['error','pending','restoring','auth-required','conflict'].includes(state.cloudSync.status)" class="account-sync-banner" @tap="retryAccountSync">
        <text>{{ state.cloudSync.message || '本机记录已保留，等待同步' }}</text><text v-if="state.cloudSync.status !== 'synced'">{{ state.cloudSync.status === 'conflict' ? '选择版本 ›' : state.cloudSync.status === 'restoring' ? '恢复中…' : '重试 ›' }}</text>
      </view>

      <view class="home-metrics">
        <view class="metric" @tap="goLedger">
          <text class="metric-label">本月消费 ›</text>
          <text class="metric-value metric-expense" :class="{ 'metric-over-budget': expenseOverBudget }">{{ hasExpenseRecords ? '¥ ' + formatAmount(expenseTotal / 100) : '待填写' }}</text>
          <text v-if="expenseOverBudget" class="metric-status">已超额</text>
        </view>
        <view class="metric" @tap="goLedger">
          <text class="metric-label">本月收入 ›</text>
          <text class="metric-value metric-income">{{ hasIncomeRecords ? '¥ ' + formatAmount(incomeTotal / 100) : '待填写' }}</text>
        </view>
        <view class="metric" @tap="goWishlist">
          <text class="metric-label">拔草已省下 ›</text>
          <text class="metric-value">¥ {{ formatAmount(wishlistSaved) }}</text>
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
          <text class="section-count">{{ todayCount }} / {{todayTasks.length}}</text>
        </view>
        <view v-if="state.actionSync && ['syncing','error'].includes(state.actionSync.status)" class="action-sync" :class="{failed:state.actionSync.status==='error'}" @tap="retryActions"><text>{{state.actionSync.message}}</text><text v-if="state.actionSync.status==='error'">重试 ›</text></view>

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
            <text class="task-sub">{{taskDone(t.id)?'今天已完成':t.desc}}</text>
          </view>
          <text class="task-reward" :class="{ done: taskDone(t.id) }">
            {{taskDone(t.id)?'✓ +'+t.xp+' EXP':'+'+t.xp+' EXP ›'}}
          </text>
        </view>
      </view>

      <text class="safe-note">F.I.R.E · 让选择回到自己手中</text>
    </view>
    </view>
    <BottomTabs ref="guideTabs" current="home" :guide-active="spotlightActive" :guide-menu-open="spotlightMenuOpen" />
    <SpotlightGuide :visible="spotlightVisible" :rect="spotlightRect" :viewport="spotlightViewport" :step="spotlightStep" :busy="spotlightBusy" :title="spotlightTitle" :description="spotlightDescription" @next="advanceSpotlight" @skip="finishSpotlight('skipped')" @closed="spotlightClosed" />
  </view>
</template>

<script>
import CountdownSwitch from '@/components/CountdownSwitch.vue'
import SpotlightGuide from '@/components/SpotlightGuide.vue'
import { spotlightHomeMixin } from '@/utils/spotlight-home.js'
import { pageEntryMixin } from '@/utils/page-entry.js'
import AppFeedback from '@/components/AppFeedback.vue'
import { feedbackPageMixin } from '@/utils/feedback-page.js'
import { showNotice, dismissFeedback } from '@/utils/feedback.js'
import BottomTabs from '@/components/BottomTabs.vue'
import AnimatedNumber from '@/components/AnimatedNumber.vue'
import { state, refreshFinance, hydrateFromServer, syncStateToServer, persistNow, refreshActions } from '@/store/index.js'
import { freedomResult, hasValidFinance } from '@/utils/finance-plan.js'
import { todayActions, actionDay } from '@/utils/action-tasks.js'
import { CS } from '@/utils/community-store.js'
import {accountId} from '@/utils/account-cache.js'
import {openActionRoute,createDailyRefresh} from '@/utils/action-navigation.js'
import {collectNotifications,inbox,notificationState} from '@/utils/notifications.js'
import { isMembershipActive } from '@/utils/membership.js'
import { wishlistBucket, wishlistDue, wishlistReason, coolingEnd } from '@/utils/wishlist.js'
import { GoalEngine, MonthlyStatus, LocalDay, ReelCalendarParts } from '@/utils/engine.js'

const TASK_ICONS = {
  ledger:   'M5 3h14v18l-3-2-4 2-4-2-3 2zM8 7h8M8 11h8M8 15h5',
  assets:   'm3 10 9-7 9 7v10H3zM9 20v-7h6v7',
  goal:     'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l9-9M16 3h5v5',
  favorite: 'm12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  publish:  'M4 4h12v16H4zM8 8h4M8 12h5M17 3l4 4-8 8-4 1 1-4z',
  edit:     'M15 4l5 5-10 10-6 1 1-6zM12 7l5 5',
}

function svgUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

export default {
  mixins: [feedbackPageMixin, pageEntryMixin, spotlightHomeMixin],
  onBackPress() { return dismissFeedback(this.feedbackOwnerId) },
  components: { AppFeedback, BottomTabs, AnimatedNumber, SpotlightGuide, CountdownSwitch },
  data() {
    return {
      state,
      actionPosts: [], actionNow: Date.now(), messageMinute:-1, dailyRefresh: createDailyRefresh({refresh:()=>refreshActions(),day:actionDay}),
      ledgerMonth: LocalDay().slice(0, 7),
      years: 0, months: 0, days: 0,
      hours: 0, minutes: 0, seconds: 0,
      timer: null,
      timeout: null,
      raf: null,
      visibilityHandler: null,
      pageShowHandler: null,
      pageHideHandler: null,
      pageVisible: false,
      guardianWords: ['35岁危机', '负债', '房贷', '收入停滞', '养老压力'],
      guardianWordIndex: 0,
      guardianTimer: null,
    }
  },

  computed: {
    unreadMessages(){void this.actionNow;void notificationState.revision;return inbox().some(x=>!x.read)},
    guardianWord() { return this.guardianWords[this.guardianWordIndex] || this.guardianWords[0] },
        todayText() {
      return new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
    },
    mastheadBgStyle() {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#1c4735"/>
            <stop offset="0.3" stop-color="#4f765d"/>
            <stop offset="0.68" stop-color="#c4d2bd"/>
            <stop offset="1" stop-color="#f7f2e8"/>
          </linearGradient>
          <radialGradient id="glow" cx="0.86" cy="0.2" r="0.36">
            <stop offset="0" stop-color="#dce8c8" stop-opacity="0.55"/>
            <stop offset="1" stop-color="#dce8c8" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="800" height="500" fill="url(#sky)"/>
        <rect width="800" height="500" fill="url(#glow)"/>
        <path d="M0 365 C150 350 230 398 355 380 C515 357 603 320 800 350 L800 500 L0 500 Z" fill="#dce6d7" opacity="0.34"/>
        <path d="M0 415 C150 385 260 430 390 420 C545 408 650 370 800 393 L800 500 L0 500 Z" fill="#eef1e6" opacity="0.72"/>
      </svg>`
      return { backgroundImage: `url("${svgUri(svg.trim())}")` }
    },
    financeConfigured() { return hasValidFinance(state) },
    fireResult() { return freedomResult(state) },
    activeGoal(){return state.homeCountdown==='goal'&&!!state.goalPlan?.name},
    displayConfigured(){return this.activeGoal||this.financeConfigured},
    displayResult(){return this.activeGoal?GoalEngine(state.goalPlan):this.fireResult},
    targetText() {
      const r = this.displayResult
      if (r.months === 0) return '已达到当前目标'
      if(this.activeGoal&&r.date&&r.date.getTime()<=this.actionNow)return '预计日期已到，请更新目标进度'
      if (r.date) return (this.activeGoal?'预计完成 ':'预计到达 ') + this.formatDateCN(r.date)
      return '调整收入、支出或计算假设，重新规划'
    },
    monthlyStatus() { return MonthlyStatus(state, this.ledgerMonth) },
    expenseTotal() { return this.monthlyStatus.expense.total },
    incomeTotal() { return this.monthlyStatus.income.total },
    hasExpenseRecords() { return this.monthlyStatus.expense.count > 0 },
    hasIncomeRecords() { return this.monthlyStatus.income.count > 0 },
    expenseOverBudget() { return this.monthlyStatus.expense.status === '已超额' },
    wishlistSaved() {
      return (state.items || [])
        .filter(x => wishlistBucket(x) === 'success' && Number(x.amount) > 0)
        .reduce((sum, x) => sum + Number(x.amount), 0)
    },
    wishlistCount() {
      return (state.items || []).filter(x => wishlistBucket(x) === 'active').length
    },
    wishlistPreview() {
      return (state.items || []).filter(x => wishlistBucket(x) === 'active').slice(0, 3)
    },
    todayCount(){return this.todayTasks.filter(t=>t.done).length},
    todayTasks(){return todayActions(state,{posts:this.actionPosts,member:isMembershipActive(state),at:this.actionNow})},

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
    this.startGuardian()
  },
  onShow() {
    uni.hideTabBar({ animation: false })
    this.pageVisible = true
    this.ledgerMonth = LocalDay().slice(0, 7)
    refreshFinance()
    this.actionPosts=CS.ugc();this.actionNow=Date.now();this.refreshDailyActions(true);this.collectMessages()
    this.startCountdown()
    this.startGuardian()
  },
  onHide() {
    this.pageVisible = false
    this.stopCountdown()
    this.stopGuardian()
  },
  onUnload() {
    this.unbindVisibilityEvents()
    this.stopCountdown()
    this.stopGuardian()
  },
  beforeUnmount() {
    this.unbindVisibilityEvents()
    this.stopCountdown()
    this.stopGuardian()
  },

  methods: {
    startGuardian() {
      if (this.guardianTimer || this.state.privacySettings.guardianAnimation === false) return
      this.guardianTimer = setInterval(() => {
        this.guardianWordIndex = (this.guardianWordIndex + 1) % this.guardianWords.length
      }, 4800)
    },
    stopGuardian() {
      if (this.guardianTimer) {
        clearInterval(this.guardianTimer)
        this.guardianTimer = null
      }
    },
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
      this.timer = setInterval(() => {
        this.tick()
      }, this.displayConfigured && this.displayResult.date ? 1000 : 60000)
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
      this.actionNow=Date.now()
      this.refreshDailyActions(false)
      this.collectMessages(false)
      this.ledgerMonth = LocalDay().slice(0, 7)
      const r = this.displayResult
      if (!r.date) { this.years = this.months = this.days = 0; this.hours = this.minutes = this.seconds = 0; return }
      const p = ReelCalendarParts(r.date)
      this.years = p.years; this.months = p.months; this.days = p.days
      this.hours = p.hours; this.minutes = p.minutes; this.seconds = p.seconds
    },
    pad(n) { return String(n).padStart(2, '0') },
    formatMoney(n) { return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 0 }) },
    formatDateCN(date) { const d = new Date(date); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日' },
    formatAmount(n) {
      const v = Number(n)
      if (!Number.isFinite(v)) return '0.00'
      return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    collectMessages(force=true){const minute=Math.floor(Date.now()/60000);if(!force&&minute===this.messageMinute)return;this.messageMinute=minute;collectNotifications({items:state.items,posts:CS.ugc(),rewards:state.actionRewards})},
    refreshDailyActions(force){this.dailyRefresh(accountId(),Date.now(),force).then(result=>{if(result)this.collectMessages()}).catch(()=>{})},
    openMessages(){this.collectMessages();uni.navigateTo({url:'/pages/messages/index'})},
    taskDone(id){return !!this.todayTasks.find(t=>t.id===id)?.done},
    taskIcon(id) {
      const p = TASK_ICONS[id] || TASK_ICONS.assets
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#769383" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`
      return svgUri(svg)
    },
    async retryAccountSync() {
      if(state.cloudSync?.status==='conflict'){uni.navigateTo({url:'/pages/sync-conflict/index'});return}
      if(state.cloudSync?.status==='restoring')return
      const restored=await hydrateFromServer()
      if(!restored.loaded){
        if(uni.getStorageSync('fire_login_status')===true)showNotice({title:state.cloudSync.message,icon:'none'})
        return
      }
      if(restored.conflict){uni.navigateTo({url:'/pages/sync-conflict/index'});return}
      const result=await syncStateToServer()
      if(!result.synced&&!result.skipped)showNotice({title:state.cloudSync.message,icon:'none'})
    },
    goCalculator() { uni.navigateTo({ url: '/pages/calculator/index' }) },
    selectCountdown(mode){if(!['fire','goal'].includes(mode)||(mode==='goal'&&!state.goalPlan?.name)||state.homeCountdown===mode)return;const previous=state.homeCountdown;state.homeCountdown=mode;if(persistNow()===false){state.homeCountdown=previous;showNotice({title:'切换未保存，请稍后重试',icon:'none'});return}this.startCountdown()},
    goResult() { uni.navigateTo({ url: this.activeGoal?'/pages/calculator/index?mode=goal&from=home':'/pages/calculator/index' }) },
    goGoal() { uni.navigateTo({ url: '/pages/calculator/index?mode=goal&from=home' }) },
    goLedger() { uni.navigateTo({ url: '/pages/ledger/index' }) },
    goWishlist() { uni.navigateTo({ url: '/pages/wishlist/index' }) },
    wishlistStatus(item){const bucket=wishlistBucket(item);if(bucket==='success')return wishlistReason(item);if(bucket==='bought')return '已购买';if(wishlistDue(item,this.actionNow))return '待确认是否购买';return '冷静期剩余 '+Math.ceil((coolingEnd(item)-this.actionNow)/86400000)+' 天'},
    retryActions(){if(state.actionSync?.status!=='syncing')refreshActions().catch(()=>{})},
    goTask(t){if(t.id==='ledger'){const budget=state.monthlyTargets?.[LocalDay().slice(0,7)]||{};const ready=Number.isSafeInteger(budget.expense)&&budget.expense>0&&Number.isSafeInteger(budget.income)&&budget.income>0;uni.navigateTo({url:ready?'/pages/ledger/edit':'/pages/ledger/index?add=1'});return}if(t.url)openActionRoute(t.url,uni,()=>showNotice({title:'暂时无法打开任务页面，请稍后重试',icon:'none'}))},

  },
}
</script>

<style>
@import '../../utils/tab-content.css';
@keyframes firePageIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fireCardIn { from { opacity: 0; transform: translateY(18px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.home-view { min-height: 100vh; background: #fdfdfb; padding-bottom: calc(88px + env(safe-area-inset-bottom));  }
.home-masthead { animation: fireCardIn .48s cubic-bezier(.22,1,.36,1) backwards; }
.home-metrics { animation: fireCardIn .48s .06s cubic-bezier(.22,1,.36,1) backwards; }
.task-row { animation: fireCardIn .42s cubic-bezier(.22,1,.36,1) backwards; }
.task-row:nth-child(2) { animation-delay: .08s; }.task-row:nth-child(3) { animation-delay: .14s; }.task-row:nth-child(4) { animation-delay: .2s; }
.goal-card { animation: fireCardIn .48s .1s cubic-bezier(.22,1,.36,1) backwards; }
.goal-card-mini { margin: -4px 24px 12px auto; width: min(42vw, 180px); min-height: 0; padding: 10px 12px; border-radius: 12px; cursor: pointer; }
.goal-card-mini .goal-card-name { margin: 0; font-size: 13px; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.goal-card-mini .goal-card-meta { margin-top: 4px; font-size: 11px; line-height: 1.4; }
.goal-card-mini .goal-card-progress { height: 3px; margin: 7px 0 0; }
.btn-primary:active,.task-row:active,.metric:active { transform: scale(.98); transition: transform .12s ease; }

.home-masthead { position: relative; padding: calc(24px + var(--fire-status-top, env(safe-area-inset-top))) 20px 20px; overflow: hidden; }
.masthead-bg { position: absolute; left: 0; top: 0; right: 0; height: 375px; background-size: cover; background-position: center; z-index: 0; }
.masthead-fade {
  position: absolute; left: 0; top: 0; right: 0; height: 375px; z-index: 1;
  background: linear-gradient(to bottom, rgba(253,253,251,0) 0%, rgba(253,253,251,0) 20%, rgba(253,253,251,0.65) 50%, rgba(253,253,251,0.98) 76%, #fdfdfb 100%);
  pointer-events: none;
}
.masthead-title { position: relative; z-index: 3; min-height: 140px; }
.masthead-h1 { display: block; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; line-height: 1.3; }
.masthead-date { display: block; font-size: 13px; color: #e6e9e3; margin-top: 8px; }

.freedom-summary { position: relative; z-index: 3; display: block; padding: 0; }
.freedom-head { display: flex; justify-content: space-between; align-items: center; }
.freedom-label { font-size: 16px; font-weight: 700; color: #203c2b; letter-spacing: 0.4px; }
.plan-link { font-size: 14px; color: #527059; }
.day-countdown { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; margin-top: 14px; }
.calendar-unit { display: inline-flex; align-items: baseline; gap: 3px; }
.calendar-num { font-size: 40px; font-weight: 800; color: #1e342a; letter-spacing: -1px; line-height: 1.1; }
.calendar-label { font-size: 16px; font-weight: 500; color: #526a58; }
.countdown-clock { display: flex; align-items: center; gap: 10px; margin: 8px 0 10px; }
.clock-unit { display: inline-flex; align-items: baseline; gap: 3px; }
.clock-num { font-size: 22px; font-weight: 500; color: #314b38; letter-spacing: 1.3px; font-variant-numeric: tabular-nums; }
.clock-label { font-size: 16px; color: #314b38; opacity: 0.72; }
.countdown-target { display: block; font-size: 12px; color: #687760; line-height: 1.7; margin: 0 0 20px; }
.inflation-note { display:block; margin-top:-14px; margin-bottom:16px; color:#8a958b; font-size:10px; line-height:1.5; }
.progress { width: 100%; height: 6px; background: #dfe8db; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #527059; border-radius: 4px; transition: width 0.4s ease; }
.freedom-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; }
.foot-left, .foot-right { font-size: 12px; color: #687760; }

.home-unconfigured { position: relative; z-index: 2; padding: 13px 0 24px; }
.unconfigured-label { display: block; font-size: 16px; font-weight: 700; color: #203c2b; }
.unconfigured-h2 { display: block; font-size: 22px; font-weight: 600; color: #243830; margin: 14px 0 10px; line-height: 1.5; }
.unconfigured-sub { display: block; font-size: 14px; line-height: 1.8; color: #52605a; }
.btn-primary { margin-top: 24px; padding: 12px 16px; border-radius: 10px; background: #243830; display: flex; justify-content: center; align-items: center; }
.btn-primary-text { color: #fff; font-size: 15px; font-weight: 500; }

.goal-card { margin: 0 24px 24px; padding: 20px; border-radius: 18px; background: linear-gradient(135deg, #eef4e8, #e3eee4); border: 1px solid #d9e6d6; box-sizing: border-box; }
.goal-card-head, .goal-card-foot { display: flex; justify-content: space-between; align-items: center; }
.goal-card-label { font-size: 14px; color: #527059; font-weight: 700; }
.goal-card-link, .goal-card-meta, .goal-card-foot { font-size: 12px; color: #718074; }
.goal-card-name { display: block; margin: 14px 0 6px; font-size: 23px; color: #243830; font-weight: 700; }
.goal-card-meta { display: block; line-height: 1.7; }
.goal-card-progress { height: 6px; margin: 16px 0 12px; border-radius: 6px; background: #d5e3d4; overflow: hidden; }
.goal-card-progress-fill { height: 100%; border-radius: 6px; background: #527059; }
.home-content { padding: 0 20px; }
.home-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 20px 0; border-top: 1px solid #e5e9e0; border-bottom: 1px solid #e5e9e0; }
.metric { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.metric-label { font-size: 12px; color: #52605a; line-height: 1.4; white-space: nowrap; }
.metric-value { font-size: 16px; font-weight: 500; color: #243830; line-height: 1.4; word-break: break-all; }
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

.section { margin-top: 24px; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 700; color: #143e37; }
.section-count { font-size: 14px; color: #527059; }
.task-row { display: flex; align-items: center; gap: 12px; padding: 13px 0; border-bottom: 1px solid #e5e9e0; }
.task-row-done { opacity: 0.75; }
.task-icon { width: 34px; height: 34px; border-radius: 12px; background: #ecf2e6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.task-icon-img { width: 19px; height: 19px; }
.task-text { flex: 1; min-width: 0; }
.task-title { display: block; font-size: 14px; color: #243830; line-height: 1.6; word-break: break-all; }
.task-sub { display: block; font-size: 11px; color: #7b887e; margin-top: 4px; line-height: 1.5; }
.task-reward { font-size: 12px; color: #648575; white-space: nowrap; flex-shrink: 0; }
.task-reward.done { color: #527059; font-weight: 600; }
.safe-note { display: block; text-align: center; font-size: 11px; color: #8b9489; margin: 40px 0 8px; letter-spacing: 1px; }

.guardian-scene{position:absolute;z-index:2;left:0;right:0;top:126px;height:218px;overflow:hidden;pointer-events:none}.guardian-island{position:absolute;left:50%;bottom:2px;width:184px;height:48px;transform:translateX(-50%);border-radius:50% 50% 42% 42%;background:linear-gradient(180deg,#709b75,#315f49);box-shadow:0 9px 0 rgba(13,43,36,.14),0 0 22px rgba(132,186,130,.25)}.guardian-island:before{content:'';position:absolute;left:24px;right:24px;top:9px;height:7px;border-radius:50%;background:rgba(190,224,171,.38)}.guardian-person{position:absolute;left:50%;bottom:30px;width:72px;height:112px;transform:translateX(-50%);animation:guardianBreathe 2.8s ease-in-out infinite}.guardian-head{position:absolute;left:26px;top:0;width:21px;height:21px;border-radius:50%;background:#f1e3c9;border:2px solid #173d35}.guardian-body{position:absolute;left:22px;top:25px;width:30px;height:69px;border-radius:16px 16px 9px 9px;background:#173d35;border:0;box-shadow:7px 7px 0 rgba(23,61,53,.12)}.guardian-arm{position:absolute;left:39px;top:37px;width:27px;height:7px;border-radius:8px;background:#173d35;border:0;transform:rotate(-18deg);transform-origin:left center}.guardian-sword{position:absolute;left:59px;top:31px;width:5px;height:58px;border-radius:5px;background:linear-gradient(90deg,#d7f4dc,#fff,#8bb99a);border:1px solid #173d35;transform:rotate(35deg);transform-origin:bottom center;animation:swordGuard 3.2s ease-in-out infinite}.guardian-sword:after{content:'';position:absolute;left:-7px;bottom:-7px;width:18px;height:5px;border-radius:5px;background:#c99655;transform:rotate(-35deg)}.guardian-word{position:absolute;z-index:2;left:50%;top:7px;color:#ff6b63;font-size:14px;font-weight:700;white-space:nowrap;text-shadow:0 2px 5px rgba(80,15,20,.2);opacity:0;animation:pressureFly 4.8s cubic-bezier(.22,.61,.36,1) infinite}@keyframes pressureFly{0%{opacity:0;transform:translate(-50%,0) scale(.3)}18%{opacity:.72}55%{opacity:1;transform:translate(-50%,55px) scale(1.08)}69%{opacity:1;transform:translate(-50%,78px) scale(1.2) rotate(-5deg)}78%{opacity:0;transform:translate(-50%,78px) scale(1.55) rotate(9deg)}100%{opacity:0;transform:translate(-50%,78px) scale(1.55)}}@keyframes swordGuard{0%,58%{transform:rotate(35deg)}66%{transform:rotate(-35deg)}76%{transform:rotate(24deg)}100%{transform:rotate(35deg)}}@keyframes guardianBreathe{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-3px)}}@media(prefers-reduced-motion:reduce){.guardian-word,.guardian-person,.guardian-sword{animation:none}.guardian-word{display:none}}

@media screen and (max-width:390px){.home-view{padding-bottom:calc(78px + env(safe-area-inset-bottom))}.home-masthead{padding:calc(18px + var(--fire-status-top, env(safe-area-inset-top))) 16px 18px}.masthead-title{min-height:118px}.masthead-h1{font-size:20px}.calendar-num{font-size:34px}.calendar-label{font-size:13px}.home-content{padding:0 16px}.home-metrics{gap:8px;padding:16px 0}.metric-label{font-size:11px}.metric-value{font-size:15px}.section{margin-top:20px}.section-title{font-size:16px}.task-row{padding:11px 0;gap:9px}.task-icon{width:30px;height:30px;border-radius:9px}.task-icon-img{width:17px;height:17px}.task-title{font-size:13px}.task-sub{font-size:10px}.task-reward{font-size:11px}}
@media screen and (max-width:430px){.home-masthead{padding:calc(12px + var(--fire-status-top, env(safe-area-inset-top))) 14px 14px}.masthead-title{min-height:94px}.masthead-h1{font-size:18px}.masthead-date{font-size:11px;margin-top:5px}.home-unconfigured{padding:8px 0 14px}.unconfigured-label{font-size:15px}.unconfigured-h2{font-size:20px;margin:10px 0 6px}.unconfigured-sub{font-size:12px;line-height:1.55}.btn-primary{margin-top:16px;padding:12px 14px}.btn-primary-text{font-size:13px}.home-content{padding:0 14px}.home-metrics{gap:6px;padding:13px 0}.metric-label{font-size:10px}.metric-value{font-size:14px}.section{margin-top:16px}.section-title{font-size:15px}.section-count{font-size:12px}.task-row{padding:9px 0}.task-title{font-size:12px}.task-sub{font-size:9px}.calendar-num{font-size:30px}.calendar-label{font-size:11px}.countdown-target{font-size:10px;margin-bottom:13px}}
/* Reset only entry animations; page nodes and scroll position stay intact. */
.home-view.page-entry-reset{animation:none}
.home-view.page-entry-reset .home-masthead,.home-view.page-entry-reset .home-metrics,.home-view.page-entry-reset .task-row,.home-view.page-entry-reset .goal-card{animation:none}
.home-metrics .metric-status{font-size:11px;line-height:1.4;color:#a35d4e;font-weight:600}
.metric-value.metric-over-budget{color:#a35d4e}
.account-sync-banner{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;margin:0 0 14px;border:1px solid #e3e8df;border-radius:12px;background:#f7f9f5;color:#8a5f38;font-size:12px;line-height:1.6}
.account-sync-banner text:first-child{flex:1;min-width:0}
.account-sync-banner text:last-child{white-space:nowrap}
.account-sync-banner.synced{padding:4px 0 8px;margin-bottom:4px;border:0;background:transparent;color:#718078;font-size:11px}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-index-index .home-masthead{padding-top:var(--fire-page-top)}
 .fire-page-index-index .home-unconfigured{padding-top:30px;padding-bottom:24px} .fire-page-index-index .home-unconfigured .btn-primary{margin-top:18px} .fire-page-index-index .account-sync-banner{padding:10px 12px;font-size:12px;line-height:1.6}

.action-sync{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin:8px 0;color:#6b7e70;background:#edf3e8;border-radius:10px;font-size:12px;line-height:1.6}.action-sync.failed{background:#fbf2e9;color:#93643b}.action-sync text:last-child{flex-shrink:0}
.home-view{overflow-anchor:none}.home-plan-context{height:15px;margin-top:-14px;margin-bottom:16px}.home-plan-context .inflation-note{margin:0;line-height:15px}

.masthead-title{position:relative;padding-right:52px}
.message-entry{position:absolute;right:0;top:0;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border:1px solid rgba(255,255,255,.26);border-radius:50%;background:rgba(255,255,255,.1);color:#fff;display:flex;align-items:center;justify-content:center}
.bell-shape{position:relative;width:15px;height:17px;border:1.7px solid currentColor;border-radius:9px 9px 3px 3px;box-sizing:border-box}
.bell-shape:after{content:'';position:absolute;width:5px;height:2px;border-radius:2px;background:currentColor;left:3.3px;bottom:-5px}
.message-dot{position:absolute;right:8px;top:8px;width:6px;height:6px;border-radius:50%;background:#d67260;border:2px solid #315b48}
</style>