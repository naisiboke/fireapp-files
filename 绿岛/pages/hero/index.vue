<template>
  <view class="hero-page">
    <view class="hero-head"><view class="back" @tap="back">‹</view><view><text class="title">FIRE 英雄传</text><text class="sub">一点点行动，慢慢靠近自由。</text></view></view>
    <view class="growth"><view class="level">Lv{{ growth.level }}</view><view class="growth-copy"><text class="realm">{{ growth.name }}</text><text class="exp">{{ growth.max ? '已达最高境界' : growth.current + ' / ' + growth.required + ' EXP' }}</text><view class="progress"><view class="fill" :style="{width:growth.progress+'%'}"></view></view></view></view>
    <text class="detail">累计经验 {{ growth.total }} EXP · 每完成一个任务 +10 EXP</text>
    <view class="overview"><view><text class="big">{{ todayCount }}</text><text> / 3 今日完成</text></view><view><text class="big">{{ state.hero ? state.hero.actionDays.length : 0 }}</text><text> 天累计行动</text></view></view>
    <view class="section-head"><text class="section-title">今天，做一点小事</text><text class="date">{{ today }}</text></view>
    <view v-for="task in tasks" :key="task.id" class="task" :class="{done:isDone(task.id)}" @tap="complete(task.id)"><view class="check">{{ isDone(task.id) ? '✓' : '○' }}</view><view class="task-copy"><text>{{ task.title }}</text><text class="task-sub">{{ isDone(task.id) ? '今天已完成' : task.desc }}</text></view><text class="reward">+10 EXP</text></view>
    <view class="section-head badges-head"><text class="section-title">成长留下的小印记</text></view>
    <view class="badges"><view v-for="badge in badges" :key="badge.name" class="badge" :class="{locked:!badge.ok}"><text class="badge-icon">{{ badge.ok ? '✦' : '◇' }}</text><text>{{ badge.name }}</text><text class="badge-state">{{ badge.ok ? '已解锁' : '待解锁' }}</text></view></view>
    <view class="reading" @tap="reading"><text>认知阅读 · 书籍库与书架</text><text>›</text></view>
    <text class="safe">成长记录来自工具操作，EXP 不改变资产。</text>
    <BottomTabs current="tools" />
  </view>
</template>
<script>
import BottomTabs from '@/components/BottomTabs.vue'
import { state, persist, HeroDay, HeroComplete, HeroLevel } from '@/utils/engine.js'
export default {
  components:{BottomTabs},
  data(){return{state,today:new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric'}),tasks:[{id:'assets',title:'记录本月资产',desc:'更新当前资产，让计划保持清晰。'},{id:'savings',title:'检视储蓄目标',desc:'看看每月存入是否符合计划。'},{id:'wishlist',title:'处理一笔待消费计划',desc:'给一笔消费留出冷静期。'},{id:'read',title:'阅读 10 分钟',desc:'留一点时间思考真正想要的生活。'}] }},
  computed:{growth(){return HeroLevel(state.exp)},hero(){HeroDay(state);return state.hero},todayCount(){const h=state.hero||{};return (h.slots||[]).filter(x=>x.done).length+Number(h.ledgerDone||false)},badges(){const h=state.hero||{totalCompleted:0,log:[],actionDays:[]};return[{name:'迈出第一步',ok:h.totalCompleted>0},{name:'理性选择',ok:h.log.some(x=>x.id==='wishlist')},{name:'七日同行',ok:h.actionDays.length>=7}]}},
  onShow(){HeroDay(state);this.refresh=true},
  methods:{back(){uni.switchTab({url:'/pages/tools/index'})},reading(){uni.navigateTo({url:'/pages/reading-library/index'})},isDone(id){const h=state.hero||{};if(id==='ledger')return!!h.ledgerDone;return !!(h.slots||[]).find(x=>x.id===id)?.done},complete(id){if(this.isDone(id))return;if(HeroComplete(state,id)){persist();uni.showToast({title:'完成行动 +10 EXP',icon:'success'})}},},
}
</script>
<style>
.hero-page{min-height:100vh;padding:60px 24px 150px;background:#f8f9f5;color:#173d35;box-sizing:border-box}.hero-head{display:flex;gap:14px}.back{font-size:32px;line-height:24px}.title{display:block;font-size:26px;font-weight:700}.sub{display:block;margin-top:7px;font-size:13px;color:#737e76}.growth{display:flex;gap:18px;align-items:center;margin-top:30px;padding:22px;border-radius:20px;background:#173d35;color:#fff}.level{font-size:37px;font-weight:300}.growth-copy{flex:1}.realm{display:block;font-size:18px;font-weight:600}.exp{display:block;margin-top:5px;font-size:12px;color:#b8ccc0}.progress{height:6px;margin-top:14px;border-radius:6px;background:#ffffff22}.fill{height:100%;border-radius:6px;background:#d7e5bb}.detail{display:block;margin:12px 2px;font-size:12px;color:#737e76}.overview{display:flex;gap:45px;padding:24px 0;border-bottom:1px solid #e1e7de}.big{font-size:30px;font-weight:600;margin-right:4px}.section-head{display:flex;justify-content:space-between;align-items:center;margin-top:28px;margin-bottom:12px}.section-title{font-size:17px;font-weight:700}.date{font-size:12px;color:#737e76}.task{display:flex;align-items:center;gap:12px;padding:16px 0;border-bottom:1px solid #e1e7de}.task.done{opacity:.6}.check{width:25px;height:25px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid #91a392;color:#447e70}.task-copy{flex:1}.task-copy text{display:block;font-size:14px}.task-sub{margin-top:4px;color:#737e76;font-size:12px}.reward{font-size:12px;color:#447e70}.badges-head{margin-bottom:8px}.badges{display:flex;gap:8px}.badge{flex:1;padding:16px 8px;text-align:center;border-radius:14px;background:#e5eee4;font-size:12px}.badge.locked{opacity:.45}.badge-icon,.badge-state{display:block}.badge-icon{font-size:23px;margin-bottom:8px}.badge-state{margin-top:6px;color:#737e76;font-size:11px}.reading{display:flex;justify-content:space-between;margin-top:24px;padding:17px;border-radius:14px;background:#e5eee4;font-size:13px}.safe{display:block;margin-top:34px;text-align:center;color:#8b9489;font-size:11px}
</style>