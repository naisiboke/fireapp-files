// Run: node scripts/check-ai-profile-privacy.mjs
// Verifies real AI page behavior with a mocked API; does not call an AI provider.
import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const checks=[]
function check(name,condition){assert.ok(condition,name);checks.push(name)}
const state={
 membership:{active:true},
 finance:{assets:123456789,income:50123,expense:30234,monthlyDeposit:19889},
 personalityTests:{mbti:{title:'INTJ',detail:'PRIVATE_PERSONALITY_REPORT',rows:[{name:'EI',score:47}]}},
}
const calls=[],chats=[]
let windowHeight=800,keyboardHandler=null
const script=source('pages/ai/index.vue').match(/<script>([\s\S]*?)<\/script>/)[1]
 .replace(/^import .*$/gm,'').replace('export default','return')
const deps={accountId:()=> 'account-A',AppFeedback:{},FireOverlay:{},feedbackPageMixin:{},showNotice(){},dismissFeedback(){},state,persist(){},
 hasValidFinance:()=>true,freedomResult:()=>({date:'2040-01-01',months:160}),LocalDay:{},
 askBehaviorAI:async payload=>{calls.push(payload);return {reply:'建议先梳理支出，并设置每周复盘时间。'}},
 isMembershipActive:()=>state.membership.active===true,loadAIChats:async()=>[],saveAIChats:async value=>chats.push(JSON.parse(JSON.stringify(value))),
 uni:{getWindowInfo:()=>({windowHeight}),onKeyboardHeightChange:callback=>keyboardHandler=callback},
 setTimeout:callback=>callback(),
}
const page=new Function(...Object.keys(deps),script)(...Object.values(deps))
const vm={...page.data(),$nextTick:callback=>callback()}
for(const [name,method] of Object.entries(page.methods))vm[name]=method.bind(vm)
vm.ready=true;vm.isMember=true;vm.currentChatId='privacy-test'
let task
vm.send=()=>{task=page.methods.send.call(vm);return task}
vm.sendProfile();await task
check('one AI request is sent',calls.length===1)
check('request contains the financial context for analysis',calls[0].finance.assets===123456789)
check('request contains structured personality context',calls[0].personality.mbti.detail==='PRIVATE_PERSONALITY_REPORT')
const visible=JSON.stringify(vm.messages)
check('user bubble contains an analysis request',vm.messages[0].text.includes('请结合我的财务情况和性格测试结果'))
check('raw financial amount is not echoed in chat',!visible.includes('123456789'))
check('full personality report is not echoed in chat',!visible.includes('PRIVATE_PERSONALITY_REPORT'))
check('saved chat does not duplicate the raw report',!JSON.stringify(chats).includes('PRIVATE_PERSONALITY_REPORT'))
check('AI response remains visible',vm.messages.some(message=>message.role==='assistant'&&message.text.includes('梳理支出')))
state.membership.active=false;vm.isMember=false;vm.freeUsed=3;vm.sendProfile();await task
check('existing free quota guard remains effective',calls.length===1)
check('test results retain their saved-result sections',source('pages/personality/index.vue').includes('savedBigFive || savedMbti'))
check('test no longer instructs users to screenshot or export reports',!source('pages/personality/index.vue').includes('请现在截图')&&!source('pages/personality/index.vue').includes('请完成后自行截图'))

const fullAnswer=Array.from({length:12},(_,i)=>'第'+i+'项建议：保留完整文字和段落。').join('\n')
check('long answers retain all sentences and line breaks',vm.formatAnswer(fullAnswer)===fullAnswer)
vm.setupViewport()
check('visible page height initially matches the real window',vm.viewportHeight===800)
vm.focusComposer()
keyboardHandler({height:300})
check('keyboard overlay leaves only the available page height',vm.viewportHeight===500)
windowHeight=500;vm.resizeViewport(500)
check('native resize does not subtract keyboard height twice',vm.viewportHeight===500)
windowHeight=800;keyboardHandler({height:0});vm.inputFocused=false
check('hiding keyboard restores the page height',vm.viewportHeight===800)
vm.resizeViewport(420)
check('small or rotated windows remain bounded',vm.viewportHeight===420&&vm.baseWindowHeight===420)
check('scroll target is the bottom anchor rather than the top of a long answer',vm.lastMessageId==='chat-bottom')

console.log(checks.length+' AI profile privacy and viewport checks passed')
