import {reactive} from 'vue'
import {state,persistNow} from '@/store/index.js'
import {accountId} from './account-cache.js'
import {feedbackState,hasOpenFeedback,showNotice} from './feedback.js'
import {currentPageRoute} from './session-drafts.js'
import {wishlistDue,decideWishlist} from './wishlist.js'
export const wishlistReminder=reactive({owner:null,uid:'',id:'',remaining:0,busy:false})
const seen=new Set()
const identity=(uid,id)=>uid+':'+String(id)
const pending=uid=>(state.items||[]).filter(item=>wishlistDue(item)&&!seen.has(identity(uid,item.id)))
export function beginWishlistVisit(){seen.clear();wishlistReminder.owner=null;wishlistReminder.id='';wishlistReminder.busy=false}
export function maybePromptWishlist(owner){
 const route=currentPageRoute(),uid=accountId()
 if(!['/pages/index/index','/pages/tools/index','/pages/wishlist/index'].includes(route)||!state.ready||state.cloudSync.status==='restoring'||uni.getStorageSync('fire_login_status')!==true||!uid||owner===null||feedbackState.owner!==owner||hasOpenFeedback())return false
 const items=pending(uid);if(!items.length)return false
 Object.assign(wishlistReminder,{owner,uid,id:String(items[0].id),remaining:items.length,busy:false});return true
}
export function closeWishlistReminder(){
 if(wishlistReminder.busy)return false
 const uid=wishlistReminder.uid
 pending(uid).forEach(item=>seen.add(identity(uid,item.id)))
 wishlistReminder.owner=null;wishlistReminder.id='';return true
}
export function answerWishlistReminder(purchased){
 if(wishlistReminder.busy||wishlistReminder.uid!==accountId()||wishlistReminder.owner!==feedbackState.owner)return false
 wishlistReminder.busy=true
 const uid=wishlistReminder.uid,id=wishlistReminder.id,ok=decideWishlist(state,id,purchased,persistNow)
 wishlistReminder.busy=false
 if(!ok){showNotice({title:'保存失败，请重试；当前决定尚未记录',icon:'none'});return false}
 seen.add(identity(uid,id))
 const items=pending(uid)
 if(items.length){wishlistReminder.id=String(items[0].id);wishlistReminder.remaining=items.length}
 else{wishlistReminder.owner=null;wishlistReminder.id='';wishlistReminder.remaining=0}
 return true
}
