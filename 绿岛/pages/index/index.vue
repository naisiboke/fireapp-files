<template>
 <view class="home-view fire-page-index-index" :style="pageLayoutStyle" :class="{'page-entry-reset':pageEntryReset}">
  <AppFeedback :owner-id="feedbackOwnerId"/>
  <view class="fire-tab-content" :class="{'tab-content-reset':pageEntryReset,'tab-content-slide':!pageEntryReset}" :style="tabEntryStyle">
   <view class="home-masthead">
    <view class="masthead-title">
     <text class="masthead-h1">我的自由计划</text>
     <text class="masthead-date">让选择回到自己手中</text>
     <button class="message-entry" data-fire-press="true" aria-label="消息提醒" @tap.stop="openMessages" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><image class="message-bell" :src="messageBell" mode="aspectFit" aria-hidden="true"/><view v-if="unreadMessages" class="message-dot"/></button>
    </view>
    <CountdownSwitch v-if="state.goalPlan && state.goalPlan.name" :active-goal="activeGoal" @change="selectCountdown"/>
    <view class="financial-panel">
    <view v-if="!displayConfigured" class="home-unconfigured">
     <text class="unconfigured-title">从今天，开始你的自由计划</text>
     <text class="unconfigured-sub">填写资料，看看离自由还有多远。</text>
     <view id="fire-guide-finance" class="btn-primary" data-fire-press="true" @tap="goCalculator" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text class="btn-primary-text">填写资料</text></view>
    </view>
    <view v-else class="freedom-summary" data-fire-press="true" @tap="goResult" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
     <view class="freedom-head">
      <text class="freedom-label">{{activeGoal?'距离「'+state.goalPlan.name+'」还有':'距离自由还有'}}</text>
      <text id="fire-guide-finance" class="plan-link" data-fire-press="true" @tap.stop="goResult">查看计划 ›</text>
     </view>
     <view v-if="displayResult.date" class="day-countdown">
      <view class="calendar-unit"><AnimatedNumber class="calendar-num" :value="years"/><text class="calendar-label">年</text></view>
      <view class="calendar-unit"><AnimatedNumber class="calendar-num" :value="months"/><text class="calendar-label">个月</text></view>
      <view class="calendar-unit"><AnimatedNumber class="calendar-num" :value="days"/><text class="calendar-label">天</text></view>
     </view>
     <text class="countdown-target">{{targetText}}</text>
     <view class="freedom-foot">
      <view class="summary-stat"><text class="summary-stat-label">{{activeGoal?'已准备':'当前资产'}}</text><text class="summary-stat-value">¥{{formatMoney(activeGoal?state.goalPlan.assets:state.finance.assets)}}</text></view>
      <view v-if="activeGoal" class="summary-stat goal-target"><text class="summary-stat-label">目标金额</text><text class="summary-stat-value">¥{{formatMoney(state.goalPlan.amount)}}</text></view>
      <text class="progress-caption">{{displayResult.progress.toFixed(1)}}%</text>
     </view>
     <view class="progress-line"><view class="progress"><view class="progress-fill" :style="{width:displayResult.progress+'%'}"/></view></view>
    </view>
    <view class="home-metrics">
     <view class="metric" data-fire-press="true" @tap="goLedger" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text class="metric-label">本月消费 ›</text><text class="metric-value metric-expense" :class="{'metric-over-budget':expenseOverBudget}">{{ hasExpenseRecords ? '¥ ' + formatCompactAmount(expenseTotal / 100) : '待填写' }}</text><text v-if="expenseOverBudget" class="metric-status">已超额</text></view>
     <view class="metric" data-fire-press="true" @tap="goLedger" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text class="metric-label">本月收入 ›</text><text class="metric-value metric-income">{{ hasIncomeRecords ? '¥ ' + formatCompactAmount(incomeTotal / 100) : '待填写' }}</text></view>
     <view class="metric" data-fire-press="true" @tap="goWishlist" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text class="metric-label">拔草已省下 ›</text><text class="metric-value">¥ {{formatCompactAmount(wishlistSaved)}}</text></view>
    </view>
    </view>
   </view>
   <view class="home-content">
    <view v-if="state.cloudSync && ['error','restoring','auth-required','conflict'].includes(state.cloudSync.status)" class="account-sync-banner" data-fire-press="true" @tap="retryAccountSync" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text>{{state.cloudSync.message||'数据暂未同步，请稍后重试'}}</text><text>{{state.cloudSync.status==='conflict'?'选择版本 ›':state.cloudSync.status==='restoring'?'恢复中…':'重试 ›'}}</text></view>
    <view v-if="wishlistCount" class="wishlist-home-card">
     <view class="wishlist-home-head" data-fire-press="true" @tap="goWishlist" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text class="section-title">我的拔草</text><text class="wishlist-home-count">{{wishlistCount}} 项进行中 ›</text></view>
     <view v-for="item in wishlistPreview" :key="item.id" class="wishlist-home-row" data-fire-press="true" @tap="goWishlist" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
      <view class="wishlist-home-icon"><image class="wishlist-home-bag" :src="wishlistBag" mode="aspectFit" aria-hidden="true"/></view>
      <view class="wishlist-home-copy"><text class="wishlist-home-name">{{item.name}}</text><text class="wishlist-home-sub">¥{{formatMoney(item.amount)}} · {{wishlistStatus(item)}}</text></view>
      <text class="wishlist-home-arrow">›</text>
     </view>
    </view>
    <view class="section tasks-card">
     <view class="section-head"><text class="section-title">今日行动</text><text class="section-count">{{todayCount}} / {{todayTasks.length}}</text></view>
     <view v-if="state.actionSync && state.actionSync.status==='error'" class="action-sync failed" data-fire-press="true" @tap="retryActions" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text>{{state.actionSync.message}}</text><text>重试 ›</text></view>
     <view v-for="t in todayTasks" :key="t.id" class="task-row" data-fire-press="true" :class="{'task-row-done':taskDone(t.id)}" @tap="goTask(t)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
      <view class="task-icon"><image class="task-icon-img" :src="taskIcon(t.id)" mode="aspectFit"/></view>
      <view class="task-text"><text class="task-title">{{t.title}}</text><text class="task-sub">{{taskDone(t.id)?'今天已完成':t.desc}}</text></view>
      <text class="task-reward" :class="{done:taskDone(t.id)}">{{taskDone(t.id)?'✓ +'+t.xp+' EXP':'+'+t.xp+' EXP ›'}}</text>
     </view>
     <text v-if="!todayTasks.length" class="tasks-empty">当前没有可执行的行动，稍后再来看看。</text>
    </view>
   </view>
  </view>
  <BottomTabs ref="guideTabs" current="home" :guide-active="spotlightActive" :guide-menu-open="spotlightMenuOpen"/>
  <SpotlightGuide :visible="spotlightVisible" :rect="spotlightRect" :viewport="spotlightViewport" :step="spotlightStep" :busy="spotlightBusy" :title="spotlightTitle" :description="spotlightDescription" @next="advanceSpotlight" @skip="finishSpotlight('skipped')" @closed="spotlightClosed"/>
 </view>
