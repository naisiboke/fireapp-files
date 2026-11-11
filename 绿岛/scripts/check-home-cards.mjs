import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const src=readFileSync(new URL('../pages/index/index.vue',import.meta.url),'utf8')
const template=src.match(/<template>([\s\S]*?)<\/template>/)[1]
assert(!/masthead-bg|masthead-fade|countdown-clock|pad\(seconds\)/.test(template),'home uses white header and day-level summary')
assert(template.includes('class="freedom-summary"')&&template.includes('class="home-metrics"')&&template.includes('class="wishlist-home-card"')&&template.includes('section tasks-card'),'financial summary leads distinct compact cards')
assert(src.includes('}, 60000)')&&!src.includes('date ? 1000 : 60000'),'no second-by-second home timer')
assert(template.includes('ref="guideTabs"')&&template.includes('id="fire-guide-finance"'),'existing guide and bottom navigation anchors preserved')
assert(template.includes("['error','restoring','auth-required','conflict']"),'real sync errors remain actionable')
assert(template.includes("state.actionSync.status==='error'"),'ordinary reward syncing does not shift cards')
assert(template.includes('hasExpenseRecords')&&template.includes('hasIncomeRecords'),'missing financial records are not disguised as zero')
console.log('Home card structure and background refresh checks passed')
