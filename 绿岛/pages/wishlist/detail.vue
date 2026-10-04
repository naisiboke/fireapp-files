<template>
  <view class="detail-page">
    <view class="detail-head"><view class="back" @tap="back">‹</view><text class="title">拔草详情</text><view class="head-space"></view></view>
    <scroll-view v-if="item" class="detail-scroll" scroll-y>
      <view class="hero-card"><view class="hero-icon">{{ categoryIcon(item.category) }}</view><text class="name">{{ item.name }}</text><text class="status" :class="item.status">{{ statusLabel }}</text></view>
      <view class="info-card">
        <view class="info-row"><text>预计金额</text><text class="strong">¥ {{ money(item.amount) }}</text></view>
        <view class="info-row"><text>分类</text><text>{{ categoryName(item.category) }}</text></view>
        <view class="info-row"><text>创建时间</text><text>{{ createdText }}</text></view>
        <view class="info-row"><text>冷静期</text><text>默认 {{ item.days || 7 }} 天</text></view>
      </view>
      <view class="progress-card"><text class="progress-title">{{ coolingFinished ? '冷静期已结束' : '冷静期进行中' }}</text><text class="countdown">{{ coolingFinished ? '可以做出最终决定' : countdownText }}</text><view class="progress-track"><view class="progress-fill" :style="{width:progress+'%'}"></view></view><text class="progress-tip">{{ coolingFinished ? '你已经完成了这次冷静期挑战。' : '先给自己一点时间，再决定是否购买。' }}</text></view>
      <view v-if="coolingFinished" class="actions"><button class="save fire-button-primary" @tap="finish('abandoned')">挑战成功</button><button class="buy fire-button-outline" @tap="finish('bought')">挑战失败</button></view>
      <view v-else class="actions"><button class="save" @tap="finish('abandoned')">提前结束，即为省下</button><button class="buy" @tap="finish('bought')">我坚持不住了，已购买</button></view>
    </scroll-view>
    <view v-else class="missing"><text>拔草项目不存在或已删除</text><button @tap="back">返回列表</button></view>
  </view>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { state, persist } from '@/store/index.js'
const item=ref(null), now=ref(Date.now()), timer=ref(null)
const categories={shopping:'购物',food:'饮食',travel:'旅行',life:'生活',other:'其他'}
const id=ref('')
const coolingEnd=computed(()=>item.value ? Number(item.value.created||Date.now())+Number(item.value.days||7)*86400000 : 0)
const coolingFinished=computed(()=>now.value>=coolingEnd.value)
const remaining=computed(()=>Math.max(0,coolingEnd.value-now.value))
const progress=computed(()=>item.value ? Math.min(100,Math.max(0,(1-remaining.value/(Number(item.value.days||7)*86400000))*100)) : 0)
const countdownText=computed(()=>{const s=Math.ceil(remaining.value/1000);const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sec=s%60;return d+'天 '+String(h).padStart(2,'0')+'时 '+String(m).padStart(2,'0')+'分 '+String(sec).padStart(2,'0')+'秒'})
const statusLabel=computed(()=>item.value?.status==='active'?'进行中':item.value?.status==='abandoned'?'已放弃':'已购买')
const createdText=computed(()=>item.value?new Date(Number(item.value.created)).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'')
function money(v){return Number(v||0).toLocaleString('zh-CN',{maximumFractionDigits:2})}
function categoryName(v){return categories[v]||'其他'}
function categoryIcon(v){return ({shopping:'购',food:'食',travel:'旅',life:'居',other:'＋'})[v]||'＋'}
function back(){
  const pages=getCurrentPages()
  if(pages.length>1) uni.navigateBack({delta:1,fail:()=>uni.reLaunch({url:'/pages/tools/index'})})
  else uni.reLaunch({url:'/pages/tools/index'})
}
function finish(status){
  if(!item.value||item.value.status!=='active')return
  const target=state.items.find(x=>x.id===item.value.id)
  if(!target)return back()
  target.status=status
  target.updated=Date.now()
  persist()
  const message=status==='abandoned'?(coolingFinished.value?'挑战成功，这笔钱省下了':'已提前放弃，这笔钱真正省下了'):(coolingFinished.value?'挑战失败，已记录购买':'已记录购买，挑战提前结束')
  uni.showToast({title:message,icon:'success'})
  setTimeout(()=>uni.navigateBack(),350)
}
onMounted(()=>{
  const pages=getCurrentPages()
  const current=pages[pages.length-1]
  id.value=current?.options?.id||''
  item.value=state.items.find(x=>x.id===id.value)||null
  timer.value=setInterval(()=>{now.value=Date.now()},1000)
})
onUnmounted(()=>{if(timer.value)clearInterval(timer.value)})
</script>
<style lang="scss">
.detail-page{min-height:100vh;background:#f8f9f5;color:#173d35;padding-top:env(safe-area-inset-top);box-sizing:border-box}.detail-head{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #e1e7de}.back,.head-space{width:44px;height:44px;display:flex;align-items:center;justify-content:center}.back{font-size:32px}.title{font-size:20px;font-weight:600}.detail-scroll{height:calc(100vh - 64px - env(safe-area-inset-top));box-sizing:border-box}.hero-card{margin:24px;padding:28px 20px;border-radius:20px;background:#e5eee4;text-align:center}.hero-icon{margin:auto;width:56px;height:56px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:#fff;color:#447e70}.name{display:block;margin-top:16px;font-size:25px;font-weight:700}.status{display:inline-block;margin-top:10px;padding:6px 12px;border-radius:14px;background:#d5e6d6;color:#447e70;font-size:12px}.info-card,.progress-card{margin:0 24px 16px;padding:18px;border-radius:16px;background:#fff;border:1px solid #e1e7de}.info-row{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #eef1eb;color:#737e76;font-size:13px}.info-row:last-child{border-bottom:0}.info-row .strong{color:#173d35;font-size:18px;font-weight:600}.progress-title{display:block;font-size:15px;font-weight:600}.countdown{display:block;margin-top:10px;color:#447e70;font-size:22px;font-variant-numeric:tabular-nums}.progress-track{height:7px;margin-top:18px;border-radius:5px;background:#edf0e9;overflow:hidden}.progress-fill{height:100%;background:#527059;border-radius:5px}.progress-tip{display:block;margin-top:12px;color:#737e76;font-size:12px}.actions{padding:0 24px calc(32px + env(safe-area-inset-bottom))}.actions button{width:100%;min-height:50px;margin-top:12px;border-radius:13px;font-size:15px}.save{background:#173d35;color:#fff}.buy{background:#fff;color:#527059;border:1px solid #b8cabb}.missing{text-align:center;padding:80px 24px}.missing button{margin-top:20px;background:#173d35;color:#fff}
</style>