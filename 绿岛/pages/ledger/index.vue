
<template>
 <view class="qe-page fire-page-ledger-index" :style="[pageLayoutStyle, pageStyle]">
  <AppFeedback :owner-id="feedbackOwnerId" />
  <view class="qe-header"><button class="qe-back" aria-label="返回上一页" @tap="back"><view class="qe-back-chevron"></view></button><text class="qe-header-title">记账</text><button class="qe-header-action" @tap="toggleBudget">预算设置</button></view>
  <view class="qe-month"><button class="qe-month-step" aria-label="上个月" @tap="prevMonth">‹</button><picker mode="date" fields="month" :value="month" start="1900-01" :end="maxMonth" @change="onMonthChange"><view class="qe-month-value">{{monthText}} <text>⌄</text></view></picker><button class="qe-month-step" aria-label="下个月" :disabled="month>=maxMonth" @tap="nextMonth">›</button></view>
  <view class="qe-plan">
   <view class="qe-plan-top"><text>本月支出</text><text>{{expenseCount}} 笔</text></view>
   <text class="qe-plan-total">¥{{money(expenseTotal/100)}}</text>
   <view class="qe-plan-meta"><text>支出预算 {{budgetAmount===null?'待设置':'¥'+money(budgetAmount/100)}}</text><text :class="{'qe-over':budgetRemaining<0}">{{budgetRemaining<0?'超出预算':'剩余预算'}} {{budgetAmount===null?'待设置':'¥'+money(Math.abs(budgetRemaining)/100)}}</text></view>
   <view class="qe-budget-progress"><view class="qe-budget-track"><view class="qe-budget-fill" :style="{width:budgetProgress+'%'}"></view></view><text class="qe-budget-percent">{{budgetAmount===null?'—':shareOf(expenseTotal,budgetAmount)}}</text></view>
   <text class="qe-plan-income">本月收入 ¥{{money(incomeTotal/100)}} / 目标 {{incomeTarget===null?'待设置':'¥'+money(incomeTarget/100)}}</text>
   <button v-if="!targetsReady" class="qe-plan-setup" @tap="toggleBudget"><text>先设置本月支出预算和收入目标</text><text>›</text></button>
   <text v-if="monthlyStatus.expense.status" class="qe-list-note qe-over">{{monthlyStatus.expense.status}}</text>
  </view>
  <view v-if="distribution.length" class="qe-distribution">
   <view class="qe-section-head"><text class="qe-section-title">消费分布</text><text class="qe-section-small">按分类</text></view>
   <view class="qe-distribution-bar"><view v-for="c in distribution" :key="c.key" class="qe-distribution-segment" :style="{width:c.percent+'%',background:c.color}"></view></view>
   <view class="qe-distribution-legend"><view v-for="c in distribution" :key="c.key"><view class="qe-legend-label"><view class="qe-legend-dot" :style="{background:c.color}"></view><text>{{c.label}} {{shareOf(c.cents,expenseTotal)}}</text></view><text class="qe-legend-amount">¥{{money(c.cents/100)}}</text></view></view>
  </view>
  <view class="qe-ledger-main">
   <QuietEmptyState v-if="!records.length || entryEmptyLeaving" ref="emptyGuide" title="记下你的第一笔" description="从一笔收支开始，慢慢理清生活。" :leaving="entryEmptyLeaving" :pointing="(showFirstGuide || entryEmptyLeaving) && !budgetExpanded" @ready="refreshEntryArrow" />
   <view v-if="records.length" id="ledger-records" class="qe-list-section">
    <view v-if="entryTip" class="qe-tip" role="status" aria-live="polite">✓ {{entryTip}}</view>
    <view class="qe-section-head"><text class="qe-section-title">收支明细</text><view class="qe-filters"><button v-for="f in filters" :key="f.id" class="qe-filter" :class="{active:recordFilter===f.id}" :aria-pressed="recordFilter===f.id" @tap="recordFilter=f.id">{{f.name}}</button></view></view>
    <view class="qe-table-head"><text>{{recordFilter==='income'?'收入内容':recordFilter==='all'?'收支内容':'消费内容'}}</text><text>金额</text><text>{{recordFilter==='income'?'收入占比':'占比'}}</text></view>
    <view v-for="x in filteredRecords" :id="rowId(x.id)" :key="x.id" class="qe-record-row" :class="{'qe-record-arriving':entryArrivingId===String(x.id)}" role="button" tabindex="0" :aria-label="'修改或删除'+(x.note||catLabel(x))" @tap="editRecord(x)" @keydown.enter="editRecord(x)">
     <view class="qe-record-copy"><text class="qe-record-title">{{x.note||catLabel(x)}}</text><text class="qe-record-meta">{{catLabel(x)}} · {{x.date.slice(5)}}</text></view>
     <text class="qe-record-amount" :class="{income:x.type==='income'}">{{x.type==='income'?'+':'−'}}¥{{money(x.cents/100)}}</text><text class="qe-record-share">{{recordShare(x)}}</text>
    </view>
    <view v-if="!filteredRecords.length" class="qe-empty-filter">这个月还没有{{recordFilter==='income'?'收入':'支出'}}记录</view>
    <text class="qe-list-note">{{recordFilter==='income'?'占比按本月实际收入计算':'占比按本月实际支出计算，收入单独统计'}} · 点按记录可修改或删除</text>
   </view>
  </view>
  <button id="quiet-entry-fab" class="qe-fab" :class="{'qe-fab-hint':showFirstGuide && !budgetExpanded}" aria-label="记一笔" @tap="goAdd">＋</button>
  <view v-if="entryFly" class="qe-flight" :style="entryFly.style" aria-hidden="true"><text class="qe-flight-label">{{entryFly.title}}</text><text class="qe-flight-amount">{{entryFly.amount}}</text></view>
  <QuietEntrySheet :visible="entryVisible && budgetExpanded" :owner-id="feedbackOwnerId" title="本月预算" :busy="saving" @close="closeEntrySheet" @ready="entryFocus=true">
   <text class="qe-label">本月支出预算（元）</text><input class="qe-input" type="digit" aria-label="本月支出预算" :adjust-position="false" :focus="entryFocus" v-model="budgetInput" maxlength="12" placeholder="例如 3000" />
   <text class="qe-label">本月收入目标（元）</text><input class="qe-input" type="digit" aria-label="本月收入目标" :adjust-position="false" v-model="incomeInput" maxlength="12" placeholder="例如 8000" />
   <text class="qe-form-hint">这是本月计划，真实收支请另外记一笔。</text><text v-if="errorText" class="qe-error" role="alert">{{errorText}}</text>
   <template #footer><button class="qe-primary" :disabled="saving" @tap="saveTargets">{{saving?'保存中…':'保存本月计划'}}</button></template>
  </QuietEntrySheet>
 </view>