</template>
<script>
import CountdownSwitch from '@/components/CountdownSwitch.vue'
import {openMessagePage} from '@/utils/message-navigation.js'
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
      openingMessages:false,
      wishlistBag:svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3e644c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14l1 14H4L5 7zM8 8V6a4 4 0 0 1 8 0v2"/></svg>'),
      messageBell:svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#234b38" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9a5.5 5.5 0 0 1 11 0c0 6 2 6.5 2 8H4.5c0-1.5 2-2 2-8zM10 20h4"/></svg>'),
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
  },
  onShow() {
    uni.hideTabBar({ animation: false })
    this.pageVisible = true
    this.ledgerMonth = LocalDay().slice(0, 7)
    refreshFinance()
    this.actionPosts=CS.ugc();this.actionNow=Date.now();this.refreshDailyActions(true);this.collectMessages()
    this.startCountdown()
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
      }, 60000)
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
    formatCompactAmount(n) {const value=Number(n);return Number.isFinite(value)?value.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:2}):'0'},
    formatAmount(n) {
      const v = Number(n)
      if (!Number.isFinite(v)) return '0.00'
      return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    collectMessages(force=true){const minute=Math.floor(Date.now()/60000);if(!force&&minute===this.messageMinute)return;this.messageMinute=minute;collectNotifications({items:state.items,posts:CS.ugc(),rewards:state.actionRewards})},
    refreshDailyActions(force){this.dailyRefresh(accountId(),Date.now(),force).then(result=>{if(result)this.collectMessages()}).catch(()=>{})},
    openMessages(){
      if(this.openingMessages)return
      this.openingMessages=true
      openMessagePage({navigate:options=>uni.navigateTo(options),collect:()=>this.collectMessages(),
        notify:title=>showNotice({title,icon:'none'}),complete:()=>{this.openingMessages=false},
        log:code=>console.warn('[message-entry]',code)})
    },
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
.home-view{min-height:100vh;box-sizing:border-box;background:#fff;color:#203d2c;padding-bottom:calc(88px + env(safe-area-inset-bottom));overflow-anchor:none}
.home-masthead{padding:calc(var(--fire-page-top) + 6px) 16px 0}
.masthead-title{position:relative;padding-right:44px;margin-bottom:16px;min-height:46px}
.masthead-h1{display:block;color:#173e2c;font-size:19px;font-weight:700;line-height:1.4;letter-spacing:.2px}
.masthead-date{display:block;color:#7b877d;font-size:11px;line-height:1.5;margin-top:3px}
.message-entry{position:absolute;z-index:6;right:-6px;top:-5px;display:flex;align-items:center;justify-content:center;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;background:transparent;border:0;border-radius:0;box-shadow:none;pointer-events:auto}
.message-entry::after{border:0;box-shadow:none}.message-bell{width:19px;height:19px;pointer-events:none}
.message-dot{position:absolute;right:10px;top:9px;width:4px;height:4px;border-radius:50%;background:#da7b61;pointer-events:none}
.financial-panel{padding:14px 15px 12px;border-radius:16px;background:#f0f5ef;box-sizing:border-box}
.freedom-summary,.home-unconfigured{padding:0;min-width:0}
.freedom-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.freedom-label{font-size:13px;font-weight:600;line-height:1.5;color:#224633;flex:1;min-width:0;overflow-wrap:anywhere}
.plan-link{font-size:11px;line-height:1.8;color:#5f7c66;white-space:nowrap}
.day-countdown{display:flex;align-items:baseline;flex-wrap:wrap;gap:9px;margin-top:10px}
.calendar-unit{display:inline-flex;align-items:baseline;gap:3px}
.calendar-num{font-size:30px;line-height:1.2;font-weight:700;color:#173c2b;font-variant-numeric:tabular-nums;letter-spacing:-.5px}
.calendar-label{font-size:11px;color:#355d43}
.countdown-target{display:block;font-size:10px;color:#7a867b;line-height:1.6;margin-top:5px}
.freedom-foot{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;margin-top:13px}
.summary-stat{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px;min-width:0}
.summary-stat-label{color:#748072;font-size:10px;line-height:1.5}
.summary-stat-value{color:#244a34;font-size:16px;font-weight:600;line-height:1.3;overflow-wrap:anywhere}
.goal-target .summary-stat-value{font-size:12px;font-weight:500}
.progress-caption{font-size:10px;color:#607963;white-space:nowrap;margin-left:auto;font-variant-numeric:tabular-nums}
.progress-line{display:flex;align-items:center;margin-top:7px}
.progress{flex:1;height:4px;border-radius:4px;overflow:hidden;background:#dce5d7}
.progress-fill{height:100%;border-radius:4px;background:#5c7d61;transition:width .3s ease}
.home-content{padding:0 16px}
.home-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:13px;padding-top:11px;border-top:1px solid #dce5d9}
.metric{box-sizing:border-box;min-width:0;padding:0 2px;min-height:56px}
.metric-label{display:block;font-size:10px;line-height:1.5;color:#6c7d6e}
.metric-value{display:block;font-size:16px;font-weight:600;line-height:1.4;color:#284536;margin-top:4px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.metric-income{color:#36764e}.metric-value.metric-over-budget{color:#ae6956}
.metric-status{display:block;margin-top:2px;color:#ae6956;font-size:9px;line-height:1.4}
.wishlist-home-card,.tasks-card{margin-top:17px;padding:0 2px;background:transparent;border:0;border-radius:0}
.wishlist-home-head,.section-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.section-title{font-size:14px;font-weight:600;line-height:1.5;color:#204a33}
.wishlist-home-count,.section-count{font-size:10px;color:#738d77;white-space:nowrap}
.wishlist-home-row{display:flex;align-items:center;gap:10px;padding:11px 0 1px;min-height:34px}
.wishlist-home-row+ .wishlist-home-row{margin-top:8px;padding-top:9px;border-top:1px solid #edf0e9}
.wishlist-home-icon{display:flex;align-items:center;justify-content:center;width:26px;height:28px;flex-shrink:0}
.wishlist-home-bag{width:22px;height:22px}
.wishlist-home-copy{flex:1;min-width:0}.wishlist-home-name{display:block;font-size:12px;color:#2d4934;line-height:1.4;overflow-wrap:anywhere}
.wishlist-home-sub{display:block;font-size:10px;color:#81907e;line-height:1.5;margin-top:2px;overflow-wrap:anywhere}
.wishlist-home-arrow{font-size:19px;color:#84957d;flex-shrink:0}
.tasks-card{border-top:1px solid #e8ede5;padding-top:14px}
.section-head{margin-bottom:3px}
.task-row{display:flex;align-items:center;gap:9px;padding:10px 0;border-bottom:1px solid #edf0e9}
.task-row:last-child{border-bottom:0}.task-row-done{opacity:.68}
.task-icon{display:flex;align-items:center;justify-content:center;width:25px;height:26px;flex-shrink:0}
.task-icon-img{width:18px;height:18px}
.task-text{flex:1;min-width:0}
.task-title{display:block;font-size:12px;line-height:1.5;color:#35503b}
.task-sub{display:block;font-size:10px;line-height:1.5;color:#8a9785;margin-top:2px;overflow-wrap:anywhere}
.task-reward{font-size:9px;line-height:1.5;color:#849b82;white-space:nowrap;flex-shrink:0}
.task-reward.done{color:#708b6e}
.tasks-empty{display:block;font-size:11px;color:#85917f;line-height:1.7;padding:14px 0}
.unconfigured-title{display:block;font-size:15px;font-weight:600;line-height:1.5;color:#244a34}
.unconfigured-sub{display:block;font-size:11px;line-height:1.8;color:#7a8975;margin-top:5px}
.btn-primary{display:flex;align-items:center;justify-content:center;min-height:38px;padding:0 13px;border-radius:10px;background:#315c40;margin-top:12px}
.btn-primary-text{font-size:12px;color:#fff}
.account-sync-banner,.action-sync{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin-top:14px;background:#f8f0e7;border:1px solid #eddfcc;border-radius:12px;color:#8f6b43;font-size:11px;line-height:1.6}
.account-sync-banner text:last-child,.action-sync text:last-child{white-space:nowrap;flex-shrink:0}
@media(max-width:360px){.home-masthead,.home-content{padding-left:14px;padding-right:14px}.financial-panel{padding-left:13px;padding-right:13px}.home-metrics{gap:7px}.metric-value{font-size:15px}.task-title{font-size:11px}.task-reward{font-size:9px}}
@media(prefers-reduced-motion:reduce){.progress-fill{transition:none}}
</style>
