<template>
  <view class="share-page fire-page-community-share" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="share-head"><view class="back" data-fire-press="true" @tap="back" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">‹</view><text class="title">{{ editId ? "编辑我的经历" : "分享我的经历" }}</text><view class="close" data-fire-press="true" @tap="close" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">×</view></view>
    <scroll-view class="share-scroll" scroll-y>
      <view class="share-content">
        <view class="block"><text class="label">选几个标签</text><view class="tags"><view v-for="tag in tags" :key="tag" class="tag" data-fire-press="true" :class="{active:form.tags.includes(tag)}" @tap="toggleTag(tag)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">{{tag}}</view></view></view>
        <view class="block"><text class="label">当前状态</text><view class="status-options"><view class="status-option" data-fire-press="true" :class="{active:form.journey==='doing'}" @tap="form.journey='doing'" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">在路上</view><view class="status-option" data-fire-press="true" :class="{active:form.journey==='settled'}" @tap="form.journey='settled'" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">已上岸</view></view></view>
        <view class="block"><text class="label">主题</text><input class="text-input" v-model="form.title" type="text" :disabled="false" :readonly="false" placeholder="用一句话概括你的经历" :adjust-position="true" :cursor-spacing="24" /></view>
        <view class="block"><text class="label">简介</text><textarea class="text-area" v-model="form.content" :disabled="false" :readonly="false" maxlength="300" placeholder="简单写下这段经历的背景和现在的状态……" :adjust-position="true" :cursor-spacing="24"></textarea><text class="counter">{{form.content.length}} / 300</text></view>
        <view class="block"><text class="label">时间点</text><view v-for="(row,i) in form.timeline" :key="i" class="timeline-row"><input class="year" v-model="row.year" type="number" placeholder="年份" :adjust-position="true" :cursor-spacing="24" /><input class="event" v-model="row.title" type="text" placeholder="事件描述" :adjust-position="true" :cursor-spacing="24" /><view class="remove" data-fire-press="true" @tap="removeRow(i)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">×</view></view><view class="add-row" data-fire-press="true" @tap="addRow" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">＋ 添加时间点</view></view>
        <view v-if="ready" class="preview"><text class="label">预览</text><text class="preview-title">{{form.title}}</text><text class="preview-body">{{form.content}}</text></view>
      </view>
    </scroll-view>
    <view class="share-foot"><view class="actions"><button class="draft" data-fire-press="true" type="button" @click="saveDraft" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">保存草稿</button><button class="publish" data-fire-press="true" type="button" :disabled="!ready || publishing" @click="publish" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">{{ publishing ? "审核中…" : "提交审核" }}</button></view><text class="hint">提交后会由 AI 审核，通过后才会展示在社区</text></view>
  </view>
</template>
<script setup>
import { useSessionDraft } from '@/utils/session-drafts.js'
import { pageLayoutStyle } from '@/utils/page-layout.js'
import AppFeedback from '@/components/AppFeedback.vue'
import { useFeedbackPage } from '@/utils/feedback-page.js'
import { showNotice } from '@/utils/feedback.js'
const feedbackOwnerId = useFeedbackPage()
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { COMMUNITY_POST_TAGS as tags } from '@/utils/community-data.js'
import { CS } from '@/utils/community-store.js'
const empty=()=>({tags:[],journey:'doing',title:'',content:'',timeline:[{year:'',title:''}]})
const saved=CS.draft()
const form=reactive(saved?{...empty(),...saved,timeline:saved.timeline?.length?saved.timeline:[{year:'',title:''}]}:empty())
const validTimeline=computed(()=>form.timeline.filter(x=>String(x.year).trim()&&String(x.title).trim()))
const ready=computed(()=>form.tags.length>0&&form.title.trim()&&form.content.trim()&&validTimeline.value.length>0)
const publishing=ref(false),editId=ref('')
onLoad(async (options) => {
 const id=String(options&&options.editId||'')
 if(!id)return
 editId.value=id
 let post=CS.ugc().find(x=>String(x.id)===id)
 if(!post){await CS.hydrate();post=CS.ugc().find(x=>String(x.id)===id)}
 if(shareDraft.restored())return
 if(!post){showNotice({title:'未能恢复这段经历，请联网后重试',icon:'none'});return}
 form.tags=[...(post.tags||String(post.category||'').split(' · ').filter(Boolean))]
 form.journey=post.journey||'doing'
 form.title=post.title||''
 form.content=post.content||post.summary||''
 form.timeline=(post.timeline||[]).map(row=>({year:row.year||'',title:row.title||row.desc||''}))
 if(!form.timeline.length)form.timeline=[{year:'',title:''}]
})
function leaveShare(){
 const pages=getCurrentPages()
 if(pages.length>1) uni.navigateBack({delta:1,fail:()=>uni.reLaunch({url:'/pages/community/index?tab=doing'})})
 else uni.reLaunch({url:'/pages/community/index'})
}
function back(){CS.saveDraft(form);leaveShare()}
function close(){CS.saveDraft(form);uni.switchTab({url:'/pages/community/index'})}
function toggleTag(tag){const i=form.tags.indexOf(tag);if(i>=0)form.tags.splice(i,1);else form.tags.push(tag)}
function addRow(){form.timeline.push({year:'',title:''})}
function removeRow(i){if(form.timeline.length>1)form.timeline.splice(i,1)}
function saveDraft(){const saved=CS.saveDraft(form);showNotice({title:saved?'草稿已保留在本机，联网后同步':'保存失败，请重试',icon:'none'})}
async function publish(){
 if(!ready.value||publishing.value)return
 publishing.value=true
 const existing=editId.value?CS.ugc().find(item=>String(item.id)===editId.value):null
 if(editId.value&&!existing){publishing.value=false;showNotice({title:'原经历尚未恢复，请联网后重试',icon:'none'});return}
 const post={
  ...existing,id:existing?.id||'ugc-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
  category:form.tags.join(' · '),tags:[...form.tags],journey:form.journey||'doing',
  title:form.title.trim(),content:form.content.trim(),
  timeline:validTimeline.value.map(row=>({year:row.year,desc:row.title})),
  displayName:existing?.displayName||'社区用户',createdAt:existing?.createdAt||Date.now(),
 }
 CS.saveDraft(form)
 try{
  const saved=await CS.submitPost(post)
  if(saved.status==='approved'){
   CS.clearDraft()
   shareDraft.clear()
   showNotice({title:'云端审核通过，经历已发布',icon:'none'})
   setTimeout(()=>uni.reLaunch({url:'/pages/community/index?tab=doing'}),500)
  }else{
   showNotice({title:saved.reviewReason||'内容已保存，请到我的社区设置查看状态',icon:'none',duration:3500})
   setTimeout(()=>uni.navigateTo({url:'/pages/community/manage'}),500)
  }
 }catch(error){
  showNotice({title:error.message||'尚未确认云端保存，内容已保留在本机，请重试',icon:'none',duration:3500})
 }finally{publishing.value=false}
}

