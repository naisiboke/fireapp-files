const crypto=require('node:crypto')
const key=(...parts)=>crypto.createHash('sha256').update(parts.join(':')).digest('hex')
const checked=result=>{if(result?.code){const error=Error(String(result.message||result.code));error.code=result.code;throw error}return result}
const first=r=>Array.isArray(r.data)?r.data[0]||null:r.data||null
const read=async(db,name,id)=>first(checked(await db.collection(name).doc(id).get()))
const DAY=86400000,OFFICIAL=new Set(Array.from({length:7},(_,i)=>'official-'+(i+1)))
const day=at=>new Date(at+8*3600000).toISOString().slice(0,10)
const month=at=>day(at).slice(0,7)
const week=at=>{const d=new Date(day(at)+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10)}
const rules={ledger:5,assets:8,goal:8,favorite:2,publish:10,edit:8}
function safeExp(v){return Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):0}
function view(r,at){return{version:1,exp:r.baseExp+r.earned,earned:r.earned,count:r.count,events:r.events||[],counters:r.counters||{},serverAt:at}}
async function wallet(db,uid,at,legacyExp=0){
 return db.runTransaction(async tx=>{
  const id=key('actions',uid);let row=await read(tx,'action_rewards',id)
  if(row&&row.userId!==uid)throw Error('REWARD_OWNER_MISMATCH')
  if(!row){const state=await read(tx,'user_states',key('state',uid));row={userId:uid,baseExp:Math.max(safeExp(state?.state?.exp),safeExp(legacyExp)),earned:0,count:0,events:[],counters:{},createdAt:at};checked(await tx.collection('action_rewards').doc(id).set(row))}
  return view(row,at)
 })
}
async function award(db,uid,kind,ref,at,details={}){
 if(!rules[kind])throw Error('INVALID_REWARD')
 await wallet(db,uid,at)
 return db.runTransaction(async tx=>{
  const id=key('actions',uid),row=await read(tx,'action_rewards',id)
  if(!row||row.userId!==uid)throw Error('REWARD_OWNER_MISMATCH')
  const counters=row.counters||{},today=day(at);let cycle='',eligible=true
  if(kind==='ledger')cycle=today
  if(kind==='assets'){const old=counters.assets||{};eligible=(!old.lastAt||at-old.lastAt>=14*DAY)&&(old.month!==month(at)||(old.count||0)<2);cycle=month(at)+':'+(old.month===month(at)?old.count||0:0)}
  if(kind==='goal')cycle=week(at)
  if(kind==='favorite'){
   const old=counters.favorite||{};eligible=old.day!==today||(old.count||0)<3;cycle=String(ref)
   if(!OFFICIAL.has(String(ref))){const post=await read(tx,'community_posts',String(ref));if(!post||post.deleted||post.status!=='approved'||post.ownerId===uid)eligible=false}
  }
  if(kind==='publish'){cycle=String(ref);eligible=!counters.publishAt||at-counters.publishAt>=90*DAY}
  if(kind==='edit'){cycle=String(ref)+':'+String(details.hash||'');eligible=!!details.hash&&at-Number(details.firstPublishedAt||at)>=60*DAY&&(!counters.editAt||at-counters.editAt>=60*DAY)}
  const claimId=key('reward',uid,kind,cycle),prior=await read(tx,'action_reward_claims',claimId)
  if(prior||!eligible)return{awarded:0,rewards:view(row,at)}
  counters.actionDays=[...new Set([...(counters.actionDays||[]),today])]
  const event={id:claimId,kind,ref:String(ref),day:today,period:kind==='goal'?week(at):kind==='assets'?month(at):today,at,xp:rules[kind]}
  if(kind==='assets'){const old=counters.assets||{};counters.assets={month:month(at),count:old.month===month(at)?(old.count||0)+1:1,lastAt:at}}
  if(kind==='favorite'){const old=counters.favorite||{};counters.favorite={day:today,count:old.day===today?(old.count||0)+1:1}}
  if(kind==='publish')counters.publishAt=at
  if(kind==='edit')counters.editAt=at
  const {_id,...savedRow}=row
  const next={...savedRow,earned:row.earned+rules[kind],count:row.count+1,counters,events:[...(row.events||[]),event].slice(-120)}
  checked(await tx.collection('action_reward_claims').doc(claimId).set({userId:uid,...event}))
  checked(await tx.collection('action_rewards').doc(id).set(next))
  return{awarded:rules[kind],rewards:view(next,at)}
 })
}
async function forState(db,uid,state,at){
 await wallet(db,uid,at)
 const recent=v=>Number(v)>0&&Number(v)<=at+60000&&at-Number(v)<7*DAY
 for(const entry of state.ledger||[])if(entry.rewardVersion===1&&entry.type==='expense'&&entry.date===day(at)&&recent(entry.updatedAt)&&Number(entry.cents)>0){await award(db,uid,'ledger',entry.id,at);break}
 const assets=(state.assetHistory||[]).filter(e=>e.rewardVersion===1&&String(e.date).slice(0,7)===month(at)&&recent(e.confirmedAt)).sort((a,b)=>b.confirmedAt-a.confirmedAt)
 if(assets[0])await award(db,uid,'assets',assets[0].id,at)
 const goal=state.goalPlan
 if(goal?.name&&goal.rewardVersion===1&&recent(goal.reviewedAt)&&week(Number(goal.reviewedAt))===week(at))await award(db,uid,'goal',goal.id||goal.name,at)
 return wallet(db,uid,at)
}
async function forFavorites(db,uid,items,at){
 for(const entry of Array.isArray(items)?items:[]){
  const current=await wallet(db,uid,at)
  if(current.counters.favorite?.day===day(at)&&current.counters.favorite.count>=3)break
  const stamp=Number(entry.snapshotAt)
  if(!entry.deleted&&entry.rewardVersion===1&&Number.isFinite(stamp)&&stamp>0&&stamp<=at+60000&&at-stamp<7*DAY&&day(stamp)===day(at))await award(db,uid,'favorite',entry.postId,at)
 }
 return wallet(db,uid,at)
}
module.exports={wallet,award,forState,forFavorites,day,week,key}
