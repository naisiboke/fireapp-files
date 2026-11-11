<template>
  <view class="profile-page fire-page-profile-index" :style="pageLayoutStyle" :class="{ 'page-entry-reset': pageEntryReset }">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="fire-tab-content" :class="{ 'tab-content-reset':pageEntryReset, 'tab-content-slide':!pageEntryReset }" :style="tabEntryStyle">

    <!-- 顶部标题 -->
    <view class="page-head">
      <text class="page-h1">我的</text>
      <text class="page-sub">好好生活，也好好规划</text>
    </view>

    <!-- 用户卡片 -->
    <view class="user-card" data-fire-press="true" @tap="goOnboarding" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
      
      <view class="user-copy">
        <text class="user-name">{{ profileName }}</text>
        <text class="user-goal">{{ profileGoal }} · 持续成长</text>
      </view>
      <text class="chevron">›</text>
    </view>

    <!-- Pro 卡片 -->
    <view class="pro-card">
      <view class="pro-copy">
        <text class="pro-kicker">FIRE生活会员</text>
        <text class="pro-title">{{ isMember ? 'Fire生活通用会员' : '开通通用会员' }}</text>
        <text class="pro-desc">{{ isMember ? membershipStatus : '¥9 / 月 · AI 无限使用 · 社区 · 深度分析' }}</text>
      </view>
      <view class="pro-btn" data-fire-press="true" @tap="openPro" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
        <text class="pro-btn-text">{{ isMember ? '查看权益' : '立即开通' }}</text>
      </view>
    </view>

    <!-- 分组 2：成长 -->
    <view class="group">
      <text class="group-title">成长养成</text>
      <view class="group-menu">
        <view class="menu-item" data-fire-press="true" @tap="comingSoon('我的成长')" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
          
          <view class="menu-copy">
            <text class="menu-name">我的成长</text>
            <text class="menu-sub">{{ expText }} · {{ completedCount }} 项任务行动</text>
          </view>
          <text class="chevron">›</text>
        </view>
        <view class="menu-item" data-fire-press="true" @tap="goPersonality" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
          
          <view class="menu-copy"><text class="menu-name">人格测试</text><text class="menu-sub">完成大五人格或 MBTI，解锁 AI 个性化建议</text></view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <!-- 分组 3：社区 -->
    <view class="group">
      <text class="group-title">社区</text>
      <view class="group-menu">
        <view class="menu-item" data-fire-press="true" @tap="goPage('/pages/community/manage')" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
          
          <view class="menu-copy"><text class="menu-name">我的社区设置</text><text class="menu-sub">管理我发布的经历、编辑或删除内容</text></view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <!-- 分组 4：反馈问题 -->
    <view class="group">
      <text class="group-title">反馈问题</text>
      <view class="group-menu">
        <view class="menu-item" data-fire-press="true" @tap="copyContact" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
          
          <view class="menu-copy"><text class="menu-name">问题反馈与奖励</text><text class="menu-sub">微信：naisiboke520 · 发现并核实真实问题后发放 VIP 兑换码</text></view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <!-- 分组 4：系统设置 -->
    <view class="group">
      <text class="group-title">系统设置</text>
      <view class="group-menu">
        <view class="menu-item" data-fire-press="true" @tap="goPage('/pages/settings/index')" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">
          
          <view class="menu-copy"><text class="menu-name">设置</text><text class="menu-sub">数据、提示音与关于本应用</text></view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <text class="version">Fire生活 · {{versionLabel}}</text>
    </view>
    <BottomTabs ref="bottomNav" current="profile" />
  </view>
</template>

<script>
import { pageEntryMixin } from '@/utils/page-entry.js'
import AppFeedback from '@/components/AppFeedback.vue'
import { feedbackPageMixin } from '@/utils/feedback-page.js'
import { showDialog, showNotice, dismissFeedback } from '@/utils/feedback.js'
import BottomTabs from '@/components/BottomTabs.vue'
import { state } from '@/store/index.js'
import {installedVersion} from '@/utils/app-update.js'
import { isMembershipActive, membershipText } from '@/utils/membership.js'

export default {
  mixins: [feedbackPageMixin, pageEntryMixin],
  onBackPress() { return dismissFeedback(this.feedbackOwnerId) },
  components: { AppFeedback,  BottomTabs },
  data() {
    return {
    }
  },

  computed: {
    versionLabel(){return installedVersion().name},
    profileName() {
      return (state.profile && state.profile.name) || '自由的旅人'
    },
    profileGoal() {
      return (state.profile && state.profile.goal) || '工作自由'
    },
    avatarLetter() {
      return this.profileName.slice(0, 1)
    },
    expText() {
      return (state.exp || 0) + ' EXP'
    },
    completedCount() {
      return (state.completed || []).length
    },
    isMember() { return isMembershipActive(state) },
    membershipStatus() { return membershipText(state) },
  },

  onShow() { uni.hideTabBar({ animation: false }) },
  methods: {
    goPage(url) {
      uni.navigateTo({ url: url })
    },
        goOnboarding() {
      uni.navigateTo({ url: '/pages/profile/edit' })
    },
    openPro() {
      uni.navigateTo({ url: '/pages/profile/membership' })
    },
    goPersonality() {
      uni.navigateTo({
        url: '/pages/personality/index',
        fail: () => showNotice({ title: '人格测试页面暂未部署，请重新构建 APP', icon: 'none' }),
      })
    },

    copyContact() {
      uni.setClipboardData({
        data: 'naisiboke520',
        success: () => showNotice({ title: '微信号已复制', icon: 'none' }),
        fail: () => showDialog({ title: '问题反馈与奖励', content: 'naisiboke520\\n\\n反馈实用问题并被采纳，可获赠 1 个月 Fire生活会员。', showCancel: false }),
      })
    },

    comingSoon(name) {
      showNotice({ title: name + ' 开发中', icon: 'none' })
    },
  },
}
</script>

