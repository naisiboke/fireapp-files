
<template>
 <view v-if="visible" class="qe-sheet-mask" :style="viewportStyle" @tap="requestClose" @touchmove.stop.prevent @wheel.stop.prevent>
  <view class="qe-sheet-panel" role="dialog" aria-modal="true" :aria-label="title" @tap.stop @touchmove.stop @wheel.stop>
   <view class="qe-sheet-handle"></view>
   <view class="qe-sheet-head"><text class="qe-sheet-title">{{title}}</text><button class="qe-sheet-close" aria-label="关闭输入面板" :disabled="busy" @tap="requestClose">×</button></view>
   <view class="qe-sheet-scroll"><view class="qe-sheet-content"><slot /></view></view>
   <view class="qe-sheet-footer"><slot name="footer" /></view>
  </view>
 </view>
</template>
<script>
import { registerFeedbackOverlay } from '@/utils/feedback.js'
export default{
 props:{visible:Boolean,ownerId:Number,title:String,busy:Boolean},
 emits:['close','ready'],
 data(){return{viewportStyle:{}}},
 watch:{visible:{immediate:true,handler(value){if(value)this.$nextTick(()=>this.open());else this.release()}},ownerId(){if(this.visible)this.open()}},
 beforeUnmount(){this.release()},
 methods:{
  requestClose(){if(!this.busy)this.$emit('close')},
  open(){
   this.release()
   if(!this.visible)return
   let info={};try{info=uni.getWindowInfo?uni.getWindowInfo():uni.getSystemInfoSync()}catch(ignore){}
   this.originalHeight=Number(info.windowHeight)||844
   this.unregister=registerFeedbackOverlay(this.ownerId,()=>this.requestClose(),!this.busy)
   this.keyboardListener=event=>{
    let current={};try{current=uni.getWindowInfo?uni.getWindowInfo():uni.getSystemInfoSync()}catch(ignore){}
    const resized=Math.max(0,this.originalHeight-(Number(current.windowHeight)||this.originalHeight))
    this.viewportStyle={bottom:Math.max(0,(Number(event.height)||0)-resized)+'px'}
   }
   // #ifndef H5
   if(uni.onKeyboardHeightChange)uni.onKeyboardHeightChange(this.keyboardListener)
   // #endif
   // #ifdef H5
   if(typeof document!=='undefined'){
    this.oldOverflow={body:document.body.style.overflow,html:document.documentElement.style.overflow,focus:document.activeElement}
    document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden'
    this.keyListener=event=>{
     if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.requestClose();return}
     if(event.key==='Tab'&&this.$el?.querySelectorAll){
      const nodes=[...this.$el.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(el=>!el.disabled&&el.offsetParent!==null)
      if(!nodes.length)return
      const index=nodes.indexOf(document.activeElement)
      event.preventDefault();nodes[(index+(event.shiftKey?-1:1)+nodes.length)%nodes.length].focus()
     }
    }
    document.addEventListener('keydown',this.keyListener,true)
    if(typeof window!=='undefined'&&window.visualViewport){
     this.resizeListener=()=>{this.viewportStyle={top:window.visualViewport.offsetTop+'px',height:window.visualViewport.height+'px',bottom:'auto'}}
     window.visualViewport.addEventListener('resize',this.resizeListener);window.visualViewport.addEventListener('scroll',this.resizeListener);this.resizeListener()
    }
   }
   // #endif
   this.readyTimer=setTimeout(()=>{if(this.visible)this.$emit('ready')},180)
  },
  release(){
   clearTimeout(this.readyTimer)
   if(this.unregister)this.unregister();this.unregister=null
   // #ifndef H5
   if(this.keyboardListener&&uni.offKeyboardHeightChange)uni.offKeyboardHeightChange(this.keyboardListener)
   // #endif
   // #ifdef H5
   if(typeof document!=='undefined'&&this.oldOverflow){
    document.body.style.overflow=this.oldOverflow.body;document.documentElement.style.overflow=this.oldOverflow.html
    if(this.oldOverflow.focus?.isConnected&&this.oldOverflow.focus.focus)this.oldOverflow.focus.focus({preventScroll:true})
    this.oldOverflow=null
   }
   if(typeof document!=='undefined'&&this.keyListener)document.removeEventListener('keydown',this.keyListener,true)
   if(typeof window!=='undefined'&&window.visualViewport&&this.resizeListener){window.visualViewport.removeEventListener('resize',this.resizeListener);window.visualViewport.removeEventListener('scroll',this.resizeListener)}
   // #endif
   this.keyListener=null;this.resizeListener=null;this.keyboardListener=null;this.viewportStyle={}
   try{if(uni.hideKeyboard)uni.hideKeyboard()}catch(ignore){}
  },
 },
}
</script>
<style>
.qe-sheet-mask{position:fixed;inset:0;z-index:200000;box-sizing:border-box;display:flex;align-items:flex-end;justify-content:center;padding-top:calc(var(--fire-status-top,env(safe-area-inset-top)) + 12px);background:rgba(30,42,34,.28);animation:qeMaskIn .18s ease;overscroll-behavior:contain}
.qe-sheet-panel{width:100%;max-width:520px;max-height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;background:#fafaf6;border:1px solid #dce1d8;border-radius:24px 24px 0 0;box-shadow:0 -8px 35px rgba(30,42,34,.07);animation:qeSheetIn .24s cubic-bezier(.22,1,.36,1)}
.qe-sheet-handle{width:32px;height:4px;background:#d4d9cf;border-radius:4px;margin:10px auto 0;flex-shrink:0}
.qe-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 8px 22px;gap:12px;flex-shrink:0}
.qe-sheet-title{font-size:19px;font-weight:600;color:#253b31;line-height:1.5}
.qe-sheet-close{width:44px!important;height:44px!important;min-width:44px!important;padding:0!important;background:transparent!important;color:#7c857a!important;font-size:28px!important;border:0!important}
.qe-sheet-scroll{flex:0 1 auto;min-height:0;max-height:60vh;overflow-y:auto;overscroll-behavior:contain;width:100%}
.qe-sheet-content{padding:0 22px 12px;box-sizing:border-box}
.qe-sheet-footer{padding:12px 22px calc(16px + env(safe-area-inset-bottom));flex-shrink:0;border-top:1px solid #e7e9e1;background:#fafaf6}
@keyframes qeSheetIn{from{opacity:.6;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}@keyframes qeMaskIn{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.qe-sheet-mask,.qe-sheet-panel{animation:none}}
</style>
