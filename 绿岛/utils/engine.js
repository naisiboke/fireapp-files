// ---------- 计算引擎 ----------
export function addCalendarMonths(start, months) {
  const date = new Date(start), day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return date
}

export function SavingsProjection(assets, target, deposit, annualRate) {
  const rate = Math.pow(1 + annualRate / 100, 1 / 12) - 1
  let value = assets, months = 0
  while (value + 1e-7 < target && months < 1200) {
    value = value * (1 + rate) + deposit
    months++
  }
  const reached = value + 1e-7 >= target
  return {
    target,
    months: reached ? months : null,
    years: reached ? (months / 12).toFixed(1) : null,
    progress: Math.min(100, Math.max(0, assets / target * 100)),
    date: reached ? addCalendarMonths(new Date(), months) : null,
    monthlySaving: deposit,
  }
}

export function FireEngine(f) {
  const retirementExpense = Number.isFinite(f.retirementExpense) ? f.retirementExpense : f.expense
  const deposit = Number.isFinite(f.monthlyDeposit) ? f.monthlyDeposit : Math.max(0, f.income - f.expense)
  const target = retirementExpense * 12 / (f.withdrawal / 100)
  return SavingsProjection(f.assets, target, deposit, f.rate)
}

export function GoalEngine(g) {
  const r = SavingsProjection(g.assets, g.amount, g.monthlyDeposit, g.rate)
  const n = g.expectedMonths
  const rate = Math.pow(1 + g.rate / 100, 1 / 12) - 1
  const growth = Math.pow(1 + rate, n)
  const factor = Math.abs(rate) < 1e-12 ? n : Math.expm1(n * Math.log1p(rate)) / rate
  const requiredMonthly = r.months === 0 ? 0 : Math.max(0, (g.amount - g.assets * growth) / factor)
  const projectedAtExpected = g.assets * growth + g.monthlyDeposit * factor
  return {
    ...r,
    requiredMonthly,
    projectedAtExpected,
    shortfall: r.months === 0 ? 0 : Math.max(0, g.amount - projectedAtExpected),
    onTime: r.months !== null && r.months <= n,
  }
}

// ---------- 日期 ----------
export function LocalDay(date) {
  if (!date) date = new Date()
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0')
}

// ---------- Hero 每日任务 ----------
export const HERO_POOL = ['assets', 'wishlist', 'savings', 'read']
export const HERO_WEIGHTS = { assets: 2, wishlist: 1, savings: 2, read: 6 }

function weightedHeroTask(exclude, current) {
  const candidates = HERO_POOL.filter(function (id) { return id !== exclude && id !== current })
  const pool = candidates.length ? candidates : HERO_POOL.filter(function (id) { return id !== exclude })
  let total = 0
  for (const id of pool) total += (HERO_WEIGHTS[id] || 1)
  let pick = Math.random() * total
  for (const id of pool) {
    pick -= HERO_WEIGHTS[id] || 1
    if (pick < 0) return id
  }
  return pool[pool.length - 1]
}

export function HeroDay(s, day) {
  if (!day) day = LocalDay()
  if (!s.hero || s.hero.version !== 1 ||
      !Array.isArray(s.hero.slots) || s.hero.slots.length !== 2 ||
      s.hero.slots.some(function (x) { return HERO_POOL.indexOf(x.id) < 0 }) ||
      s.hero.slots[0].id === s.hero.slots[1].id) {
    s.hero = {
      version: 1,
      day: day,
      slots: [{ id: 'assets', done: false }, { id: 'read', done: false }],
      ledgerDone: false,
      log: [],
      actionDays: [],
      totalCompleted: 0,
    }
    return true
  }
  const h = s.hero
  if (day <= h.day) return false
  h.slots.forEach(function (slot, index) {
    if (slot.done) {
      const other = h.slots[1 - index].id
      slot.id = weightedHeroTask(other, slot.id)
      slot.done = false
    }
  })
  h.day = day
  h.ledgerDone = false
  return true
}

