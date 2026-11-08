import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {QUESTION_VERSION,BIG_FIVE_QUESTIONS,MBTI_QUESTIONS,scorePersonality,validMbti,manualMbtiResult} from '../utils/personality-assessment.js'
import {CONSENT_MESSAGE,consentRecord} from '../utils/login-consent.js'
import {closeLegalPage} from '../utils/legal-navigation.js'
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
let checks=0
const check=(ok,message)=>{assert.ok(ok,message);checks++}
for(const [type,questions,count,dimensions]of [['bigfive',BIG_FIVE_QUESTIONS,50,5],['mbti',MBTI_QUESTIONS,100,4]]){
 check(questions.length===count&&new Set(questions.map(q=>q.id)).size===count,'versioned unique question bank')
 check(new Set(questions.map(q=>q.text)).size===count,'no repeated statements within a test')
 for(const key of new Set(questions.map(q=>q.dimension))){
  const group=questions.filter(q=>q.dimension===key)
  check(group.some(q=>q.reverse)&&group.some(q=>!q.reverse),'explicit genuine opposite-polarity statements')
 }
 for(const target of [0,100]){
  const answers=questions.map(q=>q.reverse?(target===100?1:5):(target===100?5:1))
  check(scorePersonality(type,answers).rows.every(row=>row.score===target),'both poles score correctly across dimensions')
 }
 const neutral=scorePersonality(type,questions.map(()=>3))
 check(neutral.rows.length===dimensions&&neutral.rows.every(row=>row.score===50),'neutral is fifty, not fifty-two or sixty')
 if(type==='mbti')check(neutral.mbtiType===null&&neutral.title.includes('X'),'ties do not manufacture ESTJ')
 const missing=questions.map(()=>3);delete missing[8]
 assert.throws(()=>scorePersonality(type,missing),/未作答/);checks++
 for(const bad of [[],questions.map(()=>0),questions.map(()=>6),questions.map(()=>NaN),questions.map(()=>2.5)]){
  assert.throws(()=>scorePersonality(type,bad));checks++
 }
 check(!!scorePersonality(type,questions.map(()=>5)).qualityWarning,'uniform answers flagged')
}
for(const e of ['E','I'])for(const s of ['S','N'])for(const t of ['T','F'])for(const j of ['J','P']){
 const code=e+s+t+j,axes=['EI','SN','TF','JP']
 const answers=MBTI_QUESTIONS.map(q=>{const index=axes.indexOf(q.axis),positive=code[index]===axes[index][0];return q.reverse?(positive?1:5):(positive?5:1)})
 check(scorePersonality('mbti',answers).mbtiType===code,'correct four-axis mapping '+code)
 const manual=manualMbtiResult(' '+code.toLowerCase()+' ')
 check(manual.mbtiType===code&&manual.rows.length===0&&manual.source==='self_reported'&&manual.scoringVersion===QUESTION_VERSION,'manual source without invented scores')
}
for(const value of ['','INTP-A','ABCD','EEEE','INFP INTP','INT','INTPP'])check(!validMbti(value),'invalid manual type blocked')
assert.throws(()=>manualMbtiResult('xxxx'));checks++
check(!src('pages/personality/index.vue').includes('reverse:i%3'),'index-based reverse scoring removed')
check(src('pages/personality/index.vue').includes('draft.version!==QUESTION_VERSION'),'old answer drafts not applied to reordered questions')
check(src('pages/personality/index.vue').includes('if(!persist())'),'failed local result save does not pretend success')
check(!src('components/BottomTabs.vue').includes('class="tab-label"'),'visual tab text removed')
let auth=0,sends=0,restores=0,stored=0,mounted,route='',local={profile:{},cloudSync:{status:'synced'}}
const ref=value=>({value})
const clean=s=>s.replace(/^\s*import\s+(?:(?:[\s\S]*?)\s+from\s+)?['"][^'"\n]+['"]\s*;?/gm,'')
let script=clean(src('pages/login/login.vue').match(/<script setup>([\s\S]*?)<\/script>/)[1]).replace('import.meta.env.DEV','false').replace("import('@/utils/community-store.js')","Promise.resolve({CS:{hydrate:async()=>{}}})")
const deps={
 CONSENT_MESSAGE,consentRecord,ref,watch(){},onMounted:fn=>mounted=fn,onBeforeUnmount(){},useFeedbackPage:()=>1,showNotice(){},state:local,persist:()=>stored++,
 sendVerificationCode:async()=>{sends++;return{}},signInWithCode:async()=>{auth++;return{}},saveAuthToken:async()=>{},endAccountSession(){},hydrateFromServer:async()=>{restores++;return{loaded:true,uid:'A'}},
 safeReturnRoute:()=>'/pages/index/index',finishSessionRecovery:()=>'/pages/index/index',getCurrentPages:()=>[{options:{}}],
 uni:{getStorageSync:k=>k==='fire_login_status',setStorageSync(){},removeStorageSync(){},navigateTo:o=>route=o.url,reLaunch:o=>route=o.url},
 setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},
}
const login=new Function(...Object.keys(deps),script+';return{consentAccepted,consentError,email,code,toggleConsent,openLegal,sendCode,login,resumeLogin,allowCode(){verificationInfo={};sentEmail=account()}}')(...Object.values(deps))
mounted();await Promise.resolve()
check(login.consentAccepted.value===false&&restores===0,'default unchecked and no automatic verified-session bypass')
login.email.value='user@example.com';login.code.value='012345';login.allowCode()
await login.login();await login.resumeLogin();await login.sendCode()
check(auth===0&&restores===0&&sends===0&&login.consentError.value,'all login paths blocked before consent')
login.openLegal('terms')
check(route==='/pages/terms/index'&&!login.consentAccepted.value,'reading terms does not check consent')
login.openLegal('privacy')
check(route==='/pages/privacy/index'&&login.email.value==='user@example.com'&&login.code.value==='012345','opening policies retains form data')
login.toggleConsent()
check(login.consentAccepted.value&&!login.consentError.value,'explicit checkbox clears red error')
await login.login()
check(auth===1&&restores===1&&route==='/pages/index/index'&&local.legalConsent.version===consentRecord().version,'accepted login records consent version and enters account')
login.toggleConsent();await login.resumeLogin()
check(restores===1,'unchecking restores gate')
let depth=2,legalRoutes=[]
globalThis.getCurrentPages=()=>Array.from({length:depth},()=>({}))
globalThis.uni={getStorageSync:()=>false,navigateBack:o=>legalRoutes.push('back'),reLaunch:o=>legalRoutes.push(o.url),switchTab:o=>legalRoutes.push(o.url)}
closeLegalPage();check(legalRoutes.at(-1)==='back','legal back returns through stack')
depth=1;closeLegalPage();check(legalRoutes.at(-1)==='/pages/login/login','unauthenticated legal fallback stays public')
check(src('App.vue').includes("'pages/privacy/index', 'pages/terms/index'"),'both policies readable without login')
check(!src('pages/community/index.vue').includes('right:0;top:-27px'),'community refresh spinner not pinned right')
for(const kind of ['privacy','terms']){
 const body=src('pages/'+kind+'/index.vue').match(/<script>([\s\S]*?)<\/script>/)[1]
 const code=clean(body).replace('export default','return')
 let exits=0,feedback=false
 const inject={AppFeedback:{},feedbackPageMixin:{},LEGAL_VERSION:'test',privacySections:[],termsSections:[],dismissFeedback:()=>feedback,closeLegalPage:()=>exits++}
 const component=new Function(...Object.keys(inject),code)(...Object.values(inject))
 const vm={feedbackOwnerId:1,close:component.methods.close}
 depth=2
 check(component.onBackPress.call(vm,{from:'navigateBack'})===false&&exits===0,'programmatic return never recursively navigates '+kind)
 check(component.onBackPress.call(vm,{from:'backbutton'})===false&&exits===0,'hardware back uses native stack '+kind)
 depth=1
 check(component.onBackPress.call(vm,{from:'backbutton'})===true&&exits===1,'direct legal page returns to public fallback '+kind)
 feedback=true
 check(component.onBackPress.call(vm,{from:'backbutton'})===true&&exits===1,'feedback dialog dismissed before page navigation '+kind)
}
console.log('Consent, question-bank and manual MBTI: '+checks+' checks passed')
