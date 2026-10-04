<template>
  <view class="add-page">
    <view class="add-head"><view class="back" @tap="back">‹</view><text class="title">添加消费计划</text><view class="head-space"></view></view>
    <scroll-view class="form-scroll" scroll-y>
      <view class="form-content">
        <text class="label">名称</text>
        <input class="field-input" v-model="form.name" type="text" placeholder="请输入消费计划名称" placeholder-class="placeholder" />
        <text class="label">预计金额</text>
        <input class="field-input" v-model="form.amount" type="digit" placeholder="请输入预计金额" placeholder-class="placeholder" />
        <text class="label">分类</text>
        <view class="choices"><view v-for="cat in categories" :key="cat.id" class="choice" :class="{active:form.category===cat.id}" @tap="form.category=cat.id">{{cat.name}}</view></view>
        <text class="label">冷静期</text>
        <view class="choices"><view v-for="d in [3,7,30]" :key="d" class="choice" :class="{active:form.days===d}" @tap="form.days=d">{{d}} 天</view></view>
        <text v-if="error" class="error">{{error}}</text>
      </view>
    </scroll-view>
    <view class="submit-bar"><button class="submit fire-button-primary fire-button-lg" type="button" @click="handleSubmit">完成</button></view>
  </view>
</template>
<script setup>
import { reactive, ref } from 'vue'
import { state, persist } from '@/store/index.js'
const form=reactive({name:'',amount:'',category:'other',days:7})
const error=ref('')
const categories=[{id:'shopping',name:'购物'},{id:'food',name:'饮食'},{id:'travel',name:'旅行'},{id:'life',name:'生活'},{id:'other',name:'其他'}]
function back(){uni.navigateBack()}
function handleSubmit(){
  const name=String(form.name||'').trim()
  const amount=Number(form.amount)
  if(!name){error.value='请填写消费计划名称';uni.showToast({title:'请填写消费计划名称',icon:'none'});return}
  if(!Number.isFinite(amount)||amount<=0){error.value='请填写正确的预计金额';uni.showToast({title:'请填写正确的预计金额',icon:'none'});return}
  state.items.push({id:'item-'+Date.now(),name,amount,category:form.category,days:form.days,created:Date.now(),status:'active',note:''})
  persist()
  uni.showToast({title:'消费计划已添加',icon:'success'})
  setTimeout(()=>uni.navigateBack(),250)
}
</script>
<style lang="scss">
.add-page{position:fixed;inset:0;background:#f8f9f5;color:#173d35;display:flex;flex-direction:column;box-sizing:border-box;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);overflow:hidden}
.add-head{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;flex-shrink:0;border-bottom:1px solid #e1e7de}.back{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:32px}.title{font-size:20px;font-weight:600}.head-space{width:44px}
.form-scroll{flex:1;height:0;min-height:0;width:100%;pointer-events:auto}.form-content{padding:8px 24px calc(112px + env(safe-area-inset-bottom));box-sizing:border-box}.label{display:block;margin-top:22px;color:#737e76;font-size:13px}.field-input{display:block;width:100%;height:54px;margin-top:10px;padding:0 16px;border:1px solid #e1e7de;border-radius:13px;background:#fff;box-sizing:border-box;color:#173d35;font-size:16px;pointer-events:auto}.field-input:focus{border-color:#4f8068;outline:none}.placeholder{color:#a2afa5}.choices{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.choice{min-width:58px;min-height:44px;padding:0 16px;display:flex;align-items:center;justify-content:center;border-radius:11px;background:#edf0e9;color:#737e76;font-size:13px;box-sizing:border-box}.choice.active{background:#e5eee4;color:#173d35;font-weight:600}.error{display:block;margin-top:18px;color:#a35d4e;font-size:13px}.submit-bar{position:relative;z-index:20;flex-shrink:0;padding:12px 24px calc(16px + env(safe-area-inset-bottom));background:#f8f9f5;border-top:1px solid #e1e7de;pointer-events:auto}.submit{position:relative;z-index:21;width:100%;min-height:50px;margin:0;border-radius:13px;background:#173d35;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;pointer-events:auto}.submit:active{transform:scale(.98)}.submit:after{border:0}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>