import { reactive } from 'vue'
import { TAB_KEYS, TAB_PATHS, FLOW_DURATION, tabRect, sampleMotion, createTabRouter } from './tab-motion-core.js'

export const tabMotion=reactive({selected:'',motion:null,serial:0,width:390})
let settledTimer=null
let entry=null
const keyFor=path=>TAB_KEYS[TAB_PATHS.indexOf(path)]||''
function actualPath(){
  try{const pages=getCurrentPages();return '/'+String(pages[pages.length-1]?.route||'').replace(/^\//,'')}catch{return ''}
}
function move(key,width=tabMotion.width){
  if(!TAB_KEYS.includes(key))return
  const now=Date.now(), previous=tabMotion.selected||key
  const resized=Math.abs(width-tabMotion.width)>1
  const from=sampleMotion(resized?null:tabMotion.motion,now,tabRect(TAB_KEYS.indexOf(previous),width))
  const to=tabRect(TAB_KEYS.indexOf(key),width)
  tabMotion.width=width
  tabMotion.selected=key
  tabMotion.motion={id:++tabMotion.serial,started:now,from,to}
  clearTimeout(settledTimer)
  settledTimer=setTimeout(()=>{tabMotion.motion=null},FLOW_DURATION+20)
}
const router=createTabRouter({
  navigate:(path,success,fail)=>uni.switchTab({url:path,success,fail}),
  onArrival:path=>{
    // Actual page onShow consumes the direction; success only reconciles selection.
    if(router.snapshot().desired===path)tabMotion.selected=keyFor(path)
  },
  onFailure:path=>{
    move(keyFor(path)||keyFor(actualPath())||'home')
    entry=null
    try{uni.showToast({title:'切换未成功，请重试',icon:'none'})}catch{}
  },
})
export function navigateTab(path,current,width){
  const actual=actualPath()||TAB_PATHS[TAB_KEYS.indexOf(current)]
  router.sync(actual)
  const next=keyFor(path), previous=keyFor(actual)||current
  const snapshot=router.snapshot()
  if(path===actual&&!snapshot.pending)return
  entry={path,direction:Math.sign(TAB_KEYS.indexOf(next)-TAB_KEYS.indexOf(previous)),expires:Date.now()+5000}
  move(next,width)
  router.request(path)
}
export function enterTab(path){
  const key=keyFor(path)
  if(!key)return 0
  const direction=entry&&entry.path===path&&entry.expires>Date.now()?entry.direction:0
  if(entry?.path===path)entry=null
  router.sync(path)
  // An intermediate native arrival must not override a newer tap.
  if(!router.snapshot().pending){
    tabMotion.selected=key
    if(tabMotion.motion&&Math.abs(tabMotion.motion.to.left-tabRect(TAB_KEYS.indexOf(key),tabMotion.width).left)>1)tabMotion.motion=null
  }
  return direction
}
export function resizeTabMotion(width,current){
  if(Math.abs(width-tabMotion.width)<1)return
  clearTimeout(settledTimer);tabMotion.motion=null;tabMotion.width=width
  if(!tabMotion.selected)tabMotion.selected=current
}
