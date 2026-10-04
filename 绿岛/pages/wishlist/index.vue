<template>
  <view class="wishlist-page">
    <view class="head"><view class="back" @tap="back">‹</view><view><text class="title">极简拔草</text><text class="sub">记下想要的，留点时间再决定。</text></view></view>
    <view class="save-banner"><view><text class="save-label">拔草已省下</text><text class="save-amount">¥ {{ money(saved) }}</text></view><text class="tag">为自己留白</text></view>
    <view class="tabs"><view v-for="t in tabs" :key="t.id" class="tab" :class="{active: filter===t.id}" @tap="filter=t.id"><text>{{ t.name }}</text></view></view>
    <view v-if="filtered.length" class="list"><view v-for="item in filtered" :key="item.id" class="item" @tap="open(item)">
      <view class="item-icon">{{ categoryIcon(item.category) }}</view><view class="item-copy"><text class="item-name">{{ item.name }}</text><text class="item-price">¥ {{ money(item.amount) }}</text><text class="item-sub">{{ statusText(item) }}</text></view><text class="arrow">›</text>
    </view></view>
    <view v-else class="empty"><text class="empty-icon">＋</text><text class="empty-title">{{ filter==='active'?'给心动留一点时间':'这里还没有记录' }}</text><text class="empty-sub">添加一个想买的东西，设置 3、7 或 30 天冷静期。</text></view>
    <view v-if="!showAdd" class="add" @tap="openAdd"><text>＋ 添加消费计划</text></view>
    <view v-if="showAdd" class="mask" :style="panelStyle">
      <view class="sheet">
        <view class="sheet-head"><text class="sheet-title">添加消费计划</text><button class="close" type="button" @tap="closeAdd" @click="closeAdd" aria-label="关闭">×</button></view>
        <scroll-view class="sheet-scroll" scroll-y :scroll-into-view="focusedField">
          <view class="sheet-content">
            <text class="field-label">名称</text>
            <input id="plan-name" v-model="form.name" class="input" type="text" placeholder="请输入消费计划名称" :disabled="false" :readonly="false" :adjust-position="true" :cursor-spacing="24" @input="onNameInput" @focus="focusedField='plan-name'" />
            <text class="field-label">预计金额</text>
            <view id="plan-amount" class="money-input"><text>¥</text><input v-model="form.amount" type="digit" :disabled="false" :readonly="false" placeholder="预计金额" :adjust-position="true" :cursor-spacing="24" @input="form.amount=$event.detail.value" @focus="focusedField='plan-amount'" /></view>
            <text class="field-label">分类</text>
            <view class="category-row"><view v-for="cat in categories" :key="cat.id" class="choice" :class="{active:form.category===cat.id}" @tap="form.category=cat.id">{{ cat.name }}</view></view>
            <text class="field-label">冷静期</text>
            <view class="choice-row"><view v-for="d in [3,7,30]" :key="d" class="choice" :class="{active:form.days===d}" @tap="form.days=d">{{ d }} 天</view></view>
          </view>
        </scroll-view>
        <view class="sheet-footer"><text v-if="formError" class="form-error">{{ formError }}</text><button class="primary" type="button" @click="handleSubmit">完成</button></view>
      </view>
    </view>
    <BottomTabs v-if="!showAdd" current="tools" />
  </view>
