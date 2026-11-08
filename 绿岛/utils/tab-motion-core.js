// Pure geometry and latest-intent navigation; no storage or account dependencies.
export const TAB_KEYS = ['home', 'tools', 'community', 'profile']
export const TAB_PATHS = ['/pages/index/index', '/pages/tools/index', '/pages/community/index', '/pages/profile/index']
export const FLOW_DURATION = 400
const clamp = n => Math.max(0, Math.min(1, n))
const ease = n => 1 - Math.pow(1 - clamp(n), 3)
const mix = (a,b,t) => a+(b-a)*t

export function tabRect(index, width) {
  const small=width<=390, pad=small?7:10, center=small?52:60
  const cell=(width-2*pad-center)/4
  return {left:pad+cell*index+(index>1?center:0)+2,top:small?5:7,width:cell-4,height:small?40:44}
}
export function flowRect(from,to,progress) {
  const p=clamp(progress)
  if(p===0)return {...from}
  if(p===1)return {...to}
  const right=to.left+to.width/2>=from.left+from.width/2
  const front=ease(p/.72),back=ease((p-.10)/.80)
  // A small damped overshoot comes after the stretched body has caught up.
  const spring=p>.72?Math.sin((p-.72)/.28*Math.PI*2)*1.4*(1-p)/.28:0
  const left=mix(from.left,to.left,right?back:front)+spring
  const edge=mix(from.left+from.width,to.left+to.width,right?front:back)+spring
  const height=mix(from.height,to.height,p)*(1-.13*Math.sin(Math.PI*p))
  return {left,top:mix(from.top,to.top,p)+(mix(from.height,to.height,p)-height)/2,width:Math.max(12,edge-left),height}
}
export function sampleMotion(motion, now, fallback) {
  return motion ? flowRect(motion.from,motion.to,(now-motion.started)/FLOW_DURATION) : {...fallback}
}
export function createTabRouter({navigate,onIntent=()=>{},onArrival=()=>{},onFailure=()=>{},schedule=setTimeout,cancel=clearTimeout}) {
  let actual='',desired='',pending=null,sequence=0,timer=null
  function pump(){
    if(pending||!desired||desired===actual)return
    const request={id:++sequence,path:desired}
    pending=request
    const done=(ok,error)=>{
      if(pending!==request)return
      cancel(timer);timer=null;pending=null
      if(ok){actual=request.path;onArrival(actual)}
      else if(desired===request.path){desired=actual;onFailure(actual,error)}
      pump()
    }
    timer=schedule(()=>done(false,{errMsg:'switchTab timeout'}),3500)
    try{navigate(request.path,()=>done(true),error=>done(false,error))}catch(error){done(false,error)}
  }
  return {
    sync(path){if(!pending){actual=path;desired=path}},
    request(path){
      if(!TAB_PATHS.includes(path))return
      desired=path;onIntent(path);pump()
    },
    snapshot(){return {actual,desired,pending:pending?.path||null}},
    dispose(){sequence++;pending=null;if(timer!==null)cancel(timer);timer=null},
  }
}
