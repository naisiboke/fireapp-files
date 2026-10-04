<template>
  <view class="edit-page">

    <!-- 顶部 -->
    <view class="edit-top">
      <view class="back-btn" @click="back"><text class="back-icon">‹</text></view>
      <view class="top-copy">
        <text class="top-title">{{ editing ? '修改记录' : '记一笔' }}</text>
        <text class="top-sub">{{ draft.type === 'income' ? '记录一笔收入' : '记录一笔支出' }}</text>
      </view>
      <view class="spacer"></view>
    </view>

    <!-- 类型选择 -->
    <view class="type-row">
      <view class="type-card" :class="{ active: draft.type === 'expense' }" @click="setType('expense')">
        <view class="type-mark expense">−</view>
        <view class="type-copy">
          <text class="type-name">支出</text>
          <text class="type-hint">记录一笔花费</text>
        </view>
      </view>
      <view class="type-card" :class="{ active: draft.type === 'income' }" @click="setType('income')">
        <view class="type-mark income">＋</view>
        <view class="type-copy">
          <text class="type-name">收入</text>
          <text class="type-hint">记录一笔进账</text>
        </view>
      </view>
    </view>

    <text class="hint-text">点一个分类，直接输入金额</text>

    <!-- 分类网格 -->
    <view class="cat-grid">
      <view
        v-for="c in categories"
        :key="c.id"
        class="cat-item"
        :class="{ active: draft.category === c.id }"
        @click="selectCategory(c.id)"
      >
        <view class="cat-icon">
          <image class="cat-icon-img" :src="iconUri(c)" mode="aspectFit" />
        </view>
        <text class="cat-label">{{ c.label }}</text>
      </view>
    </view>

    <!-- 底部面板 -->
    <view v-if="draft.category" class="panel" :class="{ collapsed: keyboardCollapsed }">

      <view class="panel-head">
        <view class="panel-cat">
          <image class="panel-cat-icon" :src="iconUri(currentCategory)" mode="aspectFit" />
          <text class="panel-cat-name">{{ currentCategory ? currentCategory.label : '其他' }}</text>
        </view>
        <view class="panel-amount">
          <input class="amount-input" type="digit" v-model="draft.amount" placeholder="0.00" />
          <text class="amount-unit">元</text>
        </view>
        <view class="keyboard-toggle" @click="keyboardCollapsed = !keyboardCollapsed">
          <text class="toggle-text">{{ keyboardCollapsed ? '展开键盘⌄' : '收起键盘⌃' }}</text>
        </view>
      </view>

      <view v-if="draft.type === 'expense'" class="necessity">
        <text class="necessity-legend">这笔支出的必要度 <text class="necessity-opt">选填</text></text>
        <view class="necessity-btns">
          <view
            v-for="(label, key) in necessityLabels"
            :key="key"
            class="necessity-btn"
            :class="{ active: draft.necessity === key }"
            @click="toggleNecessity(key)"
          >
            <text class="necessity-btn-text" :class="{ active: draft.necessity === key }">{{ label }}</text>
          </view>
        </view>
      </view>

      <view class="panel-meta">
        <input class="meta-note" v-model="draft.note" placeholder="添加备注（选填）" maxlength="120" />
        <picker mode="date" :value="draft.date" :end="today" @change="onDateChange">
          <view class="meta-date">{{ draft.date }}</view>
        </picker>
      </view>

      <text v-if="errorText" class="error-text">{{ errorText }}</text>

      <view v-if="!keyboardCollapsed" class="keypad">
        <view v-for="k in keys" :key="k.value" class="key" :class="k.cls" @click="pressKey(k.value)">
          <text class="key-text" :class="k.textCls">{{ k.label }}</text>
        </view>
      </view>

      <view v-if="keyboardCollapsed" class="save-btn fire-button-primary fire-button-lg" @click="submit">
        <text class="save-btn-text">{{ editing ? '保存修改' : '完成' }}</text>
      </view>
    </view>

  </view>
</template>

<script>
import { state, persist } from '@/store/index.js'
import {
  LocalDay, LedgerCategories, SaveExpense, HeroDay, HeroComplete,
} from '@/utils/engine.js'
import { categoryIconUri } from '@/utils/category-icons.js'

const EMPTY_DRAFT = () => ({
  type: 'expense',
  category: null,
  amount: '',
  date: LocalDay(),
  note: '',
  necessity: null,
})