export function HeroComplete(s, id, day) {
  if (!day) day = LocalDay()
  HeroDay(s, day)
  const h = s.hero
  if (day !== h.day) return false
  if (id === 'ledger') {
    if (h.ledgerDone) return false
    h.ledgerDone = true
  } else {
    const slot = h.slots.find(function (x) { return x.id === id })
    if (!slot || slot.done) return false
    slot.done = true
  }
  s.exp += 10
  h.totalCompleted++
  if (h.actionDays.indexOf(day) < 0) h.actionDays.push(day)
  h.log.push({ id: id, day: day, reward: 10 })
  if (h.log.length > 200) h.log.shift()
  return true
}

export const HERO_REALMS = [
  '铜皮境', '草根境', '柳筋境', '骨气境', '筑庐境',
  '洞府境', '观海境', '龙门境', '金丹境', '元婴境',
  '玉璞境', '仙人境', '飞升境', '合道境', '十五境不朽境',
]

export function HeroLevel(exp) {
  const total = Number.isFinite(exp) ? Math.max(0, Math.floor(exp)) : 0
  let level = 1, threshold = 0
  while (level < 15 && total >= threshold + level * 500) {
    threshold += level * 500
    level++
  }
  const max = level === 15
  const required = max ? null : level * 500
  const current = total - threshold
  return {
    level: level,
    name: HERO_REALMS[level - 1],
    total: total,
    current: current,
    required: required,
    max: max,
    progress: max ? 100 : (current / required) * 100,
  }
}

// ---------- 分类 ----------
export const EXPENSE_CATEGORIES = {
  food: '餐饮', shopping: '购物', life: '日常生活', travel: '交通旅行',
  groceries: '蔬菜', fruit: '水果', snack: '零食', sport: '运动',
  fun: '娱乐', phone: '通讯', clothes: '服饰', beauty: '护理',
  housing: '住房', home: '居家', children: '孩子', family: '家人',
  social: '社交', holiday: '旅行', digital: '数码', car: '汽车',
  medical: '医疗', books: '书籍', learning: '学习', pets: '宠物',
  gifts: '礼物', work: '办公', repair: '维修', donation: '公益', other: '其他',
}

export const INCOME_CATEGORIES = {
  salary: '工资', parttime: '兼职', investment: '理财',
  giftmoney: '礼金', incomeother: '其他',
}

export function LedgerCategories(s, type, includeHidden) {
  if (!type) type = 'expense'
  if (!includeHidden) includeHidden = false
  if (type !== 'expense' && type !== 'income') return []
  let categories
  if (s.ledgerCategories && s.ledgerCategories[type]) {
    categories = s.ledgerCategories[type]
  } else {
    const source = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    categories = Object.entries(source).map(function (entry) {
      return { id: entry[0], label: entry[1], icon: entry[0], enabled: true }
    })
  }
  return categories.filter(function (x) { return includeHidden || x.enabled })
}

export function LedgerCategoryLabel(s, record) {
  const list = LedgerCategories(s, record.type || 'expense', true)
  const found = list.find(function (x) { return x.id === record.category })
  return found ? found.label : '其他'
}

export function LedgerSummary(s, month, type) {
  if (!month) month = LocalDay().slice(0, 7)
  if (!type) type = 'expense'
  const records = (s.ledger || [])
    .filter(function (x) {
      return x.date.indexOf(month) === 0 && (x.type || 'expense') === type
    })
    .sort(function (a, b) { return b.date.localeCompare(a.date) })
  let total = 0
  for (const r of records) total += r.cents
  const categories = LedgerCategories(s, type, true).map(function (cat) {
    let cents = 0
    for (const r of records) if (r.category === cat.id) cents += r.cents
    return {
      key: cat.id,
      label: cat.label,
      cents: cents,
      percent: total ? (cents / total) * 100 : 0,
    }
  }).filter(function (x) { return x.cents > 0 }).sort(function (a, b) { return b.cents - a.cents })
  return { records: records, total: total, count: records.length, categories: categories }
}

