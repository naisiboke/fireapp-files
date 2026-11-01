// Admin-only recovery tool. Run on a trusted machine with CloudBase admin credentials.
// Preview is the default. Existing source rows are never removed.
const cloud=require('@cloudbase/node-sdk')
const crypto=require('node:crypto')
const db=cloud.init({env:process.env.TCB_ENV}).database()
const hash=(...parts)=>crypto.createHash('sha256').update(parts.join(':')).digest('hex')
const first=result=>Array.isArray(result.data)?result.data[0]:result.data
const uid=process.env.TARGET_UID
const sourceState=process.env.SOURCE_STATE_ID
const sourceCollections=JSON.parse(process.env.SOURCE_COLLECTION_IDS||'[]')
const apply=process.env.APPLY_RECOVERY==='yes'
const decode=value=>typeof value==='string'?JSON.parse(value):value
const allowed=new Set(['ugc','favorites','net-worth','applied-models','post-draft','ai-chats','personality-tests'])
function ownerAllowed(row){
 const owner=row.migrationVerifiedUid||row.userId||row.ownerId||row._openid
 return owner===uid || (!owner && process.env.MIGRATION_OWNER_CONFIRMED==='yes')
}
async function recover(){
 if(!uid)throw Error('TARGET_UID is required; obtain it from CloudBase identity management')
 const rows=[]
 if(sourceState){
  const row=first(await db.collection('user_states').doc(sourceState).get())
  if(!row||!ownerAllowed(row))throw Error('State owner is not verified. Do not guess ownership from a device ID.')
  const state=decode(row.state||row.value||row)
  if(!state.finance||!Array.isArray(state.ledger))throw Error('Legacy state shape is not recognized')
  rows.push({kind:'state',id:sourceState,row,value:state})
 }
 for(const id of sourceCollections){
  const row=first(await db.collection('user_collections').doc(id).get())
  if(!row||!ownerAllowed(row))throw Error('Collection owner is not verified: '+id)
  const kind=row.collection||row.name||row.key
  if(!allowed.has(kind))throw Error('Unknown legacy collection name: '+kind)
  const value=decode(row.items??row.value)
  if(['ugc','favorites','applied-models','ai-chats','personality-tests'].includes(kind)&&!Array.isArray(value))throw Error('Legacy collection is not an array: '+id)
  rows.push({kind,id,row,value})
 }
 console.log(JSON.stringify({mode:apply?'apply':'preview',targetUid:uid,sources:rows.map(row=>({id:row.id,kind:row.kind,records:Array.isArray(row.value)?row.value.length:undefined}))},null,2))
 if(!apply)return
 for(const source of rows){
  if(source.kind!=='ugc')await db.runTransaction(async tx=>{
   const collection=source.kind==='state'?'user_states':'user_collections'
   const id=source.kind==='state'?hash('state',uid):hash('collection',uid,source.kind)
   const existing=first(await tx.collection(collection).doc(id).get())
   if(existing)throw Error('Canonical data already exists; export both copies and resolve before merging: '+source.kind)
   await tx.collection('data_backups').doc(hash('legacy-recovery',source.id,uid)).set({userId:uid,kind:'legacy-recovery',savedAt:Date.now(),snapshot:source.row})
   const payload=source.kind==='state'?{state:source.value}:{collection:source.kind,items:source.value}
   await tx.collection(collection).doc(id).set({...payload,userId:uid,revision:1,updatedAt:Date.now()})
  })
  if(source.kind==='ugc'){
   for(const post of Array.isArray(source.value)?source.value:[]){
    const id=hash('post',uid,String(post.id||crypto.randomUUID()))
    await db.runTransaction(async tx=>{
     const existing=first(await tx.collection('community_posts').doc(id).get())
     if(existing)return
     await tx.collection('community_posts').doc(id).set({
      ...post,id,legacyId:post.id||id,ownerId:uid,deleted:false,
      journey:post.journey==='settled'?'settled':'doing',
      createdAt:Number(post.createdAt)||Date.now(),updatedAt:Date.now(),
      status:'review_failed',reviewStatus:'review_failed',reviewReason:'旧版内容已恢复，请重试云端审核后发布',
     })
    })
   }
   await db.collection('data_backups').doc(hash('legacy-recovery',source.id,uid)).set({userId:uid,kind:'legacy-ugc-recovery',savedAt:Date.now(),snapshot:source.row})
  }
 }
 console.log('Recovery complete. Source rows were retained. Sign in to the same account and restore again.')
}
recover().catch(error=>{console.error(error.message);process.exitCode=1})
