export const MESSAGE_ROUTE='/pages/messages/index'
export function openMessagePage({navigate,collect,notify,complete=()=>{},log=()=>{}}){
 // A broken local cache must not prevent the user from opening the inbox.
 try{collect?.()}catch(error){log('cache-unavailable')}
 let finished=false
 const finish=()=>{if(!finished){finished=true;complete()}}
 const fail=()=>{log('navigation-failed');notify('暂时无法打开消息，请稍后重试');finish()}
 try{
  navigate({url:MESSAGE_ROUTE,fail,complete:finish})
  return true
 }catch(error){fail();return false}
}