<style>
@import '../../utils/tab-content.css';
@keyframes profilePageIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes profileMenuIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
.profile-page { 
  min-height: 100vh;
  padding: calc(24px + var(--fire-status-top, env(safe-area-inset-top))) 20px calc(88px + env(safe-area-inset-bottom));
  background: #f3f4f2;
  box-sizing: border-box;
}

/* 顶部 */
.page-head {
  margin-bottom: 20px;
}
.page-h1 {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #143e37;
  letter-spacing: 0.5px;
}
.page-sub {
  display: block;
  font-size: 13px;
  color: #71807a;
  margin-top: 8px;
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e7eee7;
  border-radius: 16px;
  box-shadow: 0 5px 16px rgba(23,61,53,0.06);
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #243830;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-text {
  color: #d7e5bb;
  font-size: 22px;
  font-weight: 300;
}
.user-copy {
  flex: 1;
  min-width: 0;
}
.user-name {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #243830;
}
.user-goal {
  display: block;
  font-size: 13px;
  color: #71807a;
  margin-top: 4px;
}
.chevron {
  font-size: 22px;
  color: #91a392;
  line-height: 1;
}

/* Pro 卡片 */
.pro-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 12px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #e8f4e7, #d9ead7);
  border: 1px solid #cfe3cf;
}
.pro-copy {
  flex: 1;
  min-width: 0;
}
.pro-kicker {
  display: block;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: #427153;
  font-weight: 600;
}
.pro-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #173d35;
  margin-top: 4px;
}
.pro-desc {
  display: block;
  font-size: 11px;
  color: #52715a;
  margin-top: 4px;
  line-height: 1.5;
}
.pro-btn {
  padding: 8px 12px;
  border-radius: 8px;
  background: #173d35;
  flex-shrink: 0;
}
.pro-btn-text {
  color: #ffffff;
  font-size: 12px;
  white-space: nowrap;
}

/* 分组 */
.group {
  margin-top: 20px;
}
.group-title {
  display: block;
  font-size: 13px;
  color: #52715a;
  font-weight: 600;
  margin: 0 4px 8px;
}
.group-menu {
  background: #ffffff;
  border: 1px solid #e7eee7;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 5px 16px rgba(23,61,53,0.04);
}

 .menu-item { animation: profileMenuIn .46s cubic-bezier(.22,1,.36,1) backwards; }
.menu-item:nth-child(2){animation-delay:.06s}.menu-item:nth-child(3){animation-delay:.12s}.menu-item:nth-child(4){animation-delay:.18s}.menu-item:nth-child(5){animation-delay:.24s}
.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-bottom: 1px solid #eef2ee;
}
.menu-item:last-child {
  border-bottom: 0;
}
.menu-item:active {
  background: #f7faf5;
}

.menu-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  background: #eef3ea;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.menu-icon-img {
  width: 20px;
  height: 20px;
}
.contact-icon{font-size:18px;color:#426052}

.menu-copy {
  flex: 1;
  min-width: 0;
}
.menu-name {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #243830;
  line-height: 1.4;
}
.menu-sub {
  display: block;
  font-size: 12px;
  color: #71807a;
  margin-top: 4px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 版本 */
.version {
  display: block;
  text-align: center;
  font-size: 12px;
  color: #8b9489;
  margin-top: 40px;
}
@media screen and (max-width:390px){.profile-page{padding:calc(18px + var(--fire-status-top, env(safe-area-inset-top))) 16px calc(82px + env(safe-area-inset-bottom))}.page-head{margin-bottom:14px}.page-h1{font-size:24px}.page-sub{font-size:12px}.user-card{gap:10px;padding:12px;border-radius:13px}.avatar{width:42px;height:42px}.avatar-text{font-size:18px}.user-name{font-size:16px}.user-goal{font-size:11px}.pro-card{gap:10px;padding:12px;border-radius:13px}.pro-title{font-size:14px}.pro-desc{font-size:10px}.pro-btn{padding:7px 9px}.pro-btn-text{font-size:11px}.group{margin-top:18px}.group-title{font-size:12px}.group-menu{border-radius:13px}.menu-item{gap:10px;padding:10px 12px}.menu-icon{width:30px;height:30px;border-radius:9px}.menu-icon-img{width:17px;height:17px}.menu-name{font-size:13px}.menu-sub{font-size:10px}.chevron{font-size:20px}}
/* Reset only entry animations; page nodes and scroll position stay intact. */
.profile-page.page-entry-reset{animation:none}
.profile-page.page-entry-reset .menu-item{animation:none}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-profile-index{padding-top:var(--fire-page-top)}
.user-card,.group-menu{box-shadow:none}.menu-item{padding:16px}.menu-sub{white-space:normal}.pro-card{background:#fff;border-color:#e1e7de}.pro-kicker{letter-spacing:0}
</style>