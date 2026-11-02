import { SaveAssetRecord } from './engine.js'

// The asset balance, record, task flag and EXP are one account-state snapshot.
export function commitAssetRecord(state, entry, day, persistNow) {
  const keys=['finance','assetHistory','hero','exp','freedomPlan']
  const before=Object.fromEntries(keys.filter(key=>Object.prototype.hasOwnProperty.call(state,key))
    .map(key=>[key,JSON.parse(JSON.stringify(state[key]))]))
  const rollback=()=>{for(const key of keys){if(key in before)state[key]=before[key];else delete state[key]}}
  try {
    const result=SaveAssetRecord(state,entry,day)
    if(!result){rollback();return {saved:false,invalid:true}}
    if(!persistNow()){rollback();return {saved:false,storageFailed:true}}
    return {...result,saved:true}
  } catch(error) { rollback();return {saved:false,storageFailed:true} }
}
