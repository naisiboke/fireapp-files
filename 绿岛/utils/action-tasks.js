const DAY=86400000
export const ACTION_RULES=[
 {id:'ledger',title:'记录今天的消费',xp:5,desc:'每天首次保存当日支出',url:'/pages/ledger/edit'},
 {id:'assets',title:'记录本月资产',xp:8,desc:'每月最多2次，两次至少间隔14天',url:'/pages/assets/index'},
 {id:'goal',title:'检视储蓄目标',xp:8,desc:'每周保存或检视目标1次',url:'/pages/calculator/index?mode=goal&from=home'},
 {id:'favorite',title:'收藏一篇社区帖子',xp:2,desc:'每篇只奖励1次，每天最多3篇',url:'/pages/community/index'},
 {id:'publish',title:'分享一篇社区帖子',xp:10,desc:'审核通过后奖励，每90天1次',url:'/pages/community/share'},
 {id:'edit',title:'更新自己的社区帖子',xp:8,desc:'补充内容或时间线，审核通过后奖励，每60天1次',url:'/pages/community/manage'},
]
export const actionDay=at=>new Date(at+8*3600000).toISOString().slice(0,10)
export function actionWeek(at){const d=new Date(actionDay(at)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)}
export function todayActions(state,{posts=[],member=false,at=Date.now()}={}){
 const events=state.actionRewards?.events||[],c=state.actionRewards?.counters||{},today=actionDay(at),month=today.slice(0,7)
 const rows=ACTION_RULES.filter(rule=>{
  const id=rule.id
  if(id==='goal'&&!state.goalPlan?.name)return false
  if((id==='publish'||id==='edit')&&!member)return false
  if(events.some(event=>event.kind===id&&event.day===today))return true
  if(id==='goal'&&(Number(state.goalPlan.assets)>=Number(state.goalPlan.amount)||events.some(e=>e.kind==='goal'&&e.period===actionWeek(at))))return false
  if(id==='assets'&&((c.assets?.lastAt&&at-c.assets.lastAt<14*DAY)||(c.assets?.month===month&&c.assets.count>=2)))return false
  if(id==='publish'&&c.publishAt&&at-c.publishAt<90*DAY)return false
  if(id==='edit'&&((c.editAt&&at-c.editAt<60*DAY)||!posts.some(p=>!p.deleted&&p.status==='approved'&&p.firstPublishedAt&&at-p.firstPublishedAt>=60*DAY)))return false
  return true
 }).map(rule=>({...rule,title:rule.id==='goal'?'检视「'+state.goalPlan.name+'」目标':rule.title,done:events.some(e=>e.kind===rule.id&&e.day===today)}))
 let seed=0;for(const ch of today)seed=(seed*31+ch.charCodeAt(0))>>>0
 const rank=id=>id==='ledger'?-1:((seed+ACTION_RULES.findIndex(r=>r.id===id)*7)%5)
 return rows.sort((a,b)=>rank(a.id)-rank(b.id)||a.id.localeCompare(b.id)).slice(0,3)
}
