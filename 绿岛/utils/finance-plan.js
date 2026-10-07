import { FireEngine } from './engine.js'

// 金额统一为人民币元，收益率和提取率为百分数；沿用现有引擎的月末存入公式。
function numberField(value, label, min, max, errors) {
  const text = String(value == null ? '' : value).trim()
  if (!text) { errors.push('请填写' + label); return null }
  if (!/^\d+(\.\d{1,2})?$/.test(text) && !/^-\d+(\.\d{1,2})?$/.test(text)) {
    errors.push(label + '必须是最多两位小数的数字'); return null
  }
  const n = Number(text)
  if (!Number.isFinite(n) || n < min || n > max) {
    errors.push(label + '须在 ' + min + '～' + max + ' 之间'); return null
  }
  return n
}

export function validateFireForm(form) {
  const errors = []
  const finance = {
    assets: numberField(form.assets, '当前资产（元）', 0, 1e9, errors),
    monthlyDeposit: numberField(form.monthlyDeposit, '每月存入金额（元/月）', 0, 1e9, errors),
    retirementExpense: numberField(form.retirementExpense, '退休后每月消费（元/月）', .01, 1e9, errors),
    rate: numberField(form.rate, '预期年化收益率（%/年）', -50, 50, errors),
    withdrawal: numberField(form.withdrawal, '年度提取率（%/年）', 1, 10, errors),
    mode: 'fire',
  }
  return { errors, finance }
}

export function validateGoalForm(form) {
  const errors = []
  const name = String(form.name || '').trim()
  if (!name) errors.push('请填写目标名称')
  else if (name.length > 60) errors.push('目标名称不能超过60个字')
  const plan = {
    name,
    assets: numberField(form.assets, '已准备金额（元）', 0, 1e9, errors),
    amount: numberField(form.amount, '目标金额（元）', .01, 1e9, errors),
    monthlyDeposit: numberField(form.monthlyDeposit, '每月存入金额（元/月）', 0, 1e9, errors),
    expectedMonths: numberField(form.expectedMonths, '期望达成时间（个月）', 1, 1200, errors),
    rate: numberField(form.rate, '预期年化收益率（%/年）', -50, 50, errors),
  }
  if (plan.expectedMonths !== null && !Number.isInteger(plan.expectedMonths)) errors.push('期望达成时间须为整数个月')
  return { errors, plan }
}

export function hasValidFinance(s) {
  if (s.financeEntered !== true || !s.finance) return false
  const f = s.finance
  return validateFireForm({
    ...f,
    retirementExpense: Number.isFinite(f.retirementExpense) ? f.retirementExpense : f.expense,
    monthlyDeposit: Number.isFinite(f.monthlyDeposit) ? f.monthlyDeposit : Math.max(0, Number(f.income) - Number(f.expense)),
  }).errors.length === 0
}

export function financeSignature(f) {
  return JSON.stringify([f.assets, f.monthlyDeposit, f.retirementExpense, f.expense, f.income, f.rate, f.withdrawal])
}

// 页面只读取，基准由 store 在保存或兼容旧数据时建立，不能每秒重置预计日期。
export function freedomResult(s) {
  if (!hasValidFinance(s)) return { configured: false, target: null, months: null, years: null, progress: 0, date: null }
  const plan = s.freedomPlan
  const start = plan && Number.isFinite(plan.calculatedAt) ? new Date(plan.calculatedAt) : new Date()
  const result = FireEngine(s.finance, start)
  if (plan && plan.signature === financeSignature(s.finance)) {
    result.date = Number.isFinite(plan.deadline) ? new Date(plan.deadline) : null
  }
  return { ...result, configured: true }
}

export function createFreedomPlan(finance, now = Date.now()) {
  const r = FireEngine(finance, new Date(now))
  return { signature: financeSignature(finance), calculatedAt: now, deadline: r.date ? r.date.getTime() : null }
}