export default {
  data() {
    return {
      editing: false,
      editingId: null,
      draft: EMPTY_DRAFT(),
      today: LocalDay(),
      keyboardCollapsed: false,
      errorText: '',
      keys: [
        { value: '7', label: '7' },
        { value: '8', label: '8' },
        { value: '9', label: '9' },
        { value: 'delete', label: '⌫', cls: 'delete', textCls: 'small' },
        { value: '4', label: '4' },
        { value: '5', label: '5' },
        { value: '6', label: '6' },
        { value: 'clear', label: '清空', cls: 'clear', textCls: 'small' },
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
        { value: 'done', label: '完成', cls: 'done', textCls: 'done' },
        { value: '.', label: '.' },
        { value: '0', label: '0', cls: 'zero' },
      ],
      necessityLabels: { necessary: '必要', comfort: '改善生活', impulse: '一时心动' },
    }
  },

  computed: {
    categories() {
      try { return LedgerCategories(state, this.draft.type) }
      catch (e) { return [] }
    },
    currentCategory() {
      const id = this.draft.category
      return this.categories.find(function (c) { return c.id === id }) || null
    },
  },

  onLoad(options) {
    if (options && options.id) {
      const record = (state.ledger || []).find(function (x) { return x.id === options.id })
      if (record) {
        this.editing = true
        this.editingId = record.id
        this.draft = {
          type: record.type || 'expense',
          category: record.category,
          amount: (record.cents / 100).toFixed(2),
          date: record.date,
          note: record.note || '',
          necessity: record.necessity || null,
        }
      }
    }
  },

  methods: {
    back() {
      if (this._backPending) return
      this._backPending = true
      uni.redirectTo({
        url: '/pages/ledger/index',
        complete: () => { setTimeout(() => { this._backPending = false }, 300) }
      })
    },

    setType(type) {
      if (this.draft.type === type) return
      this.draft = {
        type: type,
        category: null,
        amount: '',
        date: this.draft.date,
        note: '',
        necessity: null,
      }
      this.keyboardCollapsed = false
      this.errorText = ''
    },

    selectCategory(id) {
      const changed = this.draft.category && this.draft.category !== id
      if (changed) {
        this.draft.amount = ''
        this.draft.note = ''
        this.draft.necessity = null
      }
      this.draft.category = id
      this.keyboardCollapsed = false
      this.errorText = ''
    },

    toggleNecessity(key) {
      this.draft.necessity = this.draft.necessity === key ? null : key
    },

    onDateChange(e) {
      this.draft.date = e.detail.value
    },

    iconUri(c) {
      if (!c) return categoryIconUri('other')
      const color = this.draft.type === 'income' ? '#25613f' : '#315840'
      return categoryIconUri(c.icon || c.id, color)
    },

    pressKey(k) {
      const cur = String(this.draft.amount || '')
      if (k === 'delete') {
        this.draft.amount = cur.slice(0, -1)
      } else if (k === 'clear') {
        this.draft.amount = ''
      } else if (k === 'done') {
        this.submit()
      } else if (k === '.') {
        if (!cur.includes('.')) {
          this.draft.amount = (cur || '0') + '.'
        }
      } else {
        let next
        if (cur === '0') next = k
        else next = cur + k
        if (/^\d{1,9}(\.\d{0,2})?$/.test(next) && Number(next) <= 100000000) {
          this.draft.amount = next
        }
      }
      this.errorText = ''
    },

    submit() {
      this.errorText = ''

      if (!this.draft.category) {
        this.errorText = '请先选择一个分类'
        return
      }
      if (!this.draft.amount || Number(this.draft.amount) <= 0) {
        this.errorText = '请输入有效金额'
        return
      }

      const payload = {
        id: this.editing ? this.editingId : undefined,
        type: this.draft.type,
        category: this.draft.category,
        amount: this.draft.amount,
        date: this.draft.date,
        note: this.draft.note,
        necessity: this.draft.necessity,
      }

      if (!SaveExpense(state, payload)) {
        this.errorText = '保存失败，请检查金额和日期'
        return
      }

      try {
        HeroDay(state)
        if (this.draft.type === 'expense' && this.draft.date === LocalDay()) {
          HeroComplete(state, 'ledger')
        }
      } catch (e) { /* ignore */ }

      persist()
      uni.showToast({ title: this.editing ? '已保存' : '已记账', icon: 'success' })

      if (this.editing) {
        setTimeout(function () { uni.navigateBack() }, 400)
        return
      }

      const keepType = this.draft.type
      const keepDate = this.draft.date
      this.draft = {
        type: keepType,
        category: null,
        amount: '',
        date: keepDate,
        note: '',
        necessity: null,
      }
      this.keyboardCollapsed = false
      this.errorText = ''
    },
  },

  onBackPress() {
    return false
  },
}
</script>

