const DAY=86400000
export function wishlistBucket(item){if(['success','ended','abandoned','transferred'].includes(item?.status))return 'success';return item?.status==='bought'?'bought':'active'}
export function coolingEnd(item){return Number(item?.created||0)+Math.max(1,Number(item?.days)||7)*DAY}
export function wishlistDue(item,at=Date.now()){return wishlistBucket(item)==='active'&&(item.status==='failed'||item.needsConfirmation===true||coolingEnd(item)<=at)}
export function wishlistReason(item){return item?.resolution==='early'||item?.status==='ended'?'提前结束，决定不买':'到期未购买'}
export function wishlistCommit(state,change,persistNow){
 const before=JSON.parse(JSON.stringify({items:state.items||[],deletions:state.deletions||[]}))
 try{const result=change();if(result===false||persistNow()===false)throw Error('SAVE_FAILED');return result||true}catch(error){state.items=before.items;state.deletions=before.deletions;return false}
}
export function createWishlist(state,form,persistNow,at=Date.now()){
 const name=String(form.name||'').trim(),amount=Number(form.amount),days=Number(form.days)
 if(!name||name.length>80||!Number.isFinite(amount)||amount<=0||amount>1e9||Math.abs(amount*100-Math.round(amount*100))>0.00001||![3,7,30].includes(days))return false
 return wishlistCommit(state,()=>{const item={id:'item-'+at+'-'+Math.random().toString(36).slice(2,9),name,amount,days,category:form.category||'other',created:at,status:'active',note:''};state.items=state.items||[];state.items.push(item);return item},persistNow)
}
export function decideWishlist(state,id,purchased,persistNow,at=Date.now()){
 return wishlistCommit(state,()=>{const item=(state.items||[]).find(x=>String(x.id)===String(id));if(!item||wishlistBucket(item)!=='active')return false;const due=wishlistDue(item,at);item.status=purchased?'bought':'success';item.resolution=purchased?'purchased':due?'expired':'early';item.updated=at;item.resolvedAt=at;delete item.needsConfirmation;return true},persistNow)
}
export function removeWishlist(state,id,persistNow,at=Date.now()){
 return wishlistCommit(state,()=>{const index=(state.items||[]).findIndex(x=>String(x.id)===String(id));if(index<0)return false;state.items.splice(index,1);state.deletions=state.deletions||[];state.deletions.push({kind:'wishlist',id:String(id),at});return true},persistNow)
}