// ---------- 账目保存 ----------
export function SaveExpense(s, entry, day) {
  if (!day) day = LocalDay()
  const raw = String(entry.amount == null ? '' : entry.amount).trim()
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return false
  const amount = Number(raw)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) return false
  const date = String(entry.date || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > day) return false
  const type = entry.type || 'expense'
  if (type !== 'expense' && type !== 'income') return false
  const cat = LedgerCategories(s, type, true).find(function (x) { return x.id === entry.category })
  if (!cat) return false
  const note = String(entry.note || '').trim()
  if (note.length > 120) return false
  if (!Array.isArray(s.ledger)) s.ledger = []
  const record = {
    id: entry.id || 'expense-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    cents: Math.round(amount * 100),
    category: entry.category,
    type: type,
    date: date,
    note: note,
    necessity: type === 'expense' ? (entry.necessity || null) : null,
  }
  if (entry.id) {
    const idx = s.ledger.findIndex(function (x) { return x.id === entry.id })
    if (idx < 0) return false
    s.ledger[idx] = record
  } else {
    s.ledger.push(record)
  }
  HeroDay(s, day)
  if (type === 'expense' && date === day) HeroComplete(s, 'ledger', day)
  return true
}

export function DeleteExpense(s, id) {
  if (!Array.isArray(s.ledger)) return false
  const idx = s.ledger.findIndex(function (x) { return x.id === id })
  if (idx < 0) return false
  s.ledger.splice(idx, 1)
  return true
}

// ---------- 资产 ----------
export function OrderedAssets(s) {
  return (s.assetHistory || []).slice().sort(function (a, b) {
    return a.date.localeCompare(b.date) || a.createdAt - b.createdAt
  })
}

export function SyncLatestAsset(s) {
  const list = OrderedAssets(s)
  const latest = list[list.length - 1]
  if (latest) {
    if (s.finance.assets !== latest.amount) delete s.freedomPlan
    s.finance.assets = latest.amount
  }
}

export function SaveAssetRecord(s, entry, day) {
  if (!day) day = LocalDay()
  const raw = String(entry.amount == null ? '' : entry.amount).trim()
  const amount = Number(raw)
  const date = String(entry.date || '')
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e9) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > day) return null
  if (!Array.isArray(s.assetHistory)) s.assetHistory = []
  const idx = entry.id ? s.assetHistory.findIndex(function (x) { return x.id === entry.id }) : -1
  if (entry.id && idx < 0) return null
  const sameDateIdx = idx >= 0 ? idx : s.assetHistory.findIndex(function (x) { return x.date === date })
  const current = sameDateIdx >= 0 ? s.assetHistory[sameDateIdx] : null
  const normalized = Math.round(amount * 100) / 100
  if (current && current.amount === normalized) {
    SyncLatestAsset(s)
    return { changed: false, record: current }
  }
  let createdAt = current ? current.createdAt : Date.now()
  if (!current) {
    for (const r of s.assetHistory) if (r.createdAt >= createdAt) createdAt = r.createdAt + 1
  }
  const record = {
    id: current ? current.id : (entry.id || 'asset-' + createdAt + '-' + Math.random().toString(36).slice(2, 8)),
    date: date,
    amount: normalized,
    createdAt: createdAt,
  }
  if (sameDateIdx >= 0) s.assetHistory[sameDateIdx] = record
  else s.assetHistory.push(record)
  SyncLatestAsset(s)
  return { changed: true, record: record }
}

export function DeleteAssetRecord(s, id) {
  const idx = (s.assetHistory || []).findIndex(function (x) { return x.id === id })
  if (idx < 0) return false
  s.assetHistory.splice(idx, 1)
  SyncLatestAsset(s)
  return true
}

