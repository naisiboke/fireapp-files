<template>
  <view class="share-page">
    <view class="share-head"><view class="close" @tap="close">×</view><text class="title">分享我的经历</text><view class="head-space"></view></view>
    <scroll-view class="share-scroll" scroll-y>
      <view class="share-content">
        <view class="block"><text class="label">选几个标签</text><view class="tags"><view v-for="tag in tags" :key="tag" class="tag" :class="{active:form.tags.includes(tag)}" @tap="toggleTag(tag)">{{tag}}</view></view></view>
        <view class="block"><text class="label">主题</text><input class="text-input" v-model="form.title" type="text" :disabled="false" :readonly="false" placeholder="用一句话概括你的经历" :adjust-position="true" :cursor-spacing="24" /></view>
        <view class="block"><text class="label">简介</text><textarea class="text-area" v-model="form.content" :disabled="false" :readonly="false" maxlength="300" placeholder="简单写下这段经历的背景和现在的状态……" :adjust-position="true" :cursor-spacing="24"></textarea><text class="counter">{{form.content.length}} / 300</text></view>
        <view class="block"><text class="label">时间点</text><view v-for="(row,i) in form.timeline" :key="i" class="timeline-row"><input class="year" v-model="row.year" type="number" placeholder="年份" :adjust-position="true" :cursor-spacing="24" /><input class="event" v-model="row.title" type="text" placeholder="事件描述" :adjust-position="true" :cursor-spacing="24" /><view class="remove" @tap="removeRow(i)">×</view></view><view class="add-row" @tap="addRow">＋ 添加时间点</view></view>
        <view v-if="ready" class="preview"><text class="label">预览</text><text class="preview-title">{{form.title}}</text><text class="preview-body">{{form.content}}</text></view>
      </view>
    </scroll-view>
    <view class="share-foot"><view class="actions"><button class="draft" type="button" @click="saveDraft">保存草稿</button><button class="publish" type="button" :disabled="!ready" @click="publish">发布</button></view><text class="hint">发布后会经过审核，通过后展示</text></view>
  </view>
</template>
<script setup>
import { computed, reactive } from 'vue'
import { COMMUNITY_POST_TAGS as tags } from '@/utils/community-data.js'
import { CS } from '@/utils/community-store.js'
const empty=()=>({tags:[],title:'',content:'',timeline:[{year:'',title:''}]})
const saved=CS.draft()
const form=reactive(saved?{...empty(),...saved,timeline:saved.timeline?.length?saved.timeline:[{year:'',title:''}]}:empty())
const validTimeline=computed(()=>form.timeline.filter(x=>String(x.year).trim()&&String(x.title).trim()))
const ready=computed(()=>form.tags.length>0&&form.title.trim()&&form.content.trim()&&validTimeline.value.length>0)
function leaveShare(){
 const pages=getCurrentPages()
 if(pages.length>1) uni.navigateBack({delta:1,fail:()=>uni.reLaunch({url:'/pages/community/index'})})
 else uni.reLaunch({url:'/pages/community/index'})
}
function close(){CS.saveDraft(form);leaveShare()}
function toggleTag(tag){const i=form.tags.indexOf(tag);if(i>=0)form.tags.splice(i,1);else form.tags.push(tag)}
function addRow(){form.timeline.push({year:'',title:''})}
function removeRow(i){if(form.timeline.length>1)form.timeline.splice(i,1)}
function saveDraft(){CS.saveDraft(form);uni.showToast({title:'草稿已保存',icon:'none'})}
function publish(){
 if(!ready.value){uni.showToast({title:'请填写完整内容',icon:'none'});return}
 const post={id:'ugc-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),category:form.tags.join(' · '),tags:[...form.tags],title:form.title.trim(),summary:form.content.trim().slice(0,100),content:form.content.trim(),timeline:validTimeline.value.map(x=>({year:x.year,desc:x.title})),displayName:'3263***',createdAt:Date.now(),status:'pending'}
 const list=CS.ugc();list.unshift(post)
 if(!CS.saveUGC(list)){uni.showToast({title:'保存失败',icon:'none'});return}
 CS.clearDraft();uni.showToast({title:'已提交，审核通过后展示',icon:'none'});setTimeout(()=>uni.reLaunch({url:'/pages/community/index'}),300)
}
</script>
<style lang="scss">
.share-page{position:fixed;inset:0;background:#fff;color:#243830;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);overflow:hidden}.share-head{height:64px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid #e8efe4}.close,.head-space{width:44px;height:44px;display:flex;align-items:center;justify-content:center}.close{font-size:30px;color:#52605a}.title{font-size:18px;font-weight:600}.share-scroll{flex:1;height:0;min-height:0;width:100%;pointer-events:auto}.share-content{padding:20px 20px 120px;box-sizing:border-box}.block{margin-bottom:24px}.label{display:block;margin-bottom:10px;color:#52605a;font-size:13px;font-weight:500}.tags{display:flex;flex-wrap:wrap;gap:8px}.tag{min-height:44px;padding:0 14px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#eff3eb;color:#52605a;font-size:13px}.tag.active{background:#e8efe4;border:1px solid #243830;color:#243830}.text-input,.text-area,.year,.event{position:relative;z-index:2;pointer-events:auto!important;background:#f7f9f4;border:1px solid #e5e9e0;border-radius:10px;color:#243830;box-sizing:border-box}.text-input{width:100%;height:52px;padding:0 12px;font-size:15px}.text-area{width:100%;min-height:140px;padding:12px;font-size:14px;line-height:1.6}.text-input:focus,.text-area:focus,.year:focus,.event:focus{border-color:#4f8068;outline:none;box-shadow:0 0 0 2px rgba(79,128,104,.12)}.counter{display:block;text-align:right;margin-top:5px;color:#66736a;font-size:11px}.timeline-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}.year{width:78px;height:44px;padding:0 8px}.event{flex:1;height:44px;padding:0 8px}.remove{width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:#a35d4e;font-size:22px}.add-row{min-height:44px;padding:0 14px;display:inline-flex;align-items:center;border:1px dashed #b8c6b3;border-radius:10px;color:#243830;font-size:13px}.preview{padding-top:18px;border-top:1px solid #e8efe4}.preview-title{display:block;font-size:16px;font-weight:600;margin-bottom:8px}.preview-body{display:block;color:#426052;font-size:13px;line-height:1.75;white-space:pre-wrap}.share-foot{position:relative;z-index:20;flex-shrink:0;padding:12px 20px calc(12px + env(safe-area-inset-bottom));border-top:1px solid #e8efe4;background:#fff;pointer-events:auto}.actions{display:flex;gap:10px}.actions button{flex:1;min-height:48px;border-radius:10px;font-size:14px}.draft{background:#f7f9f4;color:#243830;border:1px solid #dce4d7}.publish{background:#243830;color:#fff}.publish[disabled]{opacity:.4}.hint{display:block;text-align:center;margin-top:8px;color:#66736a;font-size:11px}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>