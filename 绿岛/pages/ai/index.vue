<template>
  <view class="ai-page">
    <view class="head"><text class="title">问 AI</text><text class="close" @tap="close">×</text></view>
    <view class="hero"><text class="kicker">行为建议 AI</text><text class="hero-title">帮你看见习惯，做一个更轻松的选择</text><text class="hero-sub">只提供消费、记录和生活习惯建议，不提供金融服务或投资建议。</text></view>
    <view class="card">
      <textarea v-model="question" maxlength="240" class="input" placeholder="例如：我最近总是冲动消费，怎么开始记录？" placeholder-class="placeholder" />
      <button class="ask" @tap="ask">获得建议</button>
    </view>
    <view v-if="answer" class="answer"><text class="answer-title">给你的建议</text><text class="answer-text">{{ answer }}</text></view>
    <view class="chips"><text v-for="item in prompts" :key="item" class="chip" @tap="question=item">{{ item }}</text></view>
  </view>
</template>
<script>
export default {
  data() { return { question: '', answer: '', prompts: ['如何减少冲动消费？', '帮我制定记录习惯', '我总是拖延怎么办？'] } },
  methods: {
    close() { uni.navigateBack() },
    ask() {
      const q = this.question.trim()
      if (!q) return uni.showToast({ title: '先写下你想问的事', icon: 'none' })
      this.answer = '先从一个最小动作开始：今天只记录一笔消费，写下当时的情绪和原因。连续记录三天后，再回头看看哪些场景最容易让你冲动。'
    },
  },
}
</script>
<style>
.ai-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 20px 32px;background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:10;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#fdfdfb;border-bottom:1px solid #edf1eb;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#243830}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#243830}.hero{padding:22px 4px 20px}.kicker{display:block;color:#527059;font-size:12px;letter-spacing:.14em;font-weight:600}.hero-title{display:block;color:#173d35;font-size:26px;font-weight:700;line-height:1.4;margin-top:10px}.hero-sub{display:block;color:#71807a;font-size:13px;line-height:1.7;margin-top:10px}.card,.answer{padding:18px;background:#fff;border:1px solid #e5e9e0;border-radius:15px}.input{width:100%;height:130px;color:#243830;font-size:15px;line-height:1.6}.placeholder{color:#a2afa5}.ask{height:46px;border:0;border-radius:11px;background:#173d35;color:#fff;font-size:14px}.answer{margin-top:12px;background:#eff3ea}.answer-title{display:block;color:#243830;font-weight:600;font-size:15px}.answer-text{display:block;color:#52605a;font-size:14px;line-height:1.8;margin-top:8px}.chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}.chip{padding:8px 11px;border-radius:18px;background:#f1f4ef;color:#527059;font-size:12px}
</style>
