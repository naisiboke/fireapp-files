<template>
  <view class="edit-page">
    <view class="head">
      <text class="title">个人资料</text>
      <text class="close" @tap="close">×</text>
    </view>

    <view class="card">
      <text class="label">头像</text>
      <view class="avatar-row" @tap="chooseAvatar">
        <image v-if="avatarUrl" class="avatar" :src="avatarUrl" mode="aspectFill" />
        <view v-else class="avatar avatar-fallback"><text>{{ name.slice(0, 1) || '岛' }}</text></view>
        <view class="avatar-copy"><text class="avatar-title">更换头像</text><text class="hint">图片会保存到云端</text></view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="card">
      <text class="label">昵称</text>
      <input v-model="name" class="name-input" maxlength="24" placeholder="请输入昵称" placeholder-class="placeholder" />
      <text class="hint">这个名字会显示在你的个人主页和社区内容中</text>
    </view>

    <button class="save" :disabled="saving" @tap="save">{{ saving ? '保存中…' : '保存资料' }}</button>
  </view>
</template>

<script>
import { state, persist } from '@/store/index.js'
import { uploadAvatar, getAvatarURL } from '@/utils/cloudbase-auth.js'

export default {
  data() {
    return { name: '', avatarUrl: '', avatarFileID: '', saving: false }
  },
  onLoad() {
    const profile = state.profile || {}
    this.name = profile.name || '自由的旅人'
    this.avatarFileID = profile.avatarFileID || ''
    if (profile.avatarUrl) this.avatarUrl = profile.avatarUrl
    if (this.avatarFileID) this.loadAvatar(this.avatarFileID)
  },
  methods: {
    close() { uni.navigateBack() },
    async loadAvatar(fileID) {
      try {
        const url = await getAvatarURL(fileID)
        if (url) this.avatarUrl = url
      } catch (e) {}
    },
    chooseAvatar() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const filePath = res.tempFilePaths && res.tempFilePaths[0]
          if (!filePath) return
          this.avatarUrl = filePath
          this.saving = true
          try {
            this.avatarFileID = await uploadAvatar(filePath)
            uni.showToast({ title: '头像已上传', icon: 'none' })
          } catch (error) {
            this.avatarFileID = ''
            uni.showToast({ title: error.message || '头像上传失败，请重试', icon: 'none' })
          } finally { this.saving = false }
        },
      })
    },
    save() {
      const value = this.name.trim()
      if (!value) return uni.showToast({ title: '请输入昵称', icon: 'none' })
      state.profile = { ...(state.profile || {}), name: value, avatarFileID: this.avatarFileID }
      persist()
      uni.showToast({ title: '个人资料已保存', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 350)
    },
  },
}
</script>

<style>
.edit-page{min-height:100vh;padding:calc(60px + env(safe-area-inset-top)) 20px calc(28px + env(safe-area-inset-bottom));background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:10;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 20px 0;display:flex;align-items:center;justify-content:space-between;background:#fdfdfb;border-bottom:1px solid #edf1eb;box-sizing:border-box}.title{font-size:18px;font-weight:600;color:#243830}.close{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#243830}.card{padding:18px;background:#fff;border:1px solid #e5e9e0;border-radius:14px;margin-bottom:12px}.label{display:block;color:#243830;font-size:15px;font-weight:600;margin-bottom:14px}.avatar-row{display:flex;align-items:center;gap:13px;min-height:72px}.avatar{width:72px;height:72px;border-radius:50%;background:#dfece1}.avatar-fallback{display:flex;align-items:center;justify-content:center;background:#243830;color:#d7e5bb;font-size:26px}.avatar-copy{flex:1}.avatar-title{display:block;color:#173d35;font-size:15px}.hint{display:block;color:#71807a;font-size:12px;line-height:1.6;margin-top:5px}.arrow{font-size:24px;color:#91a392}.name-input{height:48px;border-bottom:1px solid #dce5dc;color:#243830;font-size:16px}.placeholder{color:#a2afa5}.card>.hint{margin-top:10px}.save{width:100%;height:50px;border:0;border-radius:12px;background:#173d35;color:#fff;font-size:16px;margin-top:8px}.save[disabled]{opacity:.65}
</style>
