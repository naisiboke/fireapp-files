<template>
  <view class="hero-page fire-page-hero-index" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="hero-head"><view class="back" data-fire-press="true" @tap="back" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">‹</view><view><text class="title">FIRE 英雄传</text><text class="sub">一点点行动，慢慢靠近自由。</text></view></view>
    <view class="growth"><view class="level">Lv{{ growth.level }}</view><view class="growth-copy"><text class="realm">{{ growth.name }}</text><text class="exp">{{ growth.max ? '已达最高境界' : growth.current + ' / ' + growth.required + ' EXP' }}</text><view class="progress"><view class="fill" :style="{width:growth.progress+'%'}"></view></view></view></view>
    <text class="detail">累计经验 {{ growth.total }} EXP · 单次奖励最高10经验</text>
    <view class="overview"><view><text class="big">{{ todayCount }}</text><text> / {{dailyTasks.length}} 今日完成</text></view><view><text class="big">{{actionDays.length}}</text><text> 天累计行动</text></view></view>
    <view class="section-head"><text class="section-title">今天，做一点小事</text><text class="date">{{ today }}</text></view>
    <view v-if="state.actionSync && ['syncing','error'].includes(state.actionSync.status)" class="action-sync" data-fire-press="true" @tap="retryActions" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text>{{state.actionSync.message}}</text><text v-if="state.actionSync.status==='error'">重试 ›</text></view>
    <view v-for="task in dailyTasks" :key="task.id" class="task" data-fire-press="true" :class="{done:isDone(task.id)}" @tap="complete(task.id)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><view class="check">{{ isDone(task.id) ? '✓' : '○' }}</view><view class="task-copy"><text>{{ task.title }}</text><text class="task-sub">{{ isDone(task.id) ? '今天已完成' : task.desc }}</text></view><text class="reward">+{{task.xp}} EXP</text></view>
    <view class="section-head badges-head"><text class="section-title">成长留下的小印记</text></view>
    <view class="badges"><view v-for="badge in badges" :key="badge.name" class="badge" :class="{locked:!badge.ok}"><text class="badge-icon">{{ badge.ok ? '✦' : '◇' }}</text><text>{{ badge.name }}</text><text class="badge-state">{{ badge.ok ? '已解锁' : '待解锁' }}</text></view></view>
    <view class="section-head"><text class="section-title">行动奖励规则</text></view><view v-for="rule in rules" :key="rule.id" class="task"><view class="task-copy"><text>{{rule.title}}</text><text class="task-sub">{{rule.desc}}</text></view><text class="reward">+{{rule.xp}} EXP</text></view>
    <text class="safe">成长记录来自工具操作，EXP 不改变资产。</text>
    
  </view>
</template>
<script>
import AppFeedback from '@/components/AppFeedback.vue'
import {feedbackPageMixin} from '@/utils/feedback-page.js'
import {dismissFeedback} from '@/utils/feedback.js'
import {state,refreshActions} from '@/store/index.js'
import {HeroLevel} from '@/utils/engine.js'
import {ACTION_RULES,todayActions} from '@/utils/action-tasks.js'
import {CS} from '@/utils/community-store.js'
import {isMembershipActive} from '@/utils/membership.js'
export default{
 components:{AppFeedback},mixins:[feedbackPageMixin],onBackPress(){return dismissFeedback(this.feedbackOwnerId)},
 data(){return{state,now:Date.now(),posts:[],rules:ACTION_RULES,today:new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric'})}},
 computed:{
 dailyTasks(){return todayActions(state,{posts:this.posts,member:isMembershipActive(state),at:this.now})},
 actionDays(){return [...new Set([...(state.actionRewards?.counters?.actionDays||[]),...(state.actionRewards?.events||[]).map(e=>e.day),...(state.hero?.actionDays||[])])]},
 growth(){return HeroLevel(state.exp)},todayCount(){return this.dailyTasks.filter(t=>t.done).length},
 badges(){const h=state.hero||{};return[{name:'迈出第一步',ok:state.exp>0},{name:'理性选择',ok:(state.items||[]).some(x=>['success','ended','abandoned','transferred'].includes(x.status))},{name:'七日同行',ok:this.actionDays.length>=7}]},
 },
 onShow(){this.now=Date.now();this.posts=CS.ugc();refreshActions().catch(()=>{})},
 methods:{retryActions(){if(state.actionSync?.status!=='syncing')refreshActions().catch(()=>{})},back(){uni.switchTab({url:'/pages/tools/index'})},isDone(id){return !!this.dailyTasks.find(t=>t.id===id)?.done},complete(id){const t=ACTION_RULES.find(t=>t.id===id);if(t)uni.navigateTo({url:t.url})}},
}
</script>
<style>
.hero-page{min-height:100vh;padding:60px 24px 150px;background:#f8f9f5;color:#173d35;box-sizing:border-box}.hero-head{display:flex;gap:14px}.back{font-size:32px;line-height:24px}.title{display:block;font-size:26px;font-weight:700}.sub{display:block;margin-top:7px;font-size:13px;color:#737e76}.growth{display:flex;gap:18px;align-items:center;margin-top:30px;padding:22px;border-radius:20px;background:#173d35;color:#fff}.level{font-size:37px;font-weight:300}.growth-copy{flex:1}.realm{display:block;font-size:18px;font-weight:600}.exp{display:block;margin-top:5px;font-size:12px;color:#b8ccc0}.progress{height:6px;margin-top:14px;border-radius:6px;background:#ffffff22}.fill{height:100%;border-radius:6px;background:#d7e5bb}.detail{display:block;margin:12px 2px;font-size:12px;color:#737e76}.overview{display:flex;gap:45px;padding:24px 0;border-bottom:1px solid #e1e7de}.big{font-size:30px;font-weight:600;margin-right:4px}.section-head{display:flex;justify-content:space-between;align-items:center;margin-top:28px;margin-bottom:12px}.section-title{font-size:17px;font-weight:700}.date{font-size:12px;color:#737e76}.task{display:flex;align-items:center;gap:12px;padding:16px 0;border-bottom:1px solid #e1e7de}.task.done{opacity:.6}.check{width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid #91a392;color:#447e70}.task-copy{flex:1}.task-copy text{display:block;font-size:14px}.task-sub{margin-top:4px;color:#737e76;font-size:12px}.reward{font-size:12px;color:#447e70}.badges-head{margin-bottom:8px}.badges{display:flex;gap:8px}.badge{flex:1;padding:16px 8px;text-align:center;border-radius:14px;background:#e5eee4;font-size:12px}.badge.locked{opacity:.45}.badge-icon,.badge-state{display:block}.badge-icon{font-size:23px;margin-bottom:8px}.badge-state{margin-top:6px;color:#737e76;font-size:11px}.reading{display:flex;justify-content:space-between;margin-top:24px;padding:17px;border-radius:14px;background:#e5eee4;font-size:13px}.safe{display:block;margin-top:34px;text-align:center;color:#8b9489;font-size:11px}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-hero-index{padding-top:var(--fire-page-top)}
.action-sync{display:flex;justify-content:space-between;gap:10px;padding:12px;margin:12px 0;font-size:12px;line-height:1.6;border-radius:10px;background:#faf1e7;color:#93643b}
</style>