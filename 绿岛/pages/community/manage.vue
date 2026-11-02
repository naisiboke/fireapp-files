<template>
  <view class="manage-page fire-page-community-manage" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="head"><view class="back" @tap="back">‹</view><text class="title">我的社区设置</text><view class="close" @tap="close">×</view></view>
    <view v-if="posts.length" class="list">
      <view v-for="post in posts" :key="post.id" class="card">
        <view v-if="editingId !== post.id">
          <view class="card-head"><text class="tag">{{ post.category || '我的经历' }}</text><view class="meta"><text class="status" :class="statusClass(post)">{{ statusText(post) }}</text><text class="date">{{ formatDate(post.createdAt) }}</text></view></view>
          <text class="post-title">{{ post.title }}</text>
          <text class="post-content">{{ post.content || post.summary }}</text>
          <text v-if="post.reviewReason" class="review-reason">{{ post.reviewReason }}</text>
          <view class="actions"><view class="edit" @tap="startEdit(post)">编辑</view><view v-if="post.status === 'pending' || post.status === 'review_failed'" class="retry" @tap="retryReview(post)">重试审核</view><view class="delete" @tap="removePost(post)">删除</view></view>
        </view>
        <view v-else>
          <text class="label">主题</text><input v-model="draft.title" class="input" maxlength="80" />
          <text class="label">内容</text><textarea v-model="draft.content" class="area" maxlength="300"></textarea>
          <view class="actions"><view class="edit" @tap="saveEdit(post)">保存</view><view class="delete" @tap="cancelEdit">取消</view></view>
        </view>
      </view>
    </view>
    <view v-else class="empty"><text>你还没有发布经历</text><view class="publish" @tap="openShare">分享我的经历</view></view>
  </view>
</template>
<script setup>
import { useSessionDraft } from '@/utils/session-drafts.js'
import { pageLayoutStyle } from '@/utils/page-layout.js'
import AppFeedback from '@/components/AppFeedback.vue'
import { useFeedbackPage } from '@/utils/feedback-page.js'
import { showDialog, showNotice } from '@/utils/feedback.js'
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { CS } from '@/utils/community-store.js'
const feedbackOwnerId=useFeedbackPage()
const posts=ref([]),editingId=ref(''),draft=ref({title:'',content:''})
let reviewing=new Set()
function load(){posts.value=CS.ugc().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))}
onShow(async()=>{load();const result=await CS.hydrate();load();if(!result.ok)showNotice({title:'部分内容尚未恢复，请联网后重试',icon:'none'})})
function back(){uni.navigateBack()}
function close(){uni.switchTab({url:'/pages/profile/index'})}
function openShare(){uni.navigateTo({url:'/pages/community/share?from=community'})}
function formatDate(value){return value?new Date(value).toLocaleDateString('zh-CN'):'刚刚'}
function statusText(post){return {approved:'已发布',pending:'审核中',rejected:'需要修改',review_failed:'待重试'}[post.status]||'待处理'}
function statusClass(post){return 'status-'+(post.status||'pending')}
function startEdit(post){uni.navigateTo({url:'/pages/community/share?editId='+encodeURIComponent(post.id)})}
async function retryReview(post){
 if(reviewing.has(post.id))return
 reviewing.add(post.id)
 try{
  const saved=await CS.submitPost(post)
  load()
  showNotice({title:saved.status==='approved'?'云端审核通过，已发布':saved.reviewReason||'内容已保存，请查看状态',icon:'none',duration:3000})
 }catch(error){load();showNotice({title:error.message||'未确认云端保存，本机内容已保留',icon:'none'})}
 finally{reviewing.delete(post.id)}
}
function cancelEdit(){editingId.value=''}
async function saveEdit(post){
 if(!String(draft.value.title||'').trim()||!String(draft.value.content||'').trim())return
 await retryReview({...post,title:draft.value.title.trim(),content:draft.value.content.trim()})
 editingId.value=''
}
function removePost(post){
 showDialog({title:'删除这段经历？',content:'删除后将从社区隐藏，云端保留恢复记录。',confirmText:'删除',success:async({confirm})=>{
  if(!confirm)return
  try{
   await CS.deletePost(post)
   load();showNotice({title:'已删除',icon:'none'})
  }catch(error){showNotice({title:'删除尚未同步，内容已保留，请联网后重试',icon:'none'})}
 }})
}
const manageDraft=useSessionDraft(()=>({editingId:editingId.value,draft:draft.value}),value=>{
 if(typeof value?.editingId==='string')editingId.value=value.editingId
 if(value?.draft)draft.value=value.draft
})
</script>
<style>
.manage-page{min-height:100vh;padding:calc(62px + var(--fire-status-top, env(safe-area-inset-top))) 18px calc(32px + env(safe-area-inset-bottom));background:#f3f6f1;color:#243830;box-sizing:border-box}.head{position:fixed;z-index:5;top:0;left:0;right:0;height:calc(58px + var(--fire-status-top, env(safe-area-inset-top)));padding:var(--fire-status-top, env(safe-area-inset-top)) 18px 0;display:flex;align-items:center;justify-content:space-between;background:#f3f6f1;border-bottom:1px solid #dfe7dd;box-sizing:border-box}.back,.space,.close{width:40px;height:40px;display:flex;align-items:center;justify-content:center}.back{font-size:32px;color:#173d35}.title{font-size:19px;font-weight:700}.list{display:flex;flex-direction:column;gap:12px}.card{padding:16px;border-radius:16px;background:#fff;border:1px solid #e0e9df;box-shadow:0 4px 14px rgba(36,56,48,.06)}.card-head{display:flex;justify-content:space-between;align-items:center}.meta{display:flex;align-items:center;gap:8px}.status{padding:3px 7px;border-radius:7px;font-size:11px;background:#e8f0e6;color:#527059}.status-pending{background:#fff4d8;color:#9a6b21}.status-rejected,.status-review_failed{background:#fff0eb;color:#a35d4e}.tag{padding:4px 8px;border-radius:7px;background:#e8f0e6;color:#527059;font-size:12px}.date{color:#89968b;font-size:11px}.post-title{display:block;margin-top:13px;font-size:18px;font-weight:700}.post-content{display:block;margin-top:8px;color:#52605a;font-size:13px;line-height:1.7;white-space:pre-wrap}.review-reason{display:block;margin-top:8px;color:#8a6a2b;font-size:11px;line-height:1.5}.actions{display:flex;gap:10px;margin-top:16px}.edit,.delete,.retry,.publish{flex:1;padding:11px;text-align:center;border-radius:10px;font-size:13px}.edit{background:#e8f0e6;color:#243830}.retry{background:#fff4d8;color:#8a6a2b}.delete{background:#fff2ee;color:#a35d4e}.label{display:block;margin-top:4px;margin-bottom:7px;color:#52605a;font-size:12px}.input,.area{width:100%;box-sizing:border-box;border:1px solid #dfe7dd;border-radius:10px;background:#f7f9f4;color:#243830;padding:11px;font-size:14px}.area{height:130px}.empty{text-align:center;padding:90px 20px;color:#71807a;font-size:14px}.publish{display:block;margin:20px auto 0;max-width:180px;background:#173d35;color:#fff}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-community-manage > .head{height:var(--fire-header-height);padding-top:var(--fire-page-top);box-sizing:border-box}
 .fire-page-community-manage{padding-top:var(--fire-content-top)}
</style>