</template>
<script>
import AppFeedback from '@/components/AppFeedback.vue'
import QuietEmptyState from '@/components/QuietEmptyState.vue'
import QuietEntrySheet from '@/components/QuietEntrySheet.vue'
import { feedbackPageMixin } from '@/utils/feedback-page.js'
import { quietEntryPageMixin } from '@/utils/quiet-entry-page.js'
import { showNotice } from '@/utils/feedback.js'
import { clearOptionsDraft } from '@/utils/session-drafts.js'
import { offerLedgerDraft, cancelLedgerDraft } from '@/utils/ledger-draft-handoff.js'
import { accountId } from '@/utils/account-cache.js'
import { state, persistNow } from '@/store/index.js'
import { LocalDay, LedgerSummary, LedgerCategoryLabel, MonthlyStatus } from '@/utils/engine.js'
import { defaultLedgerDraft, commitMonthlyPlan, expenseDistribution, shareOf } from '@/utils/quiet-ledger.js'
export default{
 components:{AppFeedback,QuietEmptyState,QuietEntrySheet},mixins:[feedbackPageMixin,quietEntryPageMixin],
 data(){return{state,month:'',maxMonth:'',budgetInput:'',incomeInput:'',budgetExpanded:false,showAdd:false,addAfterPlan:false,editingId:null,editorNavigating:false,draft:defaultLedgerDraft(LocalDay().slice(0,7)),recordFilter:'all',saving:false,errorText:'',filters:[{id:'all',name:'全部'},{id:'expense',name:'支出'},{id:'income',name:'收入'}],necessities:[{id:'necessary',name:'必要'},{id:'comfort',name:'改善生活'},{id:'impulse',name:'一时心动'}]}},
 computed:{
  monthText(){const parts=this.month.split('-');return parts[0]+'年'+Number(parts[1])+'月'},
  summary(){return LedgerSummary(state,this.month,'expense')},incomeSummary(){return LedgerSummary(state,this.month,'income')},
  monthlyStatus(){return MonthlyStatus(state,this.month)},
  expenseTotal(){return this.summary.total},expenseCount(){return this.summary.count},expenseCats(){return this.summary.categories},
  incomeTotal(){return this.incomeSummary.total},incomeCount(){return this.incomeSummary.count},incomeCats(){return this.incomeSummary.categories},
  records(){return this.summary.records.concat(this.incomeSummary.records).sort((a,b)=>b.date.localeCompare(a.date)||(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0))},
  filteredRecords(){return this.records.filter(x=>this.recordFilter==='all'||(x.type||'expense')===this.recordFilter)},
  distribution(){return expenseDistribution(state,this.summary.records)},
  budgetAmount(){return this.monthlyStatus.expense.target},incomeTarget(){return this.monthlyStatus.income.target},
  targetsReady(){return this.budgetAmount>0&&this.incomeTarget>0},
  budgetRemaining(){return this.budgetAmount===null?0:this.budgetAmount-this.expenseTotal},
  budgetProgress(){return this.budgetAmount>0?Math.min(100,this.expenseTotal/this.budgetAmount*100):0},
  showFirstGuide(){return !this.records.length&&!(state.ledger||[]).length&&this.entryIsFirst('ledger')},
 },
 watch:{budgetExpanded(){this.entryFocus=false;this.errorText='';this.$nextTick(()=>this.refreshEntryArrow())},showAdd(){this.$nextTick(()=>this.refreshEntryArrow())}},
 onLoad(options){this.maxMonth=LocalDay().slice(0,7);this.month=/^\d{4}-(0[1-9]|1[0-2])$/.test(options?.month||'')&&options.month>='1900-01'&&options.month<=this.maxMonth?options.month:this.maxMonth;this.loadTargetInputs();this.budgetExpanded=!this.targetsReady;this.addAfterPlan=options?.add==='1';this.showAdd=false},
 onShow(){if(!this.budgetExpanded)this.loadTargetInputs();if(this.addAfterPlan&&this.targetsReady){this.addAfterPlan=false;this.$nextTick(()=>this.goAdd())}},
 onBackPress(event){return this.handleEntryBack(event)},
 methods:{
  shareOf,catLabel(x){return LedgerCategoryLabel(state,x)},money(value){return Number(value||0).toLocaleString('zh-CN',{maximumFractionDigits:2})},fmt(value){return this.money(value)},
  rowId(id){return 'ledger-row-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_')},
  recordShare(x){return x.type==='income'?(this.recordFilter==='income'?shareOf(x.cents,this.incomeTotal):'—'):shareOf(x.cents,this.expenseTotal)},
  loadTargetInputs(){const plan=state.monthlyTargets?.[this.month]||{};this.budgetInput=Number.isSafeInteger(plan.expense)?String(plan.expense/100):'';this.incomeInput=Number.isSafeInteger(plan.income)?String(plan.income/100):''},
  toggleBudget(){if(this.saving)return;this.showAdd=false;this.entryFocus=false;this.budgetExpanded=true},
  closeEntrySheet(){if(this.saving)return;this.entryFocus=false;this.showAdd=false;this.budgetExpanded=false;this.errorText=''},
  resetEntryDraft(){this.draft=defaultLedgerDraft(this.month);this.editingId=null;this.loadTargetInputs()},
  saveTargets(){
   if(this.saving||!this.budgetExpanded)return
   if(!this.entryCanSave()){this.errorText='账号或同步状态已变化，请稍后重新打开';return}
   this.saving=true
   if(!commitMonthlyPlan(state,this.month,this.budgetInput,this.incomeInput,persistNow)){this.errorText='请填写两个大于 0 的有效金额，并确认设备存储可用';this.saving=false;return}
   this.saving=false;this.closeEntrySheet();clearOptionsDraft(this);if(this.addAfterPlan){this.addAfterPlan=false;this.$nextTick(()=>this.goAdd())}else showNotice({title:'本月计划已保存',icon:'success'})
  },
  changeMonth(month){if(month<'1900-01'||month>this.maxMonth||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return;this.closeEntrySheet();this.month=month;this.recordFilter='all';this.resetEntryDraft();this.budgetExpanded=!this.targetsReady;this.$nextTick(()=>this.refreshEntryArrow())},
  onMonthChange(event){this.changeMonth(String(event.detail.value).slice(0,7))},
  prevMonth(){const d=new Date(this.month+'-01T12:00:00');d.setMonth(d.getMonth()-1);this.changeMonth(LocalDay(d).slice(0,7))},
  nextMonth(){if(this.month>=this.maxMonth)return;const d=new Date(this.month+'-01T12:00:00');d.setMonth(d.getMonth()+1);this.changeMonth(LocalDay(d).slice(0,7))},
  goAdd(){if(this.saving||this.editorNavigating)return;if(!this.targetsReady){this.addAfterPlan=true;this.toggleBudget();return}if(this.editingId)this.resetEntryDraft();this.openClassicEditor()},
  editRecord(record){if(record&&!this.saving&&!this.editorNavigating)this.openClassicEditor(record)},
  openClassicEditor(record){
   const uid=accountId();if(!uid||!this.entryCanSave()){showNotice({title:'请先完成登录或同步后重试',icon:'none'});return}
   this.editorNavigating=true
   const ticket=record?false:offerLedgerDraft(uid,this.month,this.draft)
   const url=record?'/pages/ledger/edit?id='+encodeURIComponent(String(record.id)):'/pages/ledger/edit'+(this.month===LocalDay().slice(0,7)?'':'?month='+this.month)
   uni.navigateTo({url,success:()=>{if(ticket){this.resetEntryDraft();clearOptionsDraft(this)}},fail:()=>{if(ticket)cancelLedgerDraft(uid,ticket);showNotice({title:'暂时无法打开记账，请重试',icon:'none'})},complete:()=>{this.editorNavigating=false}})
  },
 },
}
</script>
<style lang="scss">
@import '@/styles/quiet-entry.scss';
.fire-page-ledger-index{padding-top:var(--fire-page-top)}
</style>
