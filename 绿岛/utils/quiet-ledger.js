
import { LocalDay, LedgerCategoryLabel, SaveMonthlyTargets, SaveExpense, DeleteExpense } from './engine.js'
const copy=value=>JSON.parse(JSON.stringify(value))
function commit(state,keys,change,persistNow){
 const before=Object.fromEntries(keys.map(key=>[key,{exists:Object.prototype.hasOwnProperty.call(state,key),value:state[key]===undefined?undefined:copy(state[key])}]))
 try{const result=change();if(!result||persistNow()===false)throw Error('SAVE_FAILED');return result}
 catch(error){for(const key of keys){if(before[key].exists)state[key]=before[key].value;else delete state[key]}return false}
}
export function defaultLedgerDraft(month,day=LocalDay()){
 const date=day.slice(0,7)===month?day:month+'-01'
 return{type:'expense',category:'food',amount:'',date,note:'',necessity:null}
}
export function validLedgerDate(date,month,day=LocalDay()){
 if(!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(date))||date>day||date.slice(0,7)!==month)return false
 const [year,m,d]=date.split('-').map(Number)
 return d<=new Date(year,m,0).getDate()
}
export function commitMonthlyPlan(state,month,expense,income,persistNow){
 if(![expense,income].every(value=>/^\d{1,9}(\.\d{1,2})?$/.test(String(value).trim())&&Number(value)>0&&Number(value)<=100000000))return false
 return commit(state,['monthlyTargets'],()=>SaveMonthlyTargets(state,month,expense,income),persistNow)
}
export function commitLedgerRecord(state,month,draft,persistNow,day=LocalDay()){
 if(!validLedgerDate(draft.date,month,day))return false
 return commit(state,['ledger','hero','exp'],()=>{
  if(!SaveExpense(state,draft,day,false))return false
  return draft.id?(state.ledger||[]).find(row=>row.id===draft.id):state.ledger[state.ledger.length-1]
 },persistNow)
}
export function removeLedgerRecord(state,id,persistNow,at=Date.now()){
 return commit(state,['ledger','deletions'],()=>{
  if(!DeleteExpense(state,id))return false
  state.deletions=state.deletions||[];state.deletions.push({kind:'ledger',id:String(id),at})
  return true
 },persistNow)
}
export function expenseDistribution(state,records){
 const total=records.reduce((sum,row)=>sum+row.cents,0),groups=new Map()
 for(const row of records){
  const label=LedgerCategoryLabel(state,row),key=label==='其他'?'other':row.category
  if(!groups.has(key))groups.set(key,{key,label,cents:0})
  groups.get(key).cents+=row.cents
 }
 const sorted=[...groups.values()].sort((a,b)=>b.cents-a.cents)
 const visible=sorted.length>4?sorted.slice(0,3).concat([{key:'remainder',label:'其余',cents:sorted.slice(3).reduce((sum,x)=>sum+x.cents,0)}]):sorted
 return visible.map((item,index)=>({...item,percent:total?item.cents/total*100:0,color:['#7a8e7e','#a1afa1','#bdc6ba','#dce0d8'][index]}))
}
export function shareOf(cents,total){return total>0?(cents/total*100).toFixed(1).replace(/\.0$/,'')+'%':'—'}
