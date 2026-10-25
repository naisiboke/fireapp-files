<template>
  <view class="manage-page">
    <view class="head"><view class="back" @tap="back">‹</view><text class="title">我的社区设置</text><view class="close" @tap="close">×</view></view>
    <view v-if="posts.length" class="list">
      <view v-for="post in posts" :key="post.id" class="card">
        <view v-if="editingId !== post.id">
          <view class="card-head"><text class="tag">{{ post.category || '我的经历' }}</text><text class="date">{{ formatDate(post.createdAt) }}</text></view>
          <text class="post-title">{{ post.title }}</text>
          <text class="post-content">{{ post.content || post.summary }}</text>
          <view class="actions"><view class="edit" @tap="startEdit(post)">编辑</view><view class="delete" @tap="removePost(post)">删除</view></view>
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
const posts=ref([]), editingId=ref(''), draft=ref({title:'',content:''})
function load(){posts.value=CS.ugc().filter(x=>x.displayName==='3263***').sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0))}
function back(){uni.navigateBack()}
function close(){uni.switchTab({url:'/pages/profile/index'})}
function openShare(){uni.navigateTo({url:'/pages/community/share?from=community'})}
function formatDate(v){return v?new Date(v).toLocaleDateString('zh-CN'):'刚刚'}
function startEdit(post){editingId.value=post.id;draft.value={title:post.title||'',content:post.content||post.summary||''}}
function cancelEdit(){editingId.value=''}
function saveEdit(post){
 const title=String(draft.value.title||'').trim(),content=String(draft.value.content||'').trim()
 if(!title||!content)return uni.showToast({title:'请填写完整内容',icon:'none'})
 const list=CS.ugc(),target=list.find(x=>x.id===post.id)
 if(!target)return
 target.title=title;target.content=content;target.summary=content.slice(0,100);target.updatedAt=Date.now()
 if(!CS.saveUGC(list))return uni.showToast({title:'保存失败',icon:'none'})
 editingId.value='';load();uni.showToast({title:'已保存',icon:'none'})
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
.manage-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 18px calc(32px + env(safe-area-inset-bottom));background:#f3f6f1;color:#243830;box-sizing:border-box}.head{position:fixed;z-index:5;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 18px 0;display:flex;align-items:center;justify-content:space-between;background:#f3f6f1;border-bottom:1px solid #dfe7dd;box-sizing:border-box}.back,.space,.close{width:40px;height:40px;display:flex;align-items:center;justify-content:center}.back{font-size:32px;color:#173d35}.title{font-size:19px;font-weight:700}.list{display:flex;flex-direction:column;gap:12px}.card{padding:16px;border-radius:16px;background:#fff;border:1px solid #e0e9df;box-shadow:0 4px 14px rgba(36,56,48,.06)}.card-head{display:flex;justify-content:space-between}.tag{padding:4px 8px;border-radius:7px;background:#e8f0e6;color:#527059;font-size:12px}.date{color:#89968b;font-size:11px}.post-title{display:block;margin-top:13px;font-size:18px;font-weight:700}.post-content{display:block;margin-top:8px;color:#52605a;font-size:13px;line-height:1.7;white-space:pre-wrap}.actions{display:flex;gap:10px;margin-top:16px}.edit,.delete,.publish{flex:1;padding:11px;text-align:center;border-radius:10px;font-size:13px}.edit{background:#e8f0e6;color:#243830}.delete{background:#fff2ee;color:#a35d4e}.label{display:block;margin-top:4px;margin-bottom:7px;color:#52605a;font-size:12px}.input,.area{width:100%;box-sizing:border-box;border:1px solid #dfe7dd;border-radius:10px;background:#f7f9f4;color:#243830;padding:11px;font-size:14px}.area{height:130px}.empty{text-align:center;padding:90px 20px;color:#71807a;font-size:14px}.publish{display:block;margin:20px auto 0;max-width:180px;background:#173d35;color:#fff}
</style>