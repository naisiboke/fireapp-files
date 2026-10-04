<template>
  <view class="reading-page">
    <view class="reading-head">
      <text class="back" @tap="back">‹</text>
      <view><text class="title">认知数据库</text><text class="sub">把读过的内容，变成自己的理解</text></view>
    </view>
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'shelf' }" @tap="tab = 'shelf'"><text>书架</text></view>
      <view class="tab" :class="{ active: tab === 'history' }" @tap="tab = 'history'"><text>历史阅读记录</text></view>
    </view>
    <view v-if="tab === 'shelf'" class="content">
      <view class="empty-card"><text class="empty-icon">▱</text><text class="empty-title">你的书架还是空的</text><text class="empty-sub">收藏一本书，开始建立自己的认知地图。</text><view class="primary"><text>浏览推荐书籍</text></view></view>
    </view>
    <view v-else class="content">
      <view class="empty-card"><text class="empty-icon">◷</text><text class="empty-title">还没有阅读记录</text><text class="empty-sub">完成一次阅读后，记录会显示在这里。</text></view>
    </view>
    <text class="safe-note">认知数据库 · 模板页面</text>
  </view>
</template>
<script>
export default {
  data() { return { tab: 'shelf' } },
  methods: {
    back() { const pages=getCurrentPages(); if(pages.length>1) uni.navigateBack({delta:1,fail:()=>uni.reLaunch({url:'/pages/tools/index'})}); else uni.reLaunch({url:'/pages/tools/index'}) },
  },
}
</script>
<style>
.reading-page{min-height:100vh;padding:60px 24px 40px;background:#f7f9f4;box-sizing:border-box;color:#243830}
.reading-head{display:flex;align-items:flex-start;gap:14px}.back{font-size:32px;line-height:24px;color:#243830}.title{display:block;font-size:25px;font-weight:700}.sub{display:block;margin-top:7px;font-size:13px;color:#718074}
.tabs{display:flex;margin-top:30px;border-bottom:1px solid #dfe8dc;gap:28px}.tab{padding:13px 2px;color:#829084;font-size:14px}.tab.active{color:#243830;font-weight:700;border-bottom:2px solid #527059}
.content{padding-top:28px}.empty-card{padding:52px 22px;text-align:center;background:#fff;border:1px solid #e4ebe0;border-radius:18px}.empty-icon{display:block;font-size:36px;color:#7b9980}.empty-title{display:block;margin-top:18px;font-size:17px;font-weight:700}.empty-sub{display:block;margin-top:9px;font-size:13px;line-height:1.7;color:#718074}.primary{display:inline-flex;margin-top:24px;padding:12px 20px;border-radius:10px;background:#243830;color:#fff;font-size:13px}.safe-note{display:block;margin-top:42px;text-align:center;font-size:11px;color:#8b9489}
</style>
