<template>
  <view v-if="shown && layout" class="fire-spotlight" :class="{ 'fire-spotlight-closing': closing }" :style="rootStyle" role="dialog" aria-modal="true" aria-labelledby="fire-spotlight-title" aria-describedby="fire-spotlight-description" @tap.stop @touchmove.stop.prevent @wheel.stop.prevent>
    <view class="fire-spotlight-hole" :style="holeStyle"><view class="fire-spotlight-outline"></view></view>
    <button class="fire-spotlight-skip" :style="{top:layout.skipTop+'px'}" @tap.stop="$emit('skip')">跳过</button>
    <view class="fire-spotlight-anchor" :style="bubbleStyle">
      <view :key="step" class="fire-spotlight-tooltip" :class="layout.bubble.placement" :style="{maxHeight:layout.bubble.maxHeight+'px'}">
        <view class="fire-spotlight-arrow" :style="{left:(layout.bubble.arrow-6)+'px'}"></view>
        <view class="fire-spotlight-copy" @touchmove.stop @wheel.stop aria-live="polite" aria-atomic="true">
          <text id="fire-spotlight-title" class="fire-spotlight-title">{{ title }}</text>
          <text id="fire-spotlight-description" class="fire-spotlight-description">{{ description }}</text>
        </view>
        <view class="fire-spotlight-footer">
          <text class="fire-spotlight-counter" :aria-label="'第'+(step+1)+'步，共'+total+'步'">{{ step+1 }}/{{ total }}</text>
          <button class="fire-spotlight-next" :disabled="busy || closing" :aria-disabled="busy || closing" @tap.stop="advance">{{ step===total-1 ? '知道了' : '下一步' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>
<script>
import { spotlightLayout } from '@/utils/spotlight-guide.js'
export default {
  name:'SpotlightGuide',
  props:{visible:Boolean,rect:Object,viewport:{type:Object,default:()=>({width:390,height:844,top:0,bottom:0})},step:{type:Number,default:0},total:{type:Number,default:3},title:String,description:String,busy:Boolean},
  emits:['next','skip','closed'],
  data(){return{shown:false,closing:false,bubbleHeight:158,exitTimer:null}},
  computed:{
    layout(){return this.rect?spotlightLayout(this.rect,{...this.viewport,preferBelow:this.step===1},this.bubbleHeight,this.step===0):null},
    rootStyle(){return{height:this.viewport.height+'px'}},
    holeStyle(){const r=this.layout.hole;return{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',borderRadius:r.radius+'px'}},
    bubbleStyle(){const b=this.layout.bubble;return{left:b.left+'px',top:b.top+'px',width:b.width+'px',maxHeight:b.maxHeight+'px'}},
  },
  watch:{
    visible:{immediate:true,handler(){this.syncVisibility()}},
    rect(){if(this.visible)this.syncVisibility();else if(!this.rect)this.hideImmediately()},
    step(){this.$nextTick(()=>this.measureBubble())},
    'viewport.width'(){this.$nextTick(()=>this.measureBubble())},
    'viewport.height'(){this.$nextTick(()=>this.measureBubble())},
  },
  mounted(){this.syncVisibility()},
  beforeUnmount(){clearTimeout(this.exitTimer);this.releaseEnvironment()},
  methods:{
    advance(){if(!this.busy&&!this.closing)this.$emit('next')},
    syncVisibility(){
      clearTimeout(this.exitTimer)
      if(this.visible&&this.rect){
        const fresh=!this.shown
        this.shown=true;this.closing=false
        this.$nextTick(()=>{if(!this.visible)return;if(fresh)this.captureEnvironment();this.measureBubble()})
      }else if(this.shown&&this.rect){
        this.closing=true
        this.exitTimer=setTimeout(()=>{this.shown=false;this.closing=false;this.releaseEnvironment();this.$emit('closed')},220)
      }else this.hideImmediately()
    },
    hideImmediately(){
      clearTimeout(this.exitTimer);this.shown=false;this.closing=false;this.releaseEnvironment()
    },
    measureBubble(){
      if(!this.shown||!this.visible)return
      try{uni.createSelectorQuery().in(this).select('.fire-spotlight-anchor').boundingClientRect(rect=>{
        if(this.shown&&rect&&rect.height>0&&Math.abs(rect.height-this.bubbleHeight)>1)this.bubbleHeight=rect.height
      }).exec()}catch(ignore){}
    },
    captureEnvironment(){
      // #ifdef H5
      if(typeof document!=='undefined'&&!this.environment){
        this.environment={body:document.body.style.overflow,html:document.documentElement.style.overflow,focus:document.activeElement}
        document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden'
        this.keyHandler=event=>{
          if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.$emit('skip');return}
          if(event.key!=='Tab'||!this.$el||!this.$el.querySelectorAll)return
          const nodes=Array.from(this.$el.querySelectorAll('.fire-spotlight-skip,.fire-spotlight-next')).filter(node=>node.getAttribute('aria-disabled')!=='true'&&!node.hasAttribute('disabled'))
          if(!nodes.length)return
          const current=nodes.indexOf(document.activeElement)
          event.preventDefault();nodes[(current+(event.shiftKey?-1:1)+nodes.length)%nodes.length].focus()
        }
        document.addEventListener('keydown',this.keyHandler,true)
        const first=this.$el&&this.$el.querySelector&&this.$el.querySelector('.fire-spotlight-skip')
        if(first&&first.focus)first.focus({preventScroll:true})
      }
      // #endif
      // #ifdef APP-PLUS
      try{if(typeof plus!=='undefined'&&plus.navigator&&typeof plus.navigator.getStatusBarStyle==='function'){
        this.previousStatusBar=plus.navigator.getStatusBarStyle()
        if(['light','dark'].includes(this.previousStatusBar))plus.navigator.setStatusBarStyle('light')
      }}catch(ignore){}
      // #endif
    },
    releaseEnvironment(){
      // #ifdef H5
      if(typeof document!=='undefined'&&this.environment){
        const before=this.environment;this.environment=null
        document.body.style.overflow=before.body;document.documentElement.style.overflow=before.html
        if(this.keyHandler)document.removeEventListener('keydown',this.keyHandler,true)
        this.keyHandler=null
        if(before.focus&&document.contains(before.focus)&&typeof before.focus.focus==='function')before.focus.focus({preventScroll:true})
      }
      // #endif
      // #ifdef APP-PLUS
      try{if(this.previousStatusBar&&typeof plus!=='undefined'){plus.navigator.setStatusBarStyle(this.previousStatusBar);this.previousStatusBar=null}}catch(ignore){}
      // #endif
    },
  },
}
</script>
<style>
.fire-spotlight{position:fixed!important;inset:0!important;bottom:auto!important;z-index:300000!important;overflow:hidden;touch-action:pan-y;overscroll-behavior:contain;animation:fireSpotlightEnter .18s ease-out;isolation:isolate}
.fire-spotlight-closing{animation:none;opacity:0;transition:opacity .22s ease}
.fire-spotlight-hole{position:absolute;box-sizing:border-box;pointer-events:none;box-shadow:0 0 0 200vmax rgba(0,0,0,.7);transition:left .4s cubic-bezier(.22,1,.36,1),top .4s cubic-bezier(.22,1,.36,1),width .4s cubic-bezier(.22,1,.36,1),height .4s cubic-bezier(.22,1,.36,1),border-radius .4s cubic-bezier(.22,1,.36,1)}
.fire-spotlight-outline{position:absolute;inset:0;border-radius:inherit;border:1.5px solid #fff;box-sizing:border-box;animation:fireSpotlightBreathe 2s ease-in-out infinite;box-shadow:0 0 12px rgba(255,255,255,.12)}
.fire-spotlight-skip{position:absolute!important;right:16px!important;min-width:56px!important;min-height:40px!important;height:40px!important;padding:0 12px!important;border:1px solid rgba(255,255,255,.38)!important;border-radius:20px!important;background:rgba(0,0,0,.12)!important;color:#fff!important;font-size:13px!important;line-height:1!important;box-shadow:none!important}
.fire-spotlight-anchor{position:absolute;transition:left .4s cubic-bezier(.22,1,.36,1),top .4s cubic-bezier(.22,1,.36,1);box-sizing:border-box}
.fire-spotlight-tooltip{position:relative;display:flex;flex-direction:column;padding:18px;box-sizing:border-box;border-radius:18px;background:#fff;color:#253b31;box-shadow:0 16px 44px rgba(0,0,0,.18);animation:fireSpotlightPop .24s cubic-bezier(.2,.75,.2,1)}
.fire-spotlight-tooltip.above{transform-origin:50% 100%}.fire-spotlight-tooltip.below{transform-origin:50% 0}
.fire-spotlight-arrow{position:absolute;width:12px;height:12px;background:#fff;transform:rotate(45deg);pointer-events:none}
.fire-spotlight-tooltip.above .fire-spotlight-arrow{bottom:-5px}.fire-spotlight-tooltip.below .fire-spotlight-arrow{top:-5px}
.fire-spotlight-copy{touch-action:pan-y;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.fire-spotlight-title{display:block;font-size:17px;font-weight:650;line-height:1.5;color:#253b31}
.fire-spotlight-description{display:block;margin-top:7px;font-size:14px;line-height:1.65;color:#657168}
.fire-spotlight-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-shrink:0;margin-top:16px}
.fire-spotlight-counter{font-size:12px;font-variant-numeric:tabular-nums;color:#788179}
.fire-spotlight-next{min-width:98px!important;min-height:44px!important;height:44px!important;padding:0 17px!important;margin:0!important;border:0!important;border-radius:11px!important;background:#294f40!important;color:#fff!important;font-size:14px!important;font-weight:550!important;line-height:1!important}
.fire-spotlight-next[disabled]{opacity:.58}
@keyframes fireSpotlightEnter{from{opacity:0}to{opacity:1}}
@keyframes fireSpotlightBreathe{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes fireSpotlightPop{0%{opacity:0;transform:scale(.94)}75%{opacity:1;transform:scale(1.015)}100%{opacity:1;transform:scale(1)}}
@media(prefers-reduced-motion:reduce){.fire-spotlight,.fire-spotlight-tooltip,.fire-spotlight-outline{animation:none!important}.fire-spotlight-hole,.fire-spotlight-anchor{transition:none!important}.fire-spotlight-closing{transition:opacity .1s ease}}
</style>
