import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFileSync} from 'node:fs'
const require=createRequire(import.meta.url)
const {createHandler,SERVICE_BUILD}=require('../../cloudfunctions/accountData/service.js')
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value))
let checks=0;const check=(ok,message)=>{assert.ok(ok,message);checks++}
function memoryDatabase(){
 const tables=new Map()
 let tail=Promise.resolve()
 function table(name){if(!tables.has(name))tables.set(name,new Map());return tables.get(name)}
 function query(name,filter={},offset=0,maximum=100,order){
  const values=()=>[...table(name).values()].filter(row=>Object.entries(filter).every(([key,value])=>row[key]===value))
  return {
   where:criteria=>query(name,{...filter,...criteria},offset,maximum,order),
   skip:value=>query(name,filter,value,maximum,order),
   limit:value=>query(name,filter,offset,value,order),
   orderBy:(field,direction)=>query(name,filter,offset,maximum,{field,direction}),
   get:async()=>{const rows=values();if(order)rows.sort((a,b)=>(a[order.field]-b[order.field])*(order.direction==='desc'?-1:1));return {data:copy(rows.slice(offset,offset+maximum))}},
   count:async()=>({total:values().length}),
   update:async value=>{const rows=values();for(const row of rows)table(name).set(row._id,{...row,...copy(value)});return {updated:rows.length}},
   doc:id=>({
    get:async()=>({data:table(name).has(id)?[copy(table(name).get(id))]:[]}),
    set:async value=>{table(name).set(id,{...copy(value),_id:id});return {id}},
    update:async value=>{if(!table(name).has(id))throw Error('missing doc');table(name).set(id,{...table(name).get(id),...copy(value)});return {updated:1}},
   }),
  }
 }
 const db={collection:name=>query(name),tables}
 db.runTransaction=fn=>{const pending=tail.catch(()=>{}).then(()=>fn(db));tail=pending;return pending}
 return db
}

const logs=[],originalError=console.error
console.error=(...args)=>logs.push(args)
try{
 let identityCalls=0,dbCalls=0
 const infoHandler=createHandler({db:{collection(){dbCalls++;throw Error('must not read')}},identity:async()=>{identityCalls++;return null}})
 let result=await infoHandler({action:'service.info'})
 check(result.ok&&result.serviceBuild===SERVICE_BUILD&&result.capabilities.includes('profile.nickname')&&result.capabilities.includes('posts.submit'),'deployment probe identifies supported nickname and post actions')
 check(result.chatMaxTokens===500&&identityCalls===0&&dbCalls===0&&!('uid'in result),'probe reveals only static deployment metadata')
 check((await infoHandler({action:'bootstrap'})).code==='AUTH_REQUIRED','private data remains authenticated')
 const db=memoryDatabase(),handler=createHandler({db,identity:async()=>({uid:'test-account'})})
 result=await handler({action:'not.supported',uid:'private-user',token:'private-token'})
 check(result.code==='UNKNOWN_ACTION'&&result.diagnostic.serviceBuild===SERVICE_BUILD&&result.diagnostic.action==='not.supported','unknown action gets exact deployment marker')
 const failed=(collection,method,message)=>({
  collection(name){
   const original=db.collection(name)
   if(name!==collection)return original
   if(method==='read')return{doc:()=>({get:async()=>{throw Object.assign(Error(message),{code:'DATABASE_REQUEST_FAILED',requestId:'db-request-123'})}})}
   return{where(){return this},orderBy(){return this},skip(){return this},limit(){return this},get:async()=>{throw Object.assign(Error(message),{code:'DATABASE_REQUEST_FAILED'})}}
  },
  runTransaction:db.runTransaction,
 })
 for(const [action,collection,method,message,reason]of [
  ['profile.nickname','user_states','read','collection user_states does not exist private-token','COLLECTION_MISSING'],
  ['posts.submit','community_posts','read','collection community_posts not found private-email@example.com','COLLECTION_MISSING'],
  ['posts.public','community_posts','list','index required, create index for query','INDEX_REQUIRED'],
  ['profile.nickname','user_states','read','database access denied for private-user','ACCESS_DENIED'],
 ]){
  const h=createHandler({db:failed(collection,method,message),identity:async()=>({uid:'test-account'})})
  result=await h({action,name:'正常旅人',post:{id:'x',title:'private-title',content:'private-content'}})
  check(result.code==='DATABASE_REQUEST_FAILED'&&result.diagnostic.collection===collection&&result.diagnostic.operation===method,'database failure identifies collection and operation '+action)
  check(result.diagnostic.reason===reason,'provider failure classified without leaking raw message')
  check(!result.message.includes('private-'),'raw database details not reflected in UI message')
 }
 await db.collection('community_posts').doc('edit-me').set({id:'edit-me',ownerId:'test-account',title:'原始标题',content:'原始内容仍然保留',status:'approved',deleted:false,createdAt:1})
 const broken={collection:db.collection,runTransaction:callback=>db.runTransaction(tx=>callback({
  collection(name){
   if(name==='data_backups')return{doc:()=>({set:async()=>{throw Object.assign(Error('collection data_backups does not exist'),{code:'DATABASE_REQUEST_FAILED'})}})}
   return tx.collection(name)
  },
 }))}
 const edit=createHandler({db:broken,identity:async()=>({uid:'test-account'}),moderate:async()=>({approved:true})})
 result=await edit({action:'posts.submit',post:{id:'edit-me',title:'更新后的标题',content:'更新后的真实生活经历内容',timeline:[]}})
 check(result.code==='DATABASE_REQUEST_FAILED'&&result.diagnostic.collection==='data_backups'&&result.diagnostic.operation==='post-backup','editing failure identifies backup collection specifically')
 check((await db.collection('community_posts').doc('edit-me').get()).data[0].title==='原始标题','failed backup does not overwrite original post')
 const infoLogs=[],entry={exports:{}}
 new Function('require','exports','console',readFileSync(new URL('../../cloudfunctions/accountData/index.js',import.meta.url),'utf8'))(
  name=>name==='@cloudbase/node-sdk'?{init:()=>({database:()=>db,auth:()=>({getUserInfo:()=>({uid:'test-account'})})})}:name==='./service'?{createHandler,SERVICE_BUILD}:null,
  entry.exports,{info:(...args)=>infoLogs.push(args),warn(){},error(){}},
 )
 result=await entry.exports.main({action:'service.info',question:'private-content',token:'private-token'})
 check(result.serviceBuild===SERVICE_BUILD&&JSON.stringify(infoLogs).includes(SERVICE_BUILD)&&JSON.stringify(infoLogs).includes('service.info'),'actual entrypoint binds new service and logs action plus build')
 check(!JSON.stringify(infoLogs).includes('private-content')&&!JSON.stringify(infoLogs).includes('private-token'),'entrypoint does not log request body or credentials')
 const logged=JSON.stringify(logs)
 check(!logged.includes('private-token')&&!logged.includes('private-email@example.com')&&!logged.includes('private-user')&&!logged.includes('private-content'),'failure logs contain sanitized metadata only')
}finally{console.error=originalError}
console.log('Deployment marker and database-step diagnostics: '+checks+' checks passed')