const shareDraft=useSessionDraft(()=>({form:{...form},editId:editId.value}),draft=>{if(draft?.form)Object.assign(form,draft.form);if(typeof draft?.editId==='string')editId.value=draft.editId})
</script>
<style lang="scss">
.share-page{position:fixed;inset:0;background:#fff;color:#243830;display:flex;flex-direction:column;padding-top:var(--fire-status-top, env(safe-area-inset-top));padding-bottom:env(safe-area-inset-bottom);overflow:hidden}.share-head{height:64px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #e8efe4}.back,.close{width:44px;height:44px;display:flex;align-items:center;justify-content:center}.back{font-size:32px;color:#52605a}.close{font-size:30px;color:#52605a}.title{font-size:18px;font-weight:600}.share-scroll{flex:1;height:0;min-height:0;width:100%;pointer-events:auto}.share-content{padding:20px 20px 120px;box-sizing:border-box}.block{margin-bottom:24px}.label{display:block;margin-bottom:10px;color:#52605a;font-size:13px;font-weight:500}.tags{display:flex;flex-wrap:wrap;gap:8px}.tag{min-height:44px;padding:0 14px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#eff3eb;color:#52605a;font-size:13px}.tag.active{background:#e8efe4;border:1px solid #243830;color:#243830}.text-input,.text-area,.year,.event{position:relative;z-index:2;pointer-events:auto!important;background:#f7f9f4;border:1px solid #e5e9e0;border-radius:10px;color:#243830;box-sizing:border-box}.text-input{width:100%;height:52px;padding:0 12px;font-size:15px}.text-area{width:100%;min-height:140px;padding:12px;font-size:14px;line-height:1.6}.text-input:focus,.text-area:focus,.year:focus,.event:focus{border-color:#4f8068;outline:none;box-shadow:0 0 0 2px rgba(79,128,104,.12)}.counter{display:block;text-align:right;margin-top:5px;color:#66736a;font-size:11px}.timeline-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}.year{width:78px;height:44px;padding:0 8px}.event{flex:1;height:44px;padding:0 8px}.remove{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#a35d4e;font-size:22px}.add-row{min-height:44px;padding:0 14px;display:inline-flex;align-items:center;border:1px dashed #b8c6b3;border-radius:10px;color:#243830;font-size:13px}.preview{padding-top:18px;border-top:1px solid #e8efe4}.preview-title{display:block;font-size:16px;font-weight:600;margin-bottom:8px}.preview-body{display:block;color:#426052;font-size:13px;line-height:1.75;white-space:pre-wrap}.share-foot{position:relative;z-index:20;flex-shrink:0;padding:12px 20px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #e8efe4;background:#fff;pointer-events:auto}.actions{display:flex;gap:10px}.actions button{flex:1;min-height:48px;border-radius:10px;font-size:14px}.draft{background:#f7f9f4;color:#243830;border:1px solid #dce4d7}.publish{background:#243830;color:#fff}.publish[disabled]{opacity:.4}.hint{display:block;text-align:center;margin-top:8px;color:#66736a;font-size:11px}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

.status-options{display:flex;gap:10px}.status-option{flex:1;height:44px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#eff3eb;color:#52605a;font-size:14px}.status-option.active{background:#e8efe4;border:1px solid #243830;color:#243830;font-weight:600}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-community-share{padding-top:var(--fire-page-top)}
</style>