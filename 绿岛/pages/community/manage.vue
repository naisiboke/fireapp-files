<template>
  <view class="manage-page">
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
import { ref, onMounted } from 'vue'
import { CS } from '@/utils/community-store.js'
import { reviewCommunityPost } from '@/utils/community-review.js'
const posts=ref([]), editingId=ref(''), draft=ref({title:'',content:''})
function load(){
 const list=CS.ugc()
 const now=Date.now()
 let changed=false
 list.forEach(post=>{
  if(post.status==='pending' && now-Number(post.createdAt||now)>60000){
   post.status='review_failed';post.reviewStatus='review_failed';post.reviewReason='审核请求已超时，请点击“重试审核”';changed=true
  }
 })
 if(changed)CS.saveUGC(list)
 posts.value=list.filter(x=>x.displayName==='3263***').sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))
}
function back(){uni.navigateBack()}
function close(){uni.switchTab({url:'/pages/profile/index'})}
function openShare(){uni.navigateTo({url:'/pages/community/share?from=community'})}
function formatDate(v){return v?new Date(v).toLocaleDateString('zh-CN'):'刚刚'}
function statusText(post){const status=post.status||'approved';return {approved:'已发布',pending:'审核中',rejected:'未通过',review_failed:'审核失败'}[status]||'待处理'}
function statusClass(post){return 'status-'+(post.status||'approved')}
function startEdit(post){uni.navigateTo({url:'/pages/community/share?editId='+encodeURIComponent(post.id)})}
async function retryReview(post){
 post.status='pending';post.reviewStatus='pending';post.reviewReason='正在重新请求 AI 审核';CS.saveUGC(CS.ugc());load()
 try{
  const verdict=await reviewCommunityPost(post)
  const list=CS.ugc(),target=list.find(x=>x.id===post.id)
  if(target){target.status=verdict.approved?'approved':'rejected';target.reviewStatus=target.status;target.reviewReason=verdict.reason;target.reviewedAt=Date.now();CS.saveUGC(list)}
  load();uni.showToast({title:verdict.approved?'审核通过，已发布':'审核未通过：'+verdict.reason,icon:'none',duration:3000})
 }catch(error){
  const list=CS.ugc(),target=list.find(x=>x.id===post.id)
  if(target){target.status='review_failed';target.reviewStatus='review_failed';target.reviewReason=error.message||'审核服务暂时不可用';CS.saveUGC(list)}
  load();uni.showToast({title:'审核请求失败，请检查云端 API',icon:'none'})
 }
}

function cancelEdit(){editingId.value=''}
async function saveEdit(post){
 const title=String(draft.value.title||'').trim(),content=String(draft.value.content||'').trim()
 if(!title||!content)return uni.showToast({title:'请填写完整内容',icon:'none'})
 const list=CS.ugc(),target=list.find(x=>x.id===post.id)
 if(!target)return
 target.title=title;target.content=content;target.summary=content.slice(0,100);target.updatedAt=Date.now();target.status='pending';target.reviewStatus='pending';target.reviewReason='等待 AI 审核'
 if(!CS.saveUGC(list))return uni.showToast({title:'保存失败',icon:'none'})
 editingId.value='';load();uni.showToast({title:'已保存，正在审核',icon:'none'})
 try {
  const verdict=await reviewCommunityPost(target)
  const latest=CS.ugc().find(x=>x.id===post.id)
  if(latest){latest.status=verdict.approved?'approved':'rejected';latest.reviewStatus=latest.status;latest.reviewReason=verdict.reason;latest.reviewedAt=Date.now();CS.saveUGC(CS.ugc())}
  load();uni.showToast({title:verdict.approved?'审核通过，已发布':'审核未通过：'+verdict.reason,icon:'none',duration:3000})
 } catch(error) {
  const latest=CS.ugc().find(x=>x.id===post.id)
  if(latest){latest.status='review_failed';latest.reviewStatus='review_failed';latest.reviewReason=error.message||'审核服务暂时不可用';CS.saveUGC(CS.ugc())}
  load();uni.showToast({title:'审核失败，请稍后重试',icon:'none'})
 } 
}
function removePost(post){
 uni.showModal({title:'删除这段经历？',content:'删除后无法恢复。',confirmText:'删除',confirmColor:'#a35d4e',success:({confirm})=>{
  if(!confirm)return
  const list=CS.ugc().filter(x=>x.id!==post.id)
  if(CS.saveUGC(list)){load();uni.showToast({title:'已删除',icon:'none'})}
 }})
}
onMounted(load)
</script>
<style>
.manage-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 18px calc(32px + env(safe-area-inset-bottom));background:#f3f6f1;color:#243830;box-sizing:border-box}.head{position:fixed;z-index:5;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 18px 0;display:flex;align-items:center;justify-content:space-between;background:#f3f6f1;border-bottom:1px solid #dfe7dd;box-sizing:border-box}.back,.space,.close{width:40px;height:40px;display:flex;align-items:center;justify-content:center}.back{font-size:32px;color:#173d35}.title{font-size:19px;font-weight:700}.list{display:flex;flex-direction:column;gap:12px}.card{padding:16px;border-radius:16px;background:#fff;border:1px solid #e0e9df;box-shadow:0 4px 14px rgba(36,56,48,.06)}.card-head{display:flex;justify-content:space-between;align-items:center}.meta{display:flex;align-items:center;gap:8px}.status{padding:3px 7px;border-radius:7px;font-size:11px;background:#e8f0e6;color:#527059}.status-pending{background:#fff4d8;color:#9a6b21}.status-rejected,.status-review_failed{background:#fff0eb;color:#a35d4e}.tag{padding:4px 8px;border-radius:7px;background:#e8f0e6;color:#527059;font-size:12px}.date{color:#89968b;font-size:11px}.post-title{display:block;margin-top:13px;font-size:18px;font-weight:700}.post-content{display:block;margin-top:8px;color:#52605a;font-size:13px;line-height:1.7;white-space:pre-wrap}.review-reason{display:block;margin-top:8px;color:#8a6a2b;font-size:11px;line-height:1.5}.actions{display:flex;gap:10px;margin-top:16px}.edit,.delete,.retry,.publish{flex:1;padding:11px;text-align:center;border-radius:10px;font-size:13px}.edit{background:#e8f0e6;color:#243830}.retry{background:#fff4d8;color:#8a6a2b}.delete{background:#fff2ee;color:#a35d4e}.label{display:block;margin-top:4px;margin-bottom:7px;color:#52605a;font-size:12px}.input,.area{width:100%;box-sizing:border-box;border:1px solid #dfe7dd;border-radius:10px;background:#f7f9f4;color:#243830;padding:11px;font-size:14px}.area{height:130px}.empty{text-align:center;padding:90px 20px;color:#71807a;font-size:14px}.publish{display:block;margin:20px auto 0;max-width:180px;background:#173d35;color:#fff}
</style>