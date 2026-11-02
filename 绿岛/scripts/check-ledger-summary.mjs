// Run from the project root: node scripts/check-ledger-summary.mjs
// Checks the real engine and page computed values; App rendering still needs device verification.
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const results = []
function check(name, value) { assert.ok(value, name); results.push(name) }
const engineSource = source('utils/engine.js').replace(/\bexport (const|function)/g, '$1')
const engine = new Function(engineSource + '\nreturn {MonthlyStatus,SaveMonthlyTargets,SaveExpense,DeleteExpense,HeroDay};')()
const { MonthlyStatus, SaveMonthlyTargets, SaveExpense, DeleteExpense } = engine
const month = '2026-11'
let currentDay = month + '-20'
const state = { ledger: [], monthlyTargets: {}, financeEntered: true, finance: { retirementExpense: 5000, monthlyDeposit: 2000 } }
function loadPage(path, dependencies) {
  const script = source(path).match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^\s*import\s+(?:(?:[\s\S]*?)\s+from\s+)?['"][^'"\n]+['"]\s*;?/gm, '')
    .replace('export default', 'return')
  return new Function(...Object.keys(dependencies), script)(...Object.values(dependencies))
}
const common = { state, HeroDay:engine.HeroDay,persistNow:()=>true, MonthlyStatus, LocalDay: () => currentDay, feedbackPageMixin: {}, AppFeedback: {} }
const Home = loadPage('pages/index/index.vue', {
  ...common, pageEntryMixin: {}, BottomTabs: {}, AnimatedNumber: {}, refreshFinance() {},
  uni: { hideTabBar() {}, getStorageSync() { return null } },
})
const Ledger = loadPage('pages/ledger/index.vue', { ...common })
function viewModel(page, data) {
  const vm = { ...data }
  for (const [name, getter] of Object.entries(page.computed)) {
    Object.defineProperty(vm, name, { get: () => getter.call(vm), configurable: true })
  }
  return vm
}
const home = viewModel(Home, { ledgerMonth: month })
const ledger = viewModel(Ledger, { month })
function add(type, amount, date = month + '-05', id) {
  check('save ' + type + ' ' + amount + (id ? ' edit' : ''), SaveExpense(state, {
    type, amount, date, id, category: type === 'income' ? 'salary' : 'food',
  }, '2026-12-20'))
}

check('countdown alone leaves monthly income and expense unfilled', !home.hasExpenseRecords && !home.hasIncomeRecords)
check('monthly expense is not copied from retirement consumption', home.expenseTotal === 0)
check('budget can be saved separately from actual records', SaveMonthlyTargets(state, month, '100', '1000'))
check('budget alone still leaves home expense unfilled', !home.hasExpenseRecords && !home.expenseOverBudget)
add('income', '900')
check('income entry does not mark expense as filled', home.hasIncomeRecords && !home.hasExpenseRecords && home.incomeTotal === 90000)
add('expense', '99.99')
check('below budget shows actual expense without an overage', home.hasExpenseRecords && home.expenseTotal === 9999 && !home.expenseOverBudget)
add('expense', '0.01')
check('reaching budget is flagged at the cent boundary', home.expenseTotal === 10000 && home.expenseOverBudget)
check('ledger and home agree at the threshold', ledger.monthlyStatus.expense.status === '已超额')
check('income does not offset gross monthly spending', home.expenseTotal === 10000 && home.incomeTotal === 90000)
const first = state.ledger.find(record => record.type === 'expense')
const second = state.ledger.find(record => record.type === 'expense' && record.id !== first.id)
add('expense', '99.98', first.date, first.id)
check('editing spending below budget clears the overage', home.expenseTotal === 9999 && !home.expenseOverBudget)
add('expense', '100', first.date, first.id)
check('spending above the budget is flagged', home.expenseTotal === 10001 && home.expenseOverBudget)
check('deleting a record succeeds', DeleteExpense(state, second.id))
check('exactly reaching budget remains flagged after deletion', home.expenseTotal === 10000 && home.expenseOverBudget)
check('raising the budget succeeds', SaveMonthlyTargets(state, month, '101', '1000'))
check('changing the budget recalculates status without changing records', home.expenseTotal === 10000 && !home.expenseOverBudget)
state.financeEntered = false
check('recorded consumption displays even without a retirement plan', home.hasExpenseRecords && home.expenseTotal === 10000)
check('deleting the last expense succeeds', DeleteExpense(state, first.id))
check('deleting all spending restores unfilled state', !home.hasExpenseRecords && !home.expenseOverBudget)
add('expense', '100')
home.startCountdown = () => {}
home.startGuardian = () => {}
currentDay = '2026-12-01'
Home.onShow.call(home)
check('returning to home refreshes the month', home.ledgerMonth === '2026-12')
check('new month does not reuse last month records or budget', !home.hasExpenseRecords && !home.hasIncomeRecords && !home.expenseOverBudget)
check('history remains available in the selected ledger month', ledger.monthlyStatus.expense.total === 10000 && ledger.monthlyStatus.expense.target === 10100)
Object.defineProperty(home, 'fireResult', { get: () => ({ date: null }), configurable: true })
home.ledgerMonth = month
Home.methods.tick.call(home)
check('active countdown tick also refreshes the month', home.ledgerMonth === '2026-12')
add('expense', '20', '2026-12-01')
check('a record without a budget shows its actual total without false overage', home.hasExpenseRecords && home.expenseTotal === 2000 && !home.expenseOverBudget)
const noRecords = { ledger: [], monthlyTargets: { [month]: { expense: 0 } } }
check('zero budget without records does not falsely mark an overage', MonthlyStatus(noRecords, month).expense.status === '')
const fractional = { ledger: [{ date: month + '-01', cents: 1, type: 'expense', category: 'food' }], monthlyTargets: {} }
check('fractional currency budgets save in cents', SaveMonthlyTargets(fractional, month, '0.01', '1'))
check('fractional threshold is exact', MonthlyStatus(fractional, month).expense.status === '已超额')
check('retirement consumption and deposit remain independent', state.finance.retirementExpense === 5000 && state.finance.monthlyDeposit === 2000)
const homeSource = source('pages/index/index.vue')
check('home renders independent record readiness', homeSource.includes("hasExpenseRecords ? '¥ '") && homeSource.includes("hasIncomeRecords ? '¥ '"))
check('home renders its over-budget indicator', homeSource.includes('v-if="expenseOverBudget"'))
check('ledger renders the same over-budget status', source('pages/ledger/index.vue').includes('v-if="monthlyStatus.expense.status"'))
console.log(results.length + ' ledger summary checks passed')
