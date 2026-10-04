<template>
  <view class="ledger-page">

    <!-- 顶部：返回 + 标题 -->
    <view class="head">
      <view class="back-btn" @click="back"><text class="back-icon">‹</text></view>
      <text class="head-title">记账</text>
      <view class="spacer"></view>
    </view>

    <text class="intro-h1">记账</text>
    <text class="intro-sub">安排本月预算，记下每笔收支。</text>

    <!-- 月份选择 -->
    <view class="month-picker">
      <view class="month-btn" @tap="prevMonth"><text class="month-icon">‹</text></view>
      <picker mode="date" fields="month" :value="month" :end="maxMonth" @change="onMonthChange">
        <view class="month-value">{{ monthText }}</view>
      </picker>
      <view class="month-btn" :class="{ disabled: month >= maxMonth }" @tap="nextMonth">
        <text class="month-icon">›</text>
      </view>
    </view>

    <!-- 预算面板：未设置时在顶部 -->
    <view v-if="!targetsReady" class="budget-section budget-top">
      <view class="budget-toggle" @tap="toggleBudget">
        <view class="budget-toggle-left">
          <text class="budget-toggle-label">先填写本月预算</text>
          <text class="budget-toggle-hint">首次记账前必须填写</text>
        </view>
        <text class="budget-chevron">{{ budgetExpanded ? '⌃' : '⌄' }}</text>
      </view>

      <view v-if="budgetExpanded" class="budget-body">
        <view class="budget-field">
          <text class="budget-label">本月消费预算（元）</text>
          <input class="budget-input" type="digit" v-model="budgetInput" placeholder="例如 3000" />
        </view>
        <view class="budget-field">
          <text class="budget-label">本月收入预算（元）</text>
          <input class="budget-input" type="digit" v-model="incomeInput" placeholder="例如 10000" />
        </view>
        <view class="budget-btn fire-button-primary" @tap="saveTargets">
          <text class="budget-btn-text">保存本月预算</text>
        </view>
        <text class="budget-note">修改预算不会影响已有记录，只作为“是否超额”的判断基准。</text>
      </view>
    </view>

    <!-- 月度总览 -->
    <view class="overview">
      <view class="ov-item">
        <text class="ov-label">本月消费</text>
        <text class="ov-num expense">{{ fmt(expenseTotal / 100) }}<text class="ov-unit"> 元</text></text>
        <text class="ov-count">{{ expenseCount }} 笔记录</text>
      </view>
      <view class="ov-item">
        <text class="ov-label">本月收入</text>
        <text class="ov-num income">{{ fmt(incomeTotal / 100) }}<text class="ov-unit"> 元</text></text>
        <text class="ov-count">{{ incomeCount }} 笔记录</text>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="section-head">
      <text class="section-title">收支记录</text>
      <text class="section-count">{{ records.length }} 笔</text>
    </view>

    <view v-if="records.length === 0" class="empty">
      <text class="empty-title">这个月还没有收支记录</text>
      <text class="empty-desc">
        {{ targetsReady ? '点击右下角 ＋ 开启你的第一笔记账。' : '先填写上方预算，再开始记账。' }}
      </text>
    </view>

    <view v-else class="record-list">
      <view v-for="x in records" :key="x.id" class="record-entry">
        <view class="record-row">
          <view class="record-icon" :class="x.type === 'income' ? 'income' : 'expense'">
            <image class="record-icon-img" :src="iconUri(x)" mode="aspectFit" />
          </view>
          <view class="record-copy">
            <text class="record-cat">{{ catLabel(x) }}</text>
            <text class="record-meta">
              {{ x.type === 'income' ? '收入' : '消费' }}{{ x.necessity ? ' · ' + necessityText(x.necessity) : '' }} · {{ x.date }}{{ x.note ? ' · ' + x.note : '' }}
            </text>
          </view>
          <text class="record-amt" :class="x.type === 'income' ? 'income' : 'expense'">
            {{ x.type === 'income' ? '+' : '−' }}{{ fmt(x.cents / 100) }}
          </text>
        </view>
        <view class="record-actions">
          <view class="action-btn fire-button-outline fire-button-sm" @tap="editRecord(x)"><text class="action-text">修改</text></view>
          <view class="action-btn" @tap="confirmDelete(x)"><text class="action-text delete">删除</text></view>
        </view>
      </view>
    </view>

    <!-- 分类占比 -->
    <view v-if="expenseCats.length || incomeCats.length" class="section">
      <text class="section-title">分类占比</text>

      <view v-if="expenseCats.length" class="cat-group">
        <text class="cat-group-title expense">消费</text>
        <view v-for="c in expenseCats" :key="'e-' + c.key" class="cat-stat">
          <view class="cat-row">
            <text class="cat-name">{{ c.label }}</text>
            <text class="cat-amount">{{ fmt(c.cents / 100) }} 元 <text class="cat-pct">{{ c.percent.toFixed(1) }}%</text></text>
          </view>
          <view class="cat-bar"><view class="cat-bar-fill expense" :style="{ width: c.percent + '%' }"></view></view>
        </view>
      </view>

      <view v-if="incomeCats.length" class="cat-group">
        <text class="cat-group-title income">收入</text>
        <view v-for="c in incomeCats" :key="'i-' + c.key" class="cat-stat">
          <view class="cat-row">
            <text class="cat-name">{{ c.label }}</text>
            <text class="cat-amount">{{ fmt(c.cents / 100) }} 元 <text class="cat-pct">{{ c.percent.toFixed(1) }}%</text></text>
          </view>
          <view class="cat-bar"><view class="cat-bar-fill income" :style="{ width: c.percent + '%' }"></view></view>
        </view>
      </view>
    </view>

    <!-- 预算面板：已设置后移到底部 -->
    <view v-if="targetsReady" class="budget-section budget-bottom">
      <view class="budget-toggle" @tap="toggleBudget">
        <view class="budget-toggle-left">
          <text class="budget-toggle-label">本月预算</text>
          <text class="budget-toggle-hint">{{ budgetText }} / {{ incomeText }}</text>
        </view>
        <text class="budget-chevron">{{ budgetExpanded ? '⌃' : '⌄' }}</text>
      </view>

      <view v-if="budgetExpanded" class="budget-body">
        <view class="budget-field">
          <text class="budget-label">本月消费预算（元）</text>
          <input class="budget-input" type="digit" v-model="budgetInput" placeholder="例如 3000" />
        </view>
        <view class="budget-field">
          <text class="budget-label">本月收入预算（元）</text>
          <input class="budget-input" type="digit" v-model="incomeInput" placeholder="例如 10000" />
        </view>
        <view class="budget-btn" @tap="saveTargets">
          <text class="budget-btn-text">保存本月预算</text>
        </view>
        <text class="budget-note">修改预算不会影响已有记录，只作为“是否超额”的判断基准。</text>
      </view>
    </view>

    <text class="safe-note">保存今天的支出，自动完成记账任务。\n账本不会直接扣减已记录的投资资产。</text>

    <!-- FAB -->
    <view class="fab" :class="{ 'fab-disabled': !targetsReady }" @tap="goAdd">
      <text class="fab-icon">＋</text>
    </view>


  </view>
