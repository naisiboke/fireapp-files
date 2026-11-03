// Run in 绿岛: node scripts/check-vip-redemption.mjs
// Actual cloud handler, atomic in-memory transaction mocks, and fixed server clock.
// No production data or real redemption codes are accessed.
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
const source=path=>readFileSync(new URL('../../cloudfunctions/accountData/'+path,import.meta.url),'utf8')
const checks=[]
function check(name,value){assert.ok(value,name);checks.push(name)}
const copy=value=>JSON.parse(JSON.stringify(value))
function database(){
 const tables=new Map();let tail=Promise.resolve(),failUsed=false
 const table=name=>{if(!tables.has(name))tables.set(name,new Map());return tables.get(name)}
 const db={tables,failNextUsed(){failUsed=true},collection(name){
  const query=(where={},limit=100)=>({
   where:next=>query(next,limit),limit:n=>query(where,n),
   get:async()=>({data:[...table(name).values()].filter(row=>Object.entries(where).every(([k,v])=>row[k]===v)).slice(0,limit).map(copy)}),
   doc:id=>({
    get:async()=>({data:table(name).has(id)?[copy(table(name).get(id))]:[]}),
    set:async value=>{table(name).set(id,{...copy(value),_id:id});return{id}},
    update:async value=>{
     if(name==='vip_codes'&&value.status==='used'&&failUsed){failUsed=false;throw Error('simulated transaction write failure')}
     if(!table(name).has(id))throw Error('Missing record')
     table(name).set(id,{...table(name).get(id),...copy(value)});return {updated:1}
    },
   }),
  });return query()
 }}
 db.runTransaction=fn=>{
  const work=tail.catch(()=>{}).then(async()=>{
   const before=new Map([...tables].map(([name,rows])=>[name,new Map([...rows].map(([id,row])=>[id,copy(row)]))]))
   try{return await fn(db)}catch(error){tables.clear();for(const [name,rows]of before)tables.set(name,rows);throw error}
  });tail=work;return work
 }
 return db
}
const actionModule={exports:{}}
new Function('require','module',source('action-rewards.js'))(name=>{if(name==='node:crypto')return crypto;throw Error(name)},actionModule)
const mod={exports:{}}
new Function('require','module','Buffer','console','process',source('service.js'))(name=>{if(name==='node:crypto')return crypto;if(name==='./action-rewards.js')return actionModule.exports;throw Error(name)},mod,Buffer,{error(){},warn(){}},{env:{}})
const db=database();let at=1800000000000
const make=uid=>mod.exports.createHandler({db,identity:async()=>uid?{uid,email:uid+'@example.com'}:null,now:()=>at})
const a=make('user-A'),b=make('user-B')
const seed=async(id,code,extra={})=>db.collection('vip_codes').doc(id).set({code,durationDays:3,status:'unused',usedAt:'',...extra})
await seed('voucher-1','FIRE3D-TEST-A')
check('unauthenticated users cannot redeem',(await make(null)({action:'membership.redeem',code:'FIRE3D-TEST-A'})).code==='AUTH_REQUIRED')
check('document ID is rejected rather than treated as a code',(await a({action:'membership.redeem',code:'b548473b6ade532b0281e6e108bc1234'})).code==='REDEEM_DOCUMENT_ID')
let result=await a({action:'membership.redeem',code:' fire3d–test-a ',expectedUid:'user-A'})
check('valid three day voucher is accepted',result.ok&&result.durationDays===3&&!result.alreadyRedeemed)
check('three days is exactly 72 hours from server time',result.membership.expiresAt===at+3*86400000)
check('voucher records the verified user and used state',db.tables.get('vip_codes').get('voucher-1').usedBy==='user-A'&&db.tables.get('vip_codes').get('voucher-1').status==='used')
check('redemption writes a server backup',[...db.tables.get('data_backups').values()].some(row=>row.kind==='membership-redeem'))
const firstExpiry=result.membership.expiresAt
result=await a({action:'membership.redeem',code:'FIRE3D-TEST-A'})
check('same account retry is idempotent',result.ok&&result.alreadyRedeemed&&result.membership.expiresAt===firstExpiry)
check('another account cannot reuse the code',(await b({action:'membership.redeem',code:'FIRE3D-TEST-A'})).code==='REDEEM_USED')
result=await a({action:'bootstrap'})
check('membership-only record does not masquerade as a financial archive',result.ok&&!result.exists&&result.state===null&&result.revision===0&&result.membership.active)
const state={financeEntered:true,finance:{assets:50000,income:8000},ledger:[{id:'expense-1',cents:100}],membership:{active:true,expiresAt:0}}
result=await a({action:'state.save',state,revision:0})
check('financial state can be saved after redemption',result.ok&&result.revision===1)
result=await a({action:'bootstrap'})
check('financial upload cannot replace finite membership with an unlimited claim',result.state.membership.expiresAt===firstExpiry)
check('redemption does not discard financial data',result.state.finance.assets===50000&&result.state.ledger.length===1)
await seed('voucher-2','FIRE3D-TEST-B')
result=await a({action:'membership.redeem',code:'FIRE3D-TEST-B'})
check('second code extends existing membership',result.membership.expiresAt===firstExpiry+3*86400000)
const extended=result.membership.expiresAt
check('membership changes do not invalidate financial revision',(await a({action:'bootstrap'})).revision===1)
result=await a({action:'state.save',state:{...state,membership:{active:false}},revision:1})
check('stale or inactive client membership cannot revoke the redeemed membership',result.ok&&(await a({action:'membership.get'})).membership.expiresAt===extended)
await seed('voucher-race','FIRE3D-RACE-1')
const raced=await Promise.all([a({action:'membership.redeem',code:'FIRE3D-RACE-1'}),b({action:'membership.redeem',code:'FIRE3D-RACE-1'})])
check('concurrent different accounts have exactly one winner',raced.filter(x=>x.ok).length===1&&raced.filter(x=>x.code==='REDEEM_USED').length===1)
await seed('voucher-repeat','FIRE3D-REPEAT-1')
const prior=(await b({action:'membership.get'})).membership.expiresAt||at
const repeated=await Promise.all([b({action:'membership.redeem',code:'FIRE3D-REPEAT-1'}),b({action:'membership.redeem',code:'FIRE3D-REPEAT-1'})])
check('concurrent same account grants only once',repeated.every(x=>x.ok)&&repeated.filter(x=>x.alreadyRedeemed).length===1&&repeated[0].membership.expiresAt===Math.max(at,prior)+3*86400000)
await seed('voucher-expired','FIRE3D-EXPIRED',{expiresAt:at-1000})
check('expired voucher is rejected',(await b({action:'membership.redeem',code:'FIRE3D-EXPIRED'})).code==='REDEEM_EXPIRED')
check('expired voucher remains unused',db.tables.get('vip_codes').get('voucher-expired').status==='unused')
await seed('voucher-bad','FIRE3D-BAD-DAYS',{durationDays:-3})
check('invalid duration is rejected',(await b({action:'membership.redeem',code:'FIRE3D-BAD-DAYS'})).code==='REDEEM_DURATION_INVALID')
await seed('duplicate-1','FIRE3D-DUPLICATE');await seed('duplicate-2','FIRE3D-DUPLICATE')
check('ambiguous duplicate code configuration is rejected',(await make('duplicate-user')({action:'membership.redeem',code:'FIRE3D-DUPLICATE'})).code==='REDEEM_DUPLICATE')
check('expected UID mismatch cannot operate on another account',(await a({action:'membership.redeem',code:'FIRE3D-TEST-A',expectedUid:'user-B'})).code==='ACCOUNT_MISMATCH')
await seed('voucher-rollback','FIRE3D-ROLLBACK')
const rollback=make('rollback-user');db.failNextUsed()
result=await rollback({action:'membership.redeem',code:'FIRE3D-ROLLBACK'})
check('transaction failure is reported',!result.ok)
check('failed transaction does not consume the voucher',db.tables.get('vip_codes').get('voucher-rollback').status==='unused')
check('failed transaction does not grant membership',!(await rollback({action:'membership.get'})).membership.active)
check('retry after transaction failure succeeds',(await rollback({action:'membership.redeem',code:'FIRE3D-ROLLBACK'})).ok)
const throttle=make('throttle-user')
for(let i=0;i<10;i++)await throttle({action:'membership.redeem',code:'FIRE3D-NOT-EXIST'})
check('invalid code guesses are rate limited',(await throttle({action:'membership.redeem',code:'FIRE3D-NOT-EXIST'})).code==='REDEEM_RATE_LIMIT')
at+=600001
check('rate limit window eventually resets',(await throttle({action:'membership.redeem',code:'FIRE3D-NOT-EXIST'})).code==='REDEEM_NOT_FOUND')
at=extended+10*86400000
check('expired membership reads as inactive',!(await a({action:'membership.get'})).membership.active)
const old=make('legacy-user')
await db.collection('user_states').doc('old-verified-row').set({userId:'legacy-user',state})
await seed('legacy-voucher','FIRE3D-LEGACY')
await old({action:'membership.redeem',code:'FIRE3D-LEGACY'})
result=await old({action:'bootstrap'})
check('membership metadata does not hide a verified legacy financial archive',result.ok&&result.exists&&result.state.finance.assets===50000&&result.membership.active)
console.log(checks.length+' VIP redemption checks passed')