<style>
.edit-page {
  min-height: 100vh;
  padding: 60px 18px 40px;
  background: linear-gradient(165deg, #e2ebda, #f2f3e9 62%, #dce7d8);
  box-sizing: border-box;
}

.edit-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
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
.back-icon { font-size: 26px; line-height: 1; color: #183d31; margin-top: -3px; }
.top-copy { flex: 1; text-align: center; }
.top-title { display: block; font-size: 17px; font-weight: 600; color: #183d31; }
.top-sub { display: block; font-size: 11px; color: #687f6b; margin-top: 2px; }
.spacer { width: 44px; flex-shrink: 0; }

.type-row { display: flex; gap: 10px; margin-bottom: 16px; }
.type-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 11px;
  background: #e5ebdf;
  border: 1px solid #ccd9c4;
  border-radius: 14px;
  min-height: 60px;
}
.type-card.active { background: #294f3d; border-color: #294f3d; }
.type-mark {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: #d5e1cc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  line-height: 1;
  color: #29543b;
  flex-shrink: 0;
}
.type-mark.income { background: #cfe5d5; }
.type-card.active .type-mark { background: #d9e8cc; color: #234e3e; }
.type-copy { flex: 1; min-width: 0; }
.type-name { display: block; font-size: 14px; font-weight: 600; color: #183d31; }
.type-card.active .type-name { color: #f2f5e9; }
.type-hint { display: block; font-size: 10px; color: #687f6b; margin-top: 2px; }
.type-card.active .type-hint { color: #c0d1b7; }

.hint-text {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #687f6b;
  margin-bottom: 14px;
}

.cat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px 8px;
  padding-bottom: 24px;
}
.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 2px;
  background: #e2eadc;
  border: 1px solid #d1dec9;
  border-radius: 16px;
  min-height: 90px;
  justify-content: center;
}
.cat-item.active { background: #ccdcbc; border-color: #86a277; }
.cat-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(145deg, #d2dfc5, #eaf0e2);
  border: 1px solid #c5d5b8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cat-icon-img { width: 22px; height: 22px; }
.cat-label {
  font-size: 11px;
  color: #2b4c37;
  text-align: center;
  line-height: 1.3;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 8;
  max-width: 460px;
  margin: 0 auto;
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  background: #e3ebdd;
  border: 1px solid #bed0b4;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -10px 30px rgba(25,60,48,0.13);
  box-sizing: border-box;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.panel-cat { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.panel-cat-icon { width: 20px; height: 20px; }
.panel-cat-name { font-size: 12px; color: #365641; }
.panel-amount {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
}
.amount-input {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 30px;
  font-weight: 500;
  color: #183d31;
  background: transparent;
  padding: 4px 0;
}
.amount-unit { font-size: 12px; color: #687f6b; }
.keyboard-toggle {
  padding: 5px 8px;
  border-radius: 8px;
  background: #d0ddc8;
  flex-shrink: 0;
}
.toggle-text { font-size: 11px; color: #294834; }

.necessity { margin-bottom: 12px; }
.necessity-legend {
  display: block;
  font-size: 11px;
  color: #365641;
  margin-bottom: 6px;
}
.necessity-opt { color: #7b8d72; margin-left: 6px; font-size: 10px; }
.necessity-btns { display: flex; gap: 6px; }
.necessity-btn {
  flex: 1;
  padding: 8px 4px;
  border: 1px solid #b9cbaa;
  border-radius: 8px;
  background: #e6eedc;
  display: flex;
  justify-content: center;
}
.necessity-btn.active { background: #355b40; border-color: #355b40; }
.necessity-btn-text { font-size: 11px; color: #49633e; }
.necessity-btn-text.active { color: #f1f4e5; }

.panel-meta { display: flex; gap: 8px; margin-bottom: 10px; }
.meta-note {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  background: #d6e2ce;
  border-radius: 8px;
  font-size: 14px;
  color: #294834;
}
.meta-date {
  padding: 10px 14px;
  background: #d6e2ce;
  border-radius: 8px;
  font-size: 13px;
  color: #294834;
  white-space: nowrap;
}

.error-text { display: block; font-size: 12px; color: #ad413b; margin: 4px 0 8px; }

.keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 52px 52px 52px 52px;
  gap: 6px;
  margin-top: 8px;
}
.key {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff3e8;
  border: 1px solid #ccdac2;
  border-radius: 12px;
}
.key:active { background: #cadcbd; }
.key.delete, .key.clear { background: #d0ddc8; }
.key.done {
  grid-column: 4;
  grid-row: 3 / span 2;
  background: #2b563e;
  border-color: #2b563e;
  border-radius: 14px;
}
.key.zero { grid-column: 2 / span 2; }
.key-text { font-size: 22px; color: #244633; font-weight: 500; }
.key-text.small { font-size: 14px; }
.key-text.done { color: #f4f5e5; font-size: 15px; }

.save-btn {
  margin-top: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #294f3d;
  display: flex;
  justify-content: center;
}
.save-btn-text { color: #f2f5e9; font-size: 15px; font-weight: 500; }
</style>