<template>
  <view class="guide-page">
    <view class="progress"><view class="progress-fill" :style="{ width: ((step + 1) / steps.length * 100) + '%' }"></view></view>
    <view class="guide-top"><text class="brand">绿岛新手指南</text><text class="counter">{{ step + 1 }} / {{ steps.length }}</text></view>
    <view class="guide-main">
      <view class="guide-icon">{{ current.icon }}</view>
      <text class="guide-title">{{ current.title }}</text>
      <text class="guide-sub">{{ current.sub }}</text>
      <view class="example"><text class="example-label">{{ current.label }}</text><text class="example-text">{{ current.example }}</text></view>
    </view>
    <view class="guide-bottom"><button class="next" @tap="next">{{ step === steps.length - 1 ? '开始使用' : '下一步' }}</button><text class="hint">按提示一步一步来，很快就会懂</text></view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      step: 0,
      nextPage: '/pages/index/index',
      steps: [
        { icon: '日', title: '先看 FIRE 倒计时', sub: '填好收入、支出和资产，就能看到你的目标日期。', label: '首页会显示', example: '预计自由日：你的计划目标' },
        { icon: '记', title: '每天记一笔账', sub: '花了钱就记下来，知道钱去了哪里。', label: '记账就是', example: '记录一笔收入或消费' },
        { icon: '清单', title: '想买先放拔草', sub: '想买的东西先放几天，冷静后再决定。', label: '拔草就是', example: '把想买的东西放进冷静清单' },
        { icon: '+', title: '中间加号是快捷入口', sub: '点底部中间的加号，可以快速记账、问 AI、听音乐。', label: '三个入口', example: '记账 · 问 AI · 音乐' },
        { icon: 'AI', title: '问 AI，但只问生活', sub: 'AI 可以帮你改善消费和生活习惯，不提供投资建议。', label: '例如', example: '我总是冲动消费，怎么开始？' },
      ],
    }
  },
  computed: { current() { return this.steps[this.step] } },
  onLoad(options) {
    if (uni.getStorageSync('fire_login_status') !== true) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    if (options && options.next) {
      try { this.nextPage = decodeURIComponent(options.next) } catch (e) { this.nextPage = options.next }
    }
  },
  methods: {
    next() {
      if (this.step < this.steps.length - 1) {
        this.step += 1
        return
      }
      uni.setStorageSync('fire_app_guide_done', true)
      uni.reLaunch({ url: this.nextPage || '/pages/index/index' })
    },
  },
}
</script>

<style>
.guide-page{min-height:100vh;background:#f2f7f1;color:#173d35;padding:calc(20px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box;display:flex;flex-direction:column}.progress{height:5px;border-radius:4px;background:#dbe8db;overflow:hidden}.progress-fill{height:100%;border-radius:4px;background:#39705b;transition:width .25s ease}.guide-top{display:flex;align-items:center;justify-content:space-between;margin-top:22px}.brand{font-size:17px;font-weight:700}.counter{font-size:12px;color:#71807a}.guide-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.guide-icon{width:82px;height:82px;border-radius:26px;display:flex;align-items:center;justify-content:center;background:#dcecdf;color:#39705b;font-size:26px;font-weight:700;box-shadow:0 8px 20px rgba(42,88,64,.08)}.guide-title{display:block;color:#173d35;font-size:27px;font-weight:700;margin-top:24px}.guide-sub{display:block;max-width:330px;color:#627269;font-size:15px;line-height:1.8;margin-top:10px}.example{width:100%;max-width:360px;margin-top:28px;padding:18px;border-radius:17px;background:#fff;border:1px solid #e1ece1;box-sizing:border-box;text-align:left}.example-label{display:block;color:#527059;font-size:12px}.example-text{display:block;color:#243830;font-size:17px;line-height:1.6;margin-top:7px}.guide-bottom{display:flex;flex-direction:column;align-items:center}.next{width:100%;height:52px;border:0;border-radius:14px;background:#173d35;color:#fff;font-size:16px}.hint{color:#8b9489;font-size:12px;margin-top:11px}
</style>
