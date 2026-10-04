<template>
  <view class="privacy-page">
    <view class="head">
      <text class="back" @tap="back">‹</text>
      <text class="title">隐私政策</text>
      <view class="spacer"></view>
    </view>

    <view class="content">
      <text class="h2">FIRE Forge 隐私政策</text>
      <text class="date">更新日期：2026-10-04</text>

      <text class="h3">一、我们收集的信息</text>
      <text class="p">本 App 不收集任何个人身份信息。您输入的资产、消费、目标等数据仅存储在您的设备本地。</text>

      <text class="h3">二、数据用途</text>
      <text class="p">您输入的所有数据仅用于本机内的计算与展示，不会上传至任何服务器，也不会与任何第三方分享。</text>

      <text class="h3">三、权限使用</text>
      <text class="p">本 App 不申请任何系统权限（相机、定位、通讯录、麦克风等）。</text>

      <text class="h3">四、数据删除</text>
      <text class="p">您可以在「我的 → 设置」中重置全部本地数据，或直接卸载 App 完成删除。</text>

      <text class="h3">五、儿童隐私</text>
      <text class="p">本 App 不面向 13 岁以下儿童，也不会有意收集儿童信息。</text>

      <text class="h3">六、政策更新</text>
      <text class="p">如本政策有重大变更，我们会通过应用商店更新说明。</text>

      <text class="h3">七、联系我们</text>
      <text class="p">如对本政策有疑问，请通过应用商店页面联系开发者。</text>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    back() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/profile/index' }) })
      } else {
        uni.reLaunch({ url: '/pages/profile/index' })
      }
    },
  },
  onBackPress() {
    // 不在 onBackPress 中再次调用 navigateBack，避免触发递归错误。
    return false
  },
}
</script>

<style>
.privacy-page {
  min-height: 100vh;
  padding: 60px 24px 40px;
  background: #fdfdfb;
  box-sizing: border-box;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}
.back {
  width: 40px;
  height: 40px;
  font-size: 28px;
  line-height: 40px;
  text-align: center;
  color: #243830;
}
.title {
  font-size: 18px;
  font-weight: 600;
  color: #243830;
}
.spacer { width: 40px; }

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.h2 {
  font-size: 22px;
  font-weight: 700;
  color: #143e37;
}
.date {
  font-size: 13px;
  color: #71807a;
}
.h3 {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #243830;
  margin-top: 16px;
}
.p {
  display: block;
  font-size: 14px;
  line-height: 1.8;
  color: #52605a;
}
</style>