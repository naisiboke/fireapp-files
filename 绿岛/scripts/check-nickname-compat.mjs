import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {validateNickname} from '../utils/nickname.js'
const require=createRequire(import.meta.url)
const acorn=createRequire((process.env.REGEX_TOOLS||'/tmp/fire-regex-tools')+'/compat-check.cjs')('acorn')
const client=readFileSync(new URL('../utils/nickname.js',import.meta.url),'utf8')
const server=readFileSync(new URL('../../cloudfunctions/accountData/service.js',import.meta.url),'utf8')
let checks=0
const check=(ok,label)=>{assert.ok(ok,label);checks++}
assert.throws(()=>acorn.parse(String.raw`const value=/^[\p{Script=Han}A-Za-z0-9]+$/u`,{ecmaVersion:2017}),/regular expression|escape|Invalid/i);checks++
acorn.parse(client,{ecmaVersion:2017,sourceType:'module'});checks++
const serverValidation=server.slice(server.indexOf('function nicknameCharactersAllowed'),server.indexOf('function strictPublicProfile'))
acorn.parse(serverValidation,{ecmaVersion:2017,sourceType:'script'});checks++
for(const [name,source]of [['client',client],['server',server]]){
 check(!source.includes('\\p{')&&!source.includes('\\P{'),'no Unicode property escapes in '+name)
}
function fail(code,message){throw Object.assign(Error(message),{code})}
const serverNickname=new Function('fail',serverValidation+';return nicknameValue')(fail)
const accepted=['测试用户','清风旅人','一路向阳天天开心','Abc12345','旅人1','繁體漢字','𠮷野','𠀀名','〇一']
for(const value of accepted){
 const front=validateNickname(value)
 check(front.ok,'compatible client accepts '+value)
 check(serverNickname(value)===front.value,'cloud and client validation match '+value)
}
for(const value of ['','a','一二三四五六七八九','旅人🌱','S B','傻B','NMSL','a\u200bb','旅人@','a\uD840','a\uDC00']){
 check(!validateNickname(value).ok,'client still rejects invalid nickname')
 assert.throws(()=>serverNickname(value),error=>error.code==='NICKNAME_INVALID');checks++
}
check(validateNickname('ＡＢ１２').value==='AB12','normalization remains compatible')
const {createHandler}=require('../../cloudfunctions/accountData/service.js')
const copy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value))
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


const db=memoryDatabase()
let reviews=0,uid='compat-user'
const handler=createHandler({db,identity:async()=>({uid,email:'private@example.com'}),moderateNickname:async()=>{reviews++;return{approved:true}}})
let result=await handler({action:'state.save',revision:0,state:{financeEntered:true,finance:{assets:12345},ledger:[{id:'keep',cents:123}],profile:{name:'测试用户'}}})
check(result.ok,'actual cloud function loads and saves without regexp syntax error')
result=await handler({action:'bootstrap'})
check(result.ok&&result.state.finance.assets===12345&&validateNickname(result.state.profile.name).ok,'login bootstrap accepts restored profile using real validator')
result=await handler({action:'profile.nickname',name:'清风旅人'})
check(result.ok&&reviews===1&&result.profile.nicknameReviewStatus==='approved','cloud nickname still requires strict AI approval')
result=await handler({action:'bootstrap'})
check(result.profile.name==='清风旅人'&&result.state.ledger[0].id==='keep'&&result.revision===1,'recovery preserves finance, records and server-owned nickname')
const rejected=createHandler({db,identity:async()=>({uid:'rejected'}),moderateNickname:async()=>({approved:false})})
check((await rejected({action:'profile.nickname',name:'伞兵旅人'})).code==='NICKNAME_REJECTED','semantic rejection remains enforced')
console.log('Nickname legacy-regexp compatibility and real login recovery: '+checks+' checks passed')