</template>

<script>
import { state, persist } from '@/store/index.js'
import {
  LocalDay, LedgerSummary, LedgerCategoryLabel, LedgerCategories,
  SaveMonthlyTargets, DeleteExpense,
} from '@/utils/engine.js'
import { categoryIconUri } from '@/utils/category-icons.js'

const NECESSITY_TEXT = { necessary: '必要', comfort: '改善生活', impulse: '一时心动' }


export default {
  data() {
    return {
      state: state,
      month: '',
      maxMonth: '',
      budgetInput: '',
      incomeInput: '',
      budgetExpanded: false,
    }
  },

  computed: {
    monthText() {
      if (!this.month) return ''
      const parts = this.month.split('-')
      return parts[0] + '年' + Number(parts[1]) + '月'
    },
    targetsReady() {
      const t = (state.monthlyTargets && state.monthlyTargets[this.month]) || {}
      return Number.isSafeInteger(t.expense) && t.expense > 0 &&
             Number.isSafeInteger(t.income) && t.income > 0
    },
    budgetText() {
      const t = (state.monthlyTargets && state.monthlyTargets[this.month]) || {}
      return Number.isSafeInteger(t.expense) ? '消费 ' + (t.expense / 100).toFixed(0) + ' 元' : ''
    },
    incomeText() {
      const t = (state.monthlyTargets && state.monthlyTargets[this.month]) || {}
      return Number.isSafeInteger(t.income) ? '收入 ' + (t.income / 100).toFixed(0) + ' 元' : ''
    },
    summary() {
      try { return LedgerSummary(state, this.month, 'expense') }
      catch (e) { return { records: [], total: 0, count: 0, categories: [] } }
    },
    incomeSummary() {
      try { return LedgerSummary(state, this.month, 'income') }
      catch (e) { return { records: [], total: 0, count: 0, categories: [] } }
    },
    expenseTotal() { return this.summary.total },
    expenseCount() { return this.summary.count },
    expenseCats() { return this.summary.categories },
    incomeTotal() { return this.incomeSummary.total },
    incomeCount() { return this.incomeSummary.count },
    incomeCats() { return this.incomeSummary.categories },
    records() {
      const e = this.summary.records || []
      const i = this.incomeSummary.records || []
      return e.concat(i).sort(function (a, b) { return b.date.localeCompare(a.date) })
    },
  },

  onLoad() {
    const today = LocalDay()
    this.maxMonth = today.slice(0, 7)
    this.month = this.maxMonth
    this.loadTargetInputs()
    if (!this.targetsReady) this.budgetExpanded = true
  },

  onShow() {
    this.loadTargetInputs()
    if (!this.targetsReady && !this.budgetExpanded) {
      this.budgetExpanded = true
    }
  },

  methods: {
    back() {
      if (this._navigating) return
      this._navigating = true
      uni.switchTab({
        url: '/pages/tools/index',
        complete: () => { setTimeout(() => { this._navigating = false }, 300) }
      })
    },

    toggleBudget() {
      this.budgetExpanded = !this.budgetExpanded
    },

    loadTargetInputs() {
      const t = (state.monthlyTargets && state.monthlyTargets[this.month]) || {}
      this.budgetInput = Number.isSafeInteger(t.expense) ? String(t.expense / 100) : ''
      this.incomeInput = Number.isSafeInteger(t.income) ? String(t.income / 100) : ''
    },

    saveTargets() {
      if (!SaveMonthlyTargets(state, this.month, this.budgetInput, this.incomeInput)) {
        uni.showToast({ title: '请填写两个有效金额', icon: 'none' })
        return
      }
      persist()
      this.budgetExpanded = false
      uni.showToast({ title: '预算已保存，可以开始记账', icon: 'success' })
    },

    onMonthChange(e) {
      const v = e.detail.value
      if (v && v.length >= 7) {
        this.month = v.slice(0, 7)
        this.loadTargetInputs()
        this.budgetExpanded = !this.targetsReady
      }
    },

    prevMonth() {
      const d = new Date(this.month + '-01T12:00:00')
      d.setMonth(d.getMonth() - 1)
      const m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      if (m >= '1900-01') {
        this.month = m
        this.loadTargetInputs()
        this.budgetExpanded = !this.targetsReady
      }
    },

    nextMonth() {
      if (this.month >= this.maxMonth) return
      const d = new Date(this.month + '-01T12:00:00')
      d.setMonth(d.getMonth() + 1)
      const m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      if (m <= this.maxMonth) {
        this.month = m
        this.loadTargetInputs()
        this.budgetExpanded = !this.targetsReady
      }
    },

    goAdd() {
      if (!this.targetsReady) {
        uni.showToast({ title: '请先填写本月预算', icon: 'none' })
        this.budgetExpanded = true
        return
      }
      uni.navigateTo({ url: '/pages/ledger/edit' })
    },

    editRecord(x) {
      uni.navigateTo({ url: '/pages/ledger/edit?id=' + x.id })
    },

    confirmDelete(x) {
      uni.showModal({
        title: '删除这笔记录？',
        content: this.catLabel(x) + ' · ' + this.fmt(x.cents / 100) + ' 元',
        confirmColor: '#a15f63',
        success: function (res) {
          if (res.confirm && DeleteExpense(state, x.id)) {
            persist()
            uni.showToast({ title: '已删除', icon: 'none' })
          }
        },
      })
    },

    catLabel(x) {
      try { return LedgerCategoryLabel(state, x) }
      catch (e) { return x.category || '其他' }
    },

    iconUri(x) {
      try {
        const type = x.type || 'expense'
        const cats = LedgerCategories(state, type, true)
        const cat = cats.find(function (c) { return c.id === x.category })
        const key = cat ? cat.icon || cat.id : (type === 'income' ? 'incomeother' : 'other')
        return categoryIconUri(key, type === 'income' ? '#25613f' : '#426052')
      } catch (e) { return categoryIconUri('other') }
    },

    necessityText(k) { return NECESSITY_TEXT[k] || '' },

    fmt(n) {
      const v = Number(n)
      if (!Number.isFinite(v)) return '0.00'
      return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
  },

  onBackPress() {
    // 交给系统处理返回，避免在回调里再次 navigateBack 造成递归。
    return false
  },
}
</script>

<style>
.ledger-page {
  min-height: 100vh;
  padding: 60px 24px 180px;   /* 底部留出 tabBar 空间 */
  background: #eef2e8;
  box-sizing: border-box;
}

/* 顶部 */
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.back-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #e5eddd;
  border: 1px solid #d0ddc5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.back-icon { font-size: 26px; line-height: 1; color: #243830; margin-top: -3px; }
.head-title { font-size: 16px; color: #52605a; }
.spacer { width: 44px; }

.intro-h1 { display: block; font-size: 28px; font-weight: 700; color: #143e37; letter-spacing: 0.5px; }
.intro-sub { display: block; font-size: 13px; color: #6c7e68; margin: 8px 0 20px; }

/* 月份选择 */
.month-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #e5eddd;
  border-radius: 14px;
  border: 1px solid #d0ddc5;
}
.month-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #d6e2ce;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.month-btn.disabled { opacity: 0.35; }
.month-icon { font-size: 22px; color: #294834; line-height: 1; }
.month-value { font-size: 16px; font-weight: 600; color: #243830; }

/* 月度总览 */
.overview {
  display: flex;
  gap: 16px;
  padding: 18px;
  background: #e5eddd;
  border: 1px solid #d0ddc5;
  border-radius: 20px;
  margin-bottom: 16px;
}
.ov-item { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.ov-label { font-size: 12px; color: #52605a; }
.ov-num { font-size: 22px; font-weight: 700; color: #243830; line-height: 1.3; }
.ov-num.expense { color: #8a4f16; }
.ov-num.income { color: #25613f; }
.ov-unit { font-size: 12px; font-weight: 400; }
.ov-count { font-size: 11px; color: #6c7e68; }

/* 记录列表 */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 12px;
}
.section-title { display: block; font-size: 15px; font-weight: 600; color: #243830; }
.section-count { font-size: 12px; color: #6c7e68; }

.empty { padding: 60px 16px; text-align: center; }
.empty-title { display: block; font-size: 15px; color: #243830; }
.empty-desc { display: block; font-size: 13px; color: #6c7e68; margin-top: 8px; line-height: 1.6; }

.record-list { display: flex; flex-direction: column; gap: 10px; }
.record-entry {
  background: #e8eee2;
  border: 1px solid #d6e0cd;
  border-radius: 14px;
  overflow: hidden;
}
.record-row { display: flex; align-items: center; gap: 12px; padding: 14px; }
.record-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #d4e2c9;
}
.record-icon.income { background: #cfe5d5; }
.record-icon-img { width: 20px; height: 20px; }

.record-copy { flex: 1; min-width: 0; }
.record-cat { display: block; font-size: 14px; font-weight: 500; color: #243830; }
.record-meta {
  display: block;
  font-size: 11px;
  color: #6c7e68;
  margin-top: 4px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-amt { font-size: 15px; font-weight: 600; flex-shrink: 0; }
.record-amt.expense { color: #8a4f16; }
.record-amt.income { color: #25613f; }

.record-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid #d6e0cd;
}
.action-btn { padding: 8px 12px; }
.action-text { font-size: 12px; color: #648575; }
.action-text.delete { color: #a77568; }

/* 分类占比 */
.section { margin-top: 24px; }
.cat-group { margin-bottom: 20px; }
.cat-group-title {
  display: inline-block;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  margin-bottom: 10px;
}
.cat-group-title.expense { background: #fff3df; color: #8a4f16; }
.cat-group-title.income { background: #e3f2e7; color: #25613f; }

.cat-stat { margin: 10px 0; }
.cat-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 13px; }
.cat-name { color: #243830; }
.cat-amount { color: #243830; font-weight: 500; }
.cat-pct { margin-left: 6px; color: #6c7e68; font-size: 11px; font-weight: 400; }
.cat-bar { height: 6px; margin-top: 6px; border-radius: 3px; background: #e5e9e0; overflow: hidden; }
.cat-bar-fill { height: 100%; border-radius: 3px; }
.cat-bar-fill.expense { background: #8a4f16; }
.cat-bar-fill.income { background: #25613f; }

/* 预算面板 */
.budget-section {
  background: #e2eadd;
  border: 1px solid #c4d4b9;
  border-radius: 16px;
  overflow: hidden;
}
.budget-top {
  margin-bottom: 16px;
  border-color: #9aaf86;
  box-shadow: 0 4px 14px rgba(154,175,134,0.18);
}
.budget-bottom { margin-top: 32px; }

.budget-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  gap: 12px;
}
.budget-toggle:active { background: #dbe5d2; }
.budget-toggle-left { flex: 1; min-width: 0; }
.budget-toggle-label { display: block; font-size: 14px; font-weight: 600; color: #243830; }
.budget-top .budget-toggle-label { color: #4a6b3e; }
.budget-toggle-hint { display: block; font-size: 11px; color: #6c7e68; margin-top: 4px; }
.budget-chevron { font-size: 18px; color: #648575; line-height: 1; flex-shrink: 0; }

.budget-body { padding: 14px 18px 18px; border-top: 1px solid #d6e0cd; }
.budget-field { padding: 8px 0; }
.budget-label { display: block; font-size: 12px; color: #52605a; margin-bottom: 8px; }

.budget-input {
  width: 100%;
  height: 48px;
  line-height: 48px;
  font-size: 16px;
  color: #243830;
  padding: 0 14px;
  background: #d6e2ce;
  border-radius: 10px;
  box-sizing: border-box;
}
.budget-input::placeholder { color: #8b9489; }

.budget-btn {
  margin-top: 12px;
  padding: 12px;
  border-radius: 10px;
  background: #294f3d;
  display: flex;
  justify-content: center;
  align-items: center;
}
.budget-btn-text { font-size: 14px; font-weight: 500; color: #f2f5e9; }
.budget-note { display: block; font-size: 11px; color: #6c7e68; line-height: 1.6; margin-top: 10px; }

.safe-note {
  display: block;
  font-size: 11px;
  color: #8b9489;
  line-height: 1.8;
  margin-top: 20px;
  white-space: pre-line;
}

/* FAB */
.fab {
  position: fixed;
  right: 20px;
  bottom: calc(120px + env(safe-area-inset-bottom));   /* 抬高到 tabBar 上方 */
  width: 60px;
  height: 60px;
  border-radius: 30px;
  background: #294f3d;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(41,79,61,0.28);
  z-index: 11;
  transition: background 0.2s, box-shadow 0.2s;
}
.fab.fab-disabled {
  background: #c5ccc0;
  box-shadow: 0 4px 12px rgba(120,140,120,0.20);
}
.fab-icon {
  color: #f4f5e5;
  font-size: 32px;
  font-weight: 300;
  line-height: 1;
  margin-top: -4px;
}
.fab.fab-disabled .fab-icon { color: #ffffff; }

/* 自定义底部 TabBar */
</style>