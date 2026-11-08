
const pending=new Map()
export function offerLedgerDraft(uid,month,draft){
 if(!uid||!draft||(!String(draft.amount||'').trim()&&!String(draft.note||'').trim()))return false
 const ticket=Date.now()+'-'+Math.random().toString(36).slice(2)
 pending.set(uid,{ticket,month,draft:JSON.parse(JSON.stringify(draft))})
 return ticket
}
export function takeLedgerDraft(uid,month){
 const value=pending.get(uid)
 if(!value||value.month!==month)return null
 pending.delete(uid)
 return JSON.parse(JSON.stringify(value.draft))
}
export function cancelLedgerDraft(uid,ticket){if(pending.get(uid)?.ticket===ticket)pending.delete(uid)}
