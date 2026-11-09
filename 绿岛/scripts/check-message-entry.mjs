import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {openMessagePage,MESSAGE_ROUTE} from '../utils/message-navigation.js'
import {membershipText,formatMembershipDate} from '../utils/membership.js'
let checks=0
const check=(v,m)=>{assert.ok(v,m);checks++}
const notices=[],logs=[],routes=[];let complete=0
openMessagePage({navigate:o=>{routes.push(o.url);o.complete()},collect:()=>{throw Error('broken cache')},notify:x=>notices.push(x),complete:()=>complete++,log:x=>logs.push(x)})
check(routes[0]===MESSAGE_ROUTE&&complete===1&&logs.includes('cache-unavailable'),'corrupt cache cannot prevent inbox navigation')
openMessagePage({navigate:o=>{o.fail();o.complete()},notify:x=>notices.push(x),complete:()=>complete++})
check(notices.length===1&&complete===2,'native navigation failure reports once and releases lock')
check(openMessagePage({navigate:()=>{throw Error('missing native route')},notify:x=>notices.push(x)})===false&&notices.length===2,'synchronous native failure cannot look like a dead tap')
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
check(JSON.parse(file('pages.json')).pages.filter(x=>'/'+x.path===MESSAGE_ROUTE).length===1,'inbox registered exactly once')
const source=file('pages/index/index.vue')
check(source.includes("openMessagePage({navigate:options=>uni.navigateTo(options)")&&source.includes('openingMessages'),'actual home uses guarded navigation')
check(!source.includes("['error','pending','restoring'")&&source.includes("['error','restoring','auth-required','conflict']"),'ordinary pending is quiet while real failures remain visible')
const locale=Date.prototype.toLocaleDateString
Date.prototype.toLocaleDateString=()=> 'Thu Nov 12 2026'
try{
 const expiry=new Date(2030,10,12,12).getTime()
 check(membershipText({membership:{active:true,expiresAt:expiry}})==='有效期至 2030年11月12日','Chinese expiry ignores WebView locale fallback')
 check(membershipText({membership:{active:true,expiresAt:expiry/1000}})==='有效期至 2030年11月12日','seconds and milliseconds share Chinese output')
 check(formatMembershipDate(NaN)==='','invalid date is not displayed')
 check(membershipText({membership:{active:false}})==='未开通','membership authority unchanged')
 check(membershipText({membership:{active:true,expiresAt:0}})==='已开通','unlimited membership has no fabricated expiry')
}finally{Date.prototype.toLocaleDateString=locale}
const sfc=file('components/CountdownSwitch.vue')
check(sfc.includes('height:32px')&&sfc.includes('background:transparent')&&!sfc.includes('color:#fff!important'),'quiet text and underline')
console.log('Message entry and locale-independent membership dates: '+checks+' checks passed')
