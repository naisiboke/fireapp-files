<template>
  <view class="asset-page">
    <view class="head"><view class="back" @tap="back">‹</view><text class="title">记录本月资产</text><view class="space"></view></view>
    <view class="hero"><text class="label">本月资产</text><text class="amount">¥ {{ amount || '0' }}</text><text class="hint">记录当前可投资资产，帮助自由日保持准确</text></view>
    <view class="card"><text class="field-label">资产金额（元）</text><input v-model="amount" class="input" type="digit" placeholder="例如 100000" /><text class="field-label">记录日期</text><picker mode="date" :value="date" :end="today" @change="date=$event.detail.value"><view class="date">{{ date }}</view></picker><view class="save" @tap="save"><text>保存资产记录</text></view></view>
    <view class="records"><text class="section-title">最近记录</text><view v-for="item in history" :key="item.id" class="record"><text>{{ item.date }}</text><text>¥ {{ Number(item.amount||0).toLocaleString('zh-CN') }}</text></view></view>
  </view>
</template>
<script setup>
import { ref, computed } from 'vue'
import { state, persist } from '@/store/index.js'
import { LocalDay, SaveAssetRecord } from '@/utils/engine.js'
const today=LocalDay(),date=ref(today),amount=ref(''),history=computed(()=>[...(state.assetHistory||[])].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8))
function back(){uni.navigateBack({fail:()=>uni.switchTab({url:'/pages/index/index'})})}
function save(){if(!amount.value||Number(amount.value)<0)return uni.showToast({title:'请输入有效资产金额',icon:'none'});const result=SaveAssetRecord(state,{amount:amount.value,date:date.value},today);if(!result)return uni.showToast({title:'保存失败，请检查日期和金额',icon:'none'});persist();uni.showToast({title:'资产已保存',icon:'success'});amount.value=''}
</script>
<style>
.asset-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 20px calc(34px + env(safe-area-inset-bottom));background:#f3f6f1;color:#243830;box-sizing:border-box}.head{position:fixed;z-index:5;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 18px 0;display:flex;align-items:center;justify-content:space-between;background:#f3f6f1;border-bottom:1px solid #dfe7dd;box-sizing:border-box}.back,.space{width:40px;height:40px;display:flex;align-items:center;justify-content:center}.back{font-size:32px}.title{font-size:19px;font-weight:700}.hero{margin-top:18px;padding:22px;border-radius:20px;background:linear-gradient(135deg,#e0eee0,#f8fbf5)}.label{display:block;color:#527059;font-size:13px}.amount{display:block;margin-top:8px;font-size:34px;font-weight:700}.hint{display:block;margin-top:8px;color:#71807a;font-size:12px}.card{margin-top:14px;padding:18px;border-radius:16px;background:#fff;border:1px solid #e0e9df}.field-label{display:block;margin-top:4px;margin-bottom:8px;color:#52605a;font-size:13px}.input,.date{width:100%;height:48px;padding:0 12px;line-height:48px;border:1px solid #dfe7dd;border-radius:10px;background:#f7f9f4;box-sizing:border-box;font-size:16px}.date{color:#243830}.save{height:48px;margin-top:20px;border-radius:11px;background:#173d35;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px}.records{margin-top:24px}.section-title{display:block;font-size:16px;font-weight:700;margin-bottom:10px}.record{display:flex;justify-content:space-between;padding:13px 4px;border-bottom:1px solid #e3ebe1;color:#52605a;font-size:13px}
</style>