export function AssetSummary(s, month) {
  if (!month) month = LocalDay().slice(0, 7)
  const records = OrderedAssets(s)
  const before = records.filter(function (x) { return x.date.slice(0, 7) < month })
  const during = records.filter(function (x) { return x.date.indexOf(month) === 0 })
  const baseline = before.length ? before[before.length - 1] : null
  const latestDuring = during.length ? during[during.length - 1] : null
  let change = null
  if (baseline && latestDuring) {
    change = Math.round((latestDuring.amount - baseline.amount) * 100) / 100
  }
  return {
    records: records,
    latest: records.length ? records[records.length - 1] : null,
    baseline: baseline,
    change: change,
  }
}

// ---------- 月度预算 ----------
export function SaveMonthlyTargets(s, month, expense, income) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month < '1900-01') return false
  const parse = function (value) {
    const text = String(value == null ? '' : value).trim()
    if (!text) return null
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(text) || Number(text) > 100000000) return NaN
    return Math.round(Number(text) * 100)
  }
  const budget = parse(expense)
  const target = parse(income)
  if (Number.isNaN(budget) || Number.isNaN(target)) return false
  if (target !== null && target <= 0) return false
  if (!s.monthlyTargets) s.monthlyTargets = {}
  s.monthlyTargets[month] = { expense: budget, income: target }
  return true
}

export function MonthlyStatus(s, month) {
  if (!month) month = LocalDay().slice(0, 7)
  const targets = (s.monthlyTargets && s.monthlyTargets[month]) || {}
  const expense = LedgerSummary(s, month, 'expense').total
  const income = LedgerSummary(s, month, 'income').total
  const budget = Number.isSafeInteger(targets.expense) && targets.expense >= 0 ? targets.expense : null
  const target = Number.isSafeInteger(targets.income) && targets.income > 0 ? targets.income : null
  return {
    expense: {
      total: expense,
      target: budget,
      status: budget !== null && expense > budget ? '已超额' : '',
    },
    income: {
      total: income,
      target: target,
      status: target === null ? '' :
        income < target ? '未达标' :
        income * 10 > target * 11 ? '超额达标' : '已达标',
    },
  }
}

// ---------- 倒计时分解 ----------
export function ReelParts(deadline, now) {
  if (!now) now = Date.now()
  const seconds = Math.max(0, Math.ceil((deadline.getTime() - now) / 1000))
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
  }
}

export function ReelCalendarParts(deadline, now) {
  if (!now) now = Date.now()
  if (deadline.getTime() <= now) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  }
  const start = new Date(now)
  const shift = function (n) {
    const d = new Date(now)
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() + n)
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(day, last))
    return d
  }
  let months = Math.max(0,
    (deadline.getFullYear() - start.getFullYear()) * 12 +
    deadline.getMonth() - start.getMonth()
  )
  while (months > 0 && shift(months) > deadline) months--
  const rest = ReelParts(deadline, shift(months).getTime())
  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: rest.days,
    hours: rest.hours,
    minutes: rest.minutes,
    seconds: rest.seconds,
  }
}

// ---------- Wishlist ----------
export function WishlistSaved(s) {
  let total = 0
  for (const item of (s.items || [])) {
    if (item.status === 'abandoned' && Number.isFinite(item.amount) && item.amount > 0) {
      total += Math.round(item.amount * 100)
    }
  }
  return total / 100
}

export function DeleteWishlistItem(s, id) {
  const idx = (s.items || []).findIndex(function (x) { return x.id === id })
  if (idx < 0) return false
  s.items.splice(idx, 1)
  return true
}

export function NormalizeWishlist(s) {
  let changed = false
  for (const item of (s.items || [])) {
    if (item.status === 'transferred') {
      item.status = 'abandoned'
      changed = true
    }
  }
  return changed
}

// ---------- 备份 ----------
export function MakeBackup(s) {
  return {
    app: 'FIRE Forge',
    version: 1,
    exportedAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(s)),
  }
}