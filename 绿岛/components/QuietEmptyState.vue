
<template>
 <view class="qe-empty" :class="{'qe-empty-leaving':leaving}">
  <image class="qe-empty-art" :src="art" mode="aspectFit" aria-hidden="true" />
  <view class="qe-empty-copy"><text class="qe-empty-title">{{title}}</text><text class="qe-empty-description">{{description}}</text></view>
  <image v-if="pointing && arrow" class="qe-empty-arrow" :style="arrowStyle" :src="arrow" mode="scaleToFill" aria-hidden="true" />
 </view>
</template>
<script>
const svgUri=svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
const book=`<svg xmlns="http://www.w3.org/2000/svg" width="190" height="150" viewBox="0 0 190 150" fill="none">
<ellipse cx="91" cy="126" rx="72" ry="10" fill="#e7e9df"/>
<g stroke="#7b8e7e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
<path d="M31 40c18-7 41-8 60 2 20-12 43-14 66-12l-6 86c-21-3-39 0-58 10-20-9-43-10-64-3z" fill="#f8f8f2"/>
<path d="M91 42l2 84M31 40l-7 4 3 83c23-3 45-2 66 6 18-10 38-13 61-11l3-7"/>
<path d="M60 60c6-1 12-1 18 1M59 79c6-1 12 0 18 1M59 99l18 2M106 58c10-4 20-6 30-6M107 77c8-3 15-4 24-4M108 96l14-2"/>
<path d="m42 58 3 4 6-8M41 78l3 4 6-8M41 98l3 4 6-8"/>
<path d="M38 24l-5-7M49 20l-1-9M27 31l-9-3"/>
</g>
<g transform="rotate(27 146 86)" stroke="#6b8170" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
<path d="M140 49a6 6 0 0 1 12 0v58l-6 16-6-16z" fill="#edf0e6"/>
<path d="M140 58h12M140 64h12M146 64v42M140 107h12M144 118h4"/>
</g></svg>`
const plant=`<svg xmlns="http://www.w3.org/2000/svg" width="190" height="150" viewBox="0 0 190 150" fill="none">
<ellipse cx="95" cy="128" rx="56" ry="9" fill="#e7e9df"/>
<g stroke="#7b8e7e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
<path d="M66 88h58l-8 36H74z" fill="#f0f1e7"/><rect x="62" y="81" width="66" height="10" rx="4" fill="#f8f8f2"/>
<path d="M95 81V50"/><path d="M95 67c-26 1-38-16-36-32 19-1 35 10 36 32Z" fill="#dce5d7"/><path d="M95 53c2-24 17-38 39-35-2 23-16 37-39 35Z" fill="#e5ebdf"/><path d="m95 67-22-19M95 53l24-22"/>
<path d="m49 61-6 3M142 67l7 1M48 50l-5-3"/></g></svg>`
export default{
 props:{kind:{type:String,default:'ledger'},title:String,description:String,leaving:Boolean,pointing:Boolean},
 emits:['ready'],
 data(){return{arrow:'',arrowStyle:{}}},
 computed:{art(){return svgUri(this.kind==='wishlist'?plant:book)}},
 watch:{pointing(value){if(!value)this.arrow='';else if(this.lastPage)this.pointAt(this.lastPage,this.lastSelector)}},
 mounted(){this.$emit('ready')},
 methods:{
  pointAt(page,selector){
   this.lastPage=page;this.lastSelector=selector
   if(!this.pointing||this.leaving)return
   try{
    uni.createSelectorQuery().in(this).select('.qe-empty').boundingClientRect(root=>{
    if(!root)return
    uni.createSelectorQuery().in(this).select('.qe-empty-copy').boundingClientRect(copy=>{
     if(!copy||!this.pointing||this.leaving)return
     uni.createSelectorQuery().in(page).select(selector).boundingClientRect(target=>{
      if(!target||!this.pointing||this.leaving)return
      const info=uni.getWindowInfo?uni.getWindowInfo():uni.getSystemInfoSync(),w=info.windowWidth,h=info.windowHeight
      const x=copy.left+copy.width*.52,y=copy.top+copy.height+16,tx=target.left+5,ty=target.top+5
      if(y>ty-30||y<0||ty>h||tx>w){this.arrow='';return}
      const middle=(y+ty)/2,path='M '+x+' '+y+' C '+x+' '+(y+55)+', '+(tx-42)+' '+(middle-12)+', '+tx+' '+ty
      this.arrowStyle={left:-root.left+'px',top:-root.top+'px',width:w+'px',height:h+'px'}
      this.arrow=svgUri('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><path d="'+path+'" fill="none" stroke="#7b8e7e" stroke-width="1.6" stroke-dasharray="4 7" stroke-linecap="round"/><path d="m '+(tx-11)+' '+(ty-3)+' 11 3 -2 -11" fill="none" stroke="#7b8e7e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>')
     }).exec()
    }).exec()
    }).exec()
   }catch(ignore){this.arrow=''}
  },
 },
}
</script>
<style>
.qe-empty{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px;padding:24px 10px 70px;box-sizing:border-box;transition:opacity .22s ease,transform .22s ease}
.qe-empty-art{display:block;width:174px;height:140px;margin-bottom:18px;animation:qeArtFloat 4s ease-in-out infinite}
.qe-empty-copy{text-align:center;max-width:320px}.qe-empty-title{display:block;font-size:21px;font-weight:600;line-height:1.5;color:#253b31}.qe-empty-description{display:block;font-size:13px;line-height:1.75;color:#788177;margin-top:8px}
.qe-empty-arrow{position:absolute;left:0;top:0;z-index:15;pointer-events:none}
.qe-empty-leaving{position:absolute;top:0;left:0;right:0;opacity:0;transform:scale(.9);pointer-events:none}
@keyframes qeArtFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@media(max-height:720px){.qe-empty{min-height:225px;padding-top:12px;padding-bottom:55px}.qe-empty-art{width:142px;height:110px;margin-bottom:10px}.qe-empty-title{font-size:19px}}
@media(prefers-reduced-motion:reduce){.qe-empty{transition:none}.qe-empty-art{animation:none}}
</style>
