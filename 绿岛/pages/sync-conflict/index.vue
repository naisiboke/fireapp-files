<template>
  <view class="sync-conflict-page" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="sync-head"><text class="sync-title">选择同步版本</text><button class="sync-close" data-fire-press="true" :disabled="busy" @tap="leave" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">×</button></view>
    <text class="sync-intro">你已登录。本机和云端的记录版本不同，可以先继续使用，稍后再处理同步。</text>
    <template v-if="summary">
      <view class="sync-versions">
        <view v-for="choice in choices" :key="choice.id" class="sync-version">
          <text class="version-name">{{ choice.name }}</text>
          <text class="version-assets">¥ {{ money(summary[choice.id].assets) }}</text>
          <text class="version-caption">当前资产</text>
          <text class="version-counts">{{ summary[choice.id].ledgerCount }} 笔记账 · {{ summary[choice.id].assetCount }} 条资产记录</text>
          <text class="version-counts">{{ summary[choice.id].wishlistCount }} 项消费计划</text>
          <text class="version-counts">{{ summary[choice.id].chatCount }} 段 AI 对话 · {{ summary[choice.id].testCount }} 份性格报告</text>
          <button class="version-pick" data-fire-press="true" :disabled="busy" @tap="choose(choice.id)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">采用{{ choice.name }}</button>
        </view>
      </view>
      <text class="sync-backup">{{ summary.backupReady ? '两份资料已在本机单独备份。切换前还会再次备份，不会自动合并或覆盖。' : '本机记录仍保留。切换前需成功备份两份资料，保存失败时不会切换。' }}</text>
      <button v-if="summary.backupReady" class="backup-copy" data-fire-press="true" :disabled="busy" @tap="copyBackup" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">复制两份备份 JSON</button>
    </template>
    <text v-else class="sync-backup">当前没有待选择的版本。可以重新检查云端同步。</text>
    <text v-if="message" class="sync-message">{{ message }}</text>
    <button class="sync-primary" data-fire-press="true" :disabled="busy" @tap="leave" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">{{ busy ? '正在处理…' : '先进入 App，稍后处理' }}</button>
    <button class="sync-refresh" data-fire-press="true" :disabled="busy" @tap="refresh" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">重新检查同步</button>
  </view>
</template>
<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppFeedback from '@/components/AppFeedback.vue'
import { pageLayoutStyle } from '@/utils/page-layout.js'
import { useFeedbackPage } from '@/utils/feedback-page.js'
import { showDialog, showNotice } from '@/utils/feedback.js'
import { getAccountConflictSummary, resolveAccountConflict, readAccountConflictBackup, hydrateFromServer } from '@/store/index.js'
import { safeReturnRoute } from '@/utils/session-recovery.js'
const feedbackOwnerId=useFeedbackPage()
const summary=ref(null),busy=ref(false),message=ref(''),next=ref('/pages/index/index')
const choices=[{id:'local',name:'本机版本'},{id:'cloud',name:'云端版本'}]
onLoad(options=>{const target=safeReturnRoute(options?.next);next.value=target.startsWith('/pages/sync-conflict/')?'/pages/index/index':target})
onShow(()=>{summary.value=getAccountConflictSummary()})
function money(value){return value===null?'待填写':Number(value).toLocaleString('zh-CN')}
function leave(){if(!busy.value)uni.reLaunch({url:next.value})}
async function refresh(){
 if(busy.value)return
 busy.value=true
 try{const result=await hydrateFromServer();summary.value=getAccountConflictSummary();message.value=result.conflict?'请核对后选择，或先进入 App。':result.loaded?'同步已恢复，可以继续使用。':result.error?.message||'暂时无法读取云端，本机记录已保留'}
 finally{busy.value=false}
}
async function choose(choice){
 if(busy.value||!summary.value)return
 busy.value=true
 const reviewed={id:summary.value.id,localVersion:summary.value.localVersion}
 try{
   const confirmed=await showDialog({
     title:choice==='cloud'?'采用云端版本？':'采用本机版本？',
     content:choice==='cloud'?'当前设备将改用云端这份完整资料，本机原记录会单独备份。':'本机这份完整资料将同步到云端，替换云端当前版本。两份资料都会先单独备份。',
     confirmText:'确认采用',cancelText:'再看看',
   })
   if(!confirmed.confirm)return
   const result=await resolveAccountConflict(choice,reviewed)
   summary.value=getAccountConflictSummary()
   if(!result.resolved){message.value='资料刚有变化，请重新核对后选择。';return}
   showNotice({title:result.synced?'版本已采用，同步已恢复':'已采用本机版本，联网后可重试同步',icon:'success'})
   uni.reLaunch({url:next.value})
 }catch(error){summary.value=getAccountConflictSummary();message.value=error.message||'暂时未能处理，原记录已保留'}
 finally{busy.value=false}
}
function copyBackup(){
 const backup=readAccountConflictBackup(summary.value?.id)
 if(!backup)return showNotice({title:'未找到备份，请重新检查同步',icon:'none'})
 uni.setClipboardData({data:JSON.stringify(backup,null,2),success:()=>showNotice({title:'两份备份已复制，可粘贴保存为 JSON 文件',icon:'none'})})
}
</script>
<style scoped>
.sync-conflict-page{min-height:100vh;box-sizing:border-box;padding:var(--fire-page-top) 20px calc(28px + env(safe-area-inset-bottom));background:#f5f7f2;color:#243830}
.sync-head{display:flex;align-items:center;justify-content:space-between;min-height:44px}.sync-title{font-size:21px;font-weight:700;color:#173d35}.sync-close{width:44px;height:44px;padding:0;background:transparent;color:#173d35;font-size:28px}
.sync-intro{display:block;margin:22px 0;color:#61776b;font-size:14px;line-height:1.8}.sync-versions{display:flex;flex-wrap:wrap;gap:12px}.sync-version{flex:1;min-width:135px;padding:18px 14px;border-radius:16px;border:1px solid #dae6d9;background:#fff}
.version-name,.version-assets,.version-caption,.version-counts{display:block}.version-name{font-size:16px;font-weight:600}.version-assets{margin-top:20px;color:#173d35;font-size:22px;font-weight:700;overflow-wrap:anywhere}.version-caption{margin:5px 0 16px;color:#819086;font-size:12px}.version-counts{margin-top:7px;color:#61776b;font-size:12px;line-height:1.7}
.version-pick{width:100%;margin-top:20px;padding:10px 5px;border-radius:12px;background:#e5eee2;color:#315f4a;font-size:13px}.sync-backup,.sync-message{display:block;margin-top:18px;color:#6d7f72;font-size:12px;line-height:1.8}.sync-message{color:#94633f}
.sync-primary{width:100%;margin-top:28px;border-radius:12px;background:#173d35;color:#fff;font-size:15px}.sync-refresh,.backup-copy{display:block;margin:12px auto 0;background:transparent;color:#527059;font-size:13px}
button[disabled]{opacity:.5}
</style>