</template>
<script>
import BottomTabs from '@/components/BottomTabs.vue'
import { state, persist, WISHLIST_KEY } from '@/store/index.js'
import { WishlistSaved } from '@/utils/engine.js'
export default {
  components:{ BottomTabs },
  data(){return{state,filter:'active',showAdd:false,form:{name:'',amount:'',category:'other',days:7},formError:'',submitLock:false,focusedField:'',keyboardHeight:0,viewportHeight:0,viewportTop:0,categories:[{id:'shopping',name:'购物'},{id:'food',name:'饮食'},{id:'travel',name:'旅行'},{id:'life',name:'生活'},{id:'other',name:'其他'}],tabs:[{id:'active',name:'进行中'},{id:'abandoned',name:'已放弃'},{id:'bought',name:'已购买'}]}},
  onLoad(){
    this.keyboardListener = event => { this.keyboardHeight = Math.max(0, Number(event.height) || 0) }
    // #ifndef H5
    if (uni.onKeyboardHeightChange) uni.onKeyboardHeightChange(this.keyboardListener)
    // #endif
    // #ifdef H5
    if (typeof window !== 'undefined' && window.visualViewport) {
      this.viewportListener = () => {
        this.viewportHeight = window.visualViewport.height
        this.viewportTop = window.visualViewport.offsetTop
      }
      window.visualViewport.addEventListener('resize', this.viewportListener)
      window.visualViewport.addEventListener('scroll', this.viewportListener)
      this.viewportListener()
    }
    // #endif
  },
  onUnload(){
    // #ifndef H5
    if (uni.offKeyboardHeightChange) uni.offKeyboardHeightChange(this.keyboardListener)
    // #endif
    // #ifdef H5
    if (typeof window !== 'undefined' && window.visualViewport && this.viewportListener) {
      window.visualViewport.removeEventListener('resize', this.viewportListener)
      window.visualViewport.removeEventListener('scroll', this.viewportListener)
    }
    // #endif
  },
  onShow(){
    const saved = uni.getStorageSync(WISHLIST_KEY)
    if (Array.isArray(saved)) state.items = saved
  },
  computed:{
    panelStyle(){
      if (this.viewportHeight) return { top:this.viewportTop+'px', height:this.viewportHeight+'px', bottom:'auto' }
      return { bottom:this.keyboardHeight+'px' }
    },
    items(){return Array.isArray(state.items)?state.items:[]},
    filtered(){return this.items.filter(x=>x.status===this.filter)},
    saved(){try{return WishlistSaved(state)}catch(e){return this.items.filter(x=>x.status==='abandoned').reduce((a,x)=>a+Number(x.amount||0),0)}},
  },
  methods:{
    openAdd(){ uni.navigateTo({ url: '/pages/wishlist/add' }) },
    closeAdd(){ this.showAdd=false; this.focusedField=''; this.formError=''; uni.hideKeyboard() },
    handleSubmit(){
      if (this.submitLock) return
      const name = String(this.form.name || '').trim()
      const amount = Number(this.form.amount)
      if (!name) { this.formError = '请填写消费计划名称'; uni.showToast({title:'请填写消费计划名称',icon:'none'}); return }
      if (!Number.isFinite(amount) || amount <= 0) { this.formError = '请填写正确的预计金额'; uni.showToast({title:'请填写正确的预计金额',icon:'none'}); return }
      this.submitLock = true
      this.formError = ''
      this.addItem()
      setTimeout(() => { this.submitLock = false }, 350)
    },
    money(v){return Number(v||0).toLocaleString('zh-CN',{maximumFractionDigits:2})},
    back(){uni.reLaunch({url:'/pages/tools/index'})},
    categoryIcon(c){return ({shopping:'购',food:'食',travel:'旅',life:'居',other:'＋'})[c]||'＋'},
    statusText(x){if(x.status==='active'){const left=Math.max(0,Math.ceil((Number(x.created||Date.now())+Number(x.days||7)*86400000-Date.now())/86400000));return left?'冷静期剩余 '+left+' 天':'冷静期已结束'}return x.status==='abandoned'?'已放弃购买 · 已计入省下金额':'已购买 · 未计入省下金额'},
    addItem(){const name=String(this.form.name||'').trim(),amount=Number(this.form.amount);state.items.push({id:'item-'+Date.now(),name,amount,category:this.form.category,days:this.form.days,created:Date.now(),status:'active',note:''});persist();this.form={name:'',amount:'',category:'other',days:7};this.closeAdd();uni.showToast({title:'消费计划已添加',icon:'success'})},
    open(item){
      if (item.status === 'active') {
        uni.navigateTo({ url: '/pages/wishlist/detail?id=' + encodeURIComponent(item.id) })
        return
      }
      const actions = item.status === 'active'
        ? ['我坚持不住了，已购买','提前结束，省下这笔钱','删除']
        : ['重新加入冷静期','删除']
      uni.showActionSheet({
        itemList: actions,
        success: ({ tapIndex }) => {
          if (item.status === 'active') {
            if (tapIndex === 0) this.setStatus(item, 'bought')
            else if (tapIndex === 1) this.setStatus(item, 'abandoned')
            else if (tapIndex === 2) this.removeItem(item)
          } else if (tapIndex === 0) this.setStatus(item, 'active')
          else if (tapIndex === 1) this.removeItem(item)
        }
      })
    },
    setStatus(item, status){
      const target = state.items.find(x => x.id === item.id)
      if (target) { target.status = status; target.updated = Date.now(); if (status === 'active') target.created = Date.now(); persist() }
    },
    removeItem(item){
      const index = state.items.findIndex(x => x.id === item.id)
      if (index >= 0) { state.items.splice(index, 1); persist(); uni.showToast({title:'已删除',icon:'none'}) }
    },
  },
}
</script>
<style>
.wishlist-page{min-height:100vh;padding:calc(60px + env(safe-area-inset-top)) 24px calc(88px + env(safe-area-inset-bottom));background:#f8f9f5;box-sizing:border-box;color:#173d35}.head{display:flex;gap:14px;align-items:flex-start}.back{font-size:32px;line-height:24px}.title{display:block;font-size:26px;font-weight:700}.sub{display:block;margin-top:7px;color:#737e76;font-size:13px}.save-banner{display:flex;justify-content:space-between;align-items:center;margin-top:28px;padding:20px;border-radius:20px;background:#e5eee4}.save-label{display:block;color:#737e76;font-size:13px}.save-amount{display:block;margin-top:6px;font-size:29px;font-weight:600}.tag{padding:8px 12px;border-radius:18px;background:#fff;color:#447e70;font-size:12px}.tabs{display:flex;gap:4px;margin:22px 0 16px;padding:4px;border-radius:20px;background:#edf0e9}.tab{flex:1;padding:12px;text-align:center;border-radius:16px;color:#737e76;font-size:13px}.tab.active{background:#fff;color:#173d35;font-weight:600;box-shadow:0 2px 8px #173d3508}.item{display:flex;align-items:center;gap:13px;padding:18px 0;border-bottom:1px solid #e1e7de}.item-icon{width:42px;height:42px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:#e5eee4;color:#447e70}.item-copy{flex:1}.item-name{display:block;font-size:15px}.item-price{display:block;margin-top:5px;font-size:16px}.item-sub{display:block;margin-top:4px;color:#737e76;font-size:12px}.arrow{font-size:24px;color:#91a392}.empty{text-align:center;padding:70px 15px}.empty-icon{font-size:40px;color:#447e70}.empty-title{display:block;margin-top:16px;font-size:17px;font-weight:600}.empty-sub{display:block;margin-top:9px;color:#737e76;font-size:13px;line-height:1.7}.add{position:fixed;right:24px;bottom:calc(92px + env(safe-area-inset-bottom));padding:14px 18px;border-radius:24px;background:#173d35;color:#fff;font-size:13px;z-index:100}.mask{position:fixed;inset:0;background:#173d3555;z-index:100000;display:flex;align-items:stretch;padding-top:calc(12px + env(safe-area-inset-top));box-sizing:border-box;pointer-events:auto}.sheet{width:100%;height:100%;min-height:0;display:flex;flex-direction:column;border-radius:24px 24px 0 0;background:#f8f9f5;box-sizing:border-box;overflow:hidden;pointer-events:auto}.sheet-scroll{position:relative;z-index:1;flex:1;height:0;min-height:0;width:100%;pointer-events:auto}.sheet-content{padding:0 24px calc(88px + env(safe-area-inset-bottom));box-sizing:border-box}.form-error{display:block;margin-bottom:8px;color:#a35d4e;font-size:13px;line-height:1.4}.sheet-footer{position:relative;flex-shrink:0;z-index:100001;padding:12px 24px calc(16px + env(safe-area-inset-bottom));background:#f8f9f5;border-top:1px solid #e1e7de;pointer-events:auto}.field-label{display:block;margin-top:20px;color:#737e76;font-size:13px}.category-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.category-row .choice{flex:0 0 auto;min-width:44px;box-sizing:border-box}.sheet-head{display:flex;align-items:center;justify-content:space-between;flex-shrink:0;padding:16px 24px}.sheet-title{font-size:20px;font-weight:600}.close{margin:0;padding:0;min-width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:transparent;border:0;font-size:25px;color:#173d35}.close:after,.primary:after{border:0}.input,.money-input{position:relative;z-index:2;pointer-events:auto!important;width:100%;margin-top:18px;padding:14px;border:1px solid #e1e7de;border-radius:12px;background:#fff;box-sizing:border-box}.money-input{display:flex;gap:8px}.money-input input{flex:1}.choice-row{display:flex;gap:8px;margin-top:16px}.choice{flex:1;padding:12px;text-align:center;border-radius:10px;background:#edf0e9;font-size:13px}.choice.active{background:#e5eee4;color:#173d35;font-weight:600}.primary{position:relative;z-index:100002;pointer-events:auto!important;touch-action:manipulation;margin:0;min-height:48px;width:100%;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;border-radius:12px;background:#173d35;color:#fff;font-size:16px;line-height:1.5;box-sizing:border-box}
</style>