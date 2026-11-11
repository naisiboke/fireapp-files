<template>
  <view class="personality-page fire-page-personality-index" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" />
    <view class="head"><view class="back" data-fire-press="true" @tap="back" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">‹</view><text class="title">人格测试</text><view class="close" data-fire-press="true" @tap="close" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">×</view></view>
    <view v-if="!started && !finished && !manualOpen" class="chooser">
      <text class="hero-title">认识自己的行为方式</text><text class="hero-sub">选择一个测试开始，完成后可在应用内获取结合个人情况的 AI 建议。</text>
      <view class="test-card" data-fire-press="true" @tap="start('bigfive')" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text class="test-name">大五人格 · 50题</text><text class="test-desc">开放性、尽责性、外向性、宜人性、情绪稳定性</text><text class="arrow">›</text></view>
      <view class="test-card mbti-card"><text class="test-name">MBTI</text><text class="test-desc">已知类型可直接填写，也可以答题观察偏好</text><view class="mbti-actions"><button class="mbti-manual" data-fire-press="true" @tap="openManual" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">我知道自己的类型</button><button class="mbti-quiz" data-fire-press="true" @tap="start('mbti')" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">开始答题 · 100题</button></view></view>
      <view v-if="savedBigFive || savedMbti" class="my-personality">
        <view class="my-personality-head"><text class="my-personality-title">我的性格</text><text class="my-personality-sub">最近一次测试结果</text></view>
        <view v-if="savedMbti" class="saved-result"><text class="result-source">{{savedMbti.source==='self_reported'?'自行填写':'答题结果'}}</text><text v-if="savedMbti.scoringVersion!==QUESTION_VERSION && savedMbti.source!=='self_reported'" class="legacy-result-note">此结果来自旧版问卷，可重新测试更新。</text><text class="saved-title">{{ savedMbti.title }}</text><text class="saved-summary">{{ savedMbti.summary }}</text><text v-if="savedMbti.detail" class="saved-detail">{{ savedMbti.detail }}</text><view v-for="row in (savedMbti.rows || [])" :key="'m-'+row.name" class="saved-row"><view class="saved-row-head"><text>{{ row.name }}</text><text>{{ row.score }}%</text></view><view class="saved-bar"><view :style="{width:row.score+'%'}"></view></view><text class="saved-copy">{{ row.copy }}</text></view></view>
        <view v-if="savedBigFive" class="saved-result"><text v-if="savedBigFive.scoringVersion!==QUESTION_VERSION" class="legacy-result-note">此结果来自旧版问卷，可重新测试更新。</text><text class="saved-title">{{ savedBigFive.title }}</text><text class="saved-summary">{{ savedBigFive.summary }}</text><view v-for="row in (savedBigFive.rows || [])" :key="'b-'+row.name" class="saved-row"><view class="saved-row-head"><text>{{ row.name }}</text><text>{{ row.score }}%</text></view><view class="saved-bar"><view :style="{width:row.score+'%'}"></view></view><text class="saved-copy">{{ row.copy }}</text></view></view>
      </view>
      <text class="notice">完成的测试结果会保存在「我的性格」，可返回查看。</text>
    </view>
    <view v-else-if="manualOpen" class="manual-panel">
      <text class="hero-title">填写我的 MBTI</text><text class="hero-sub">例如 INFP、ENTJ。只填写类型，不生成测试分数。</text>
      <input class="mbti-input" v-model="manualType" maxlength="8" aria-label="我的 MBTI 类型" placeholder="例如 INFP" :disabled="savingManual"/>
      <text v-if="manualError" class="assessment-error" role="alert">{{manualError}}</text>
      <button class="manual-save" data-fire-press="true" :disabled="savingManual" @tap="saveManual" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">保存类型</button>
      <button class="manual-cancel" data-fire-press="true" @tap="back" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">返回</button>
    </view>
    <view v-else-if="started && !finished" class="quiz">
      <view class="quiz-meta"><text>{{ type==='bigfive'?'大五人格':'MBTI' }}</text><text>{{ index + 1 }} / {{ questions.length }}</text></view>
      <view class="bar"><view :style="{width:((index+1)/questions.length*100)+'%'}"></view></view>
      <view class="question-card"><text class="question">{{ questions[index].text }}</text><text class="question-tip">按最近几个月的通常表现选择，没有好坏之分</text></view>
      <view class="answers"><view v-for="item in scale" :key="item.value" class="answer" data-fire-press="true" role="button" :class="{selected:answers[index]===item.value}" :aria-disabled="answerLocked" @tap="answer(item.value)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true"><text>{{ item.label }}</text></view></view>
    </view>
    <view v-else class="result"><text v-if="result?.source==='self_reported'" class="result-source">自行填写</text><text v-if="result?.qualityWarning" class="assessment-error">{{result.qualityWarning}}</text>
      <text class="result-kicker">{{ type==='bigfive'?'大五人格结果':'MBTI 结果' }}</text>
      <text class="result-type">{{ resultTitle }}</text>
      <text class="result-summary">{{ resultSummary }}</text><text v-if="resultDetail" class="result-detail">{{ resultDetail }}</text>
      <view v-for="row in resultRows" :key="row.name" class="result-row"><view class="result-row-head"><text>{{ row.name }}</text><text>{{ row.score }}%</text></view><view class="result-bar"><view :style="{width:row.score+'%'}"></view></view><text class="result-copy">{{ row.copy }}</text></view>
      <view class="result-note">结果已保存在「我的性格」。你可以在应用内让 AI 结合财务情况和性格结果提供建议。</view>
      <view class="result-actions"><view class="again" data-fire-press="true" @tap="result?.source==='self_reported'?openManual():start(type)" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">{{result?.source==='self_reported'?'修改类型':'重新测试'}}</view><view class="done" data-fire-press="true" @tap="close" hover-class="fire-pressed" :hover-start-time="0" :hover-stay-time="90" :hover-stop-propagation="true">完成</view></view>
    </view>
  </view>
</template>
<script setup>
import {computed,ref,onBeforeUnmount} from 'vue'
import {onLoad,onBackPress} from '@dcloudio/uni-app'
import {useSessionDraft} from '@/utils/session-drafts.js'
import {pageLayoutStyle} from '@/utils/page-layout.js'
import AppFeedback from '@/components/AppFeedback.vue'
import {useFeedbackPage} from '@/utils/feedback-page.js'
import {showNotice,dismissFeedback} from '@/utils/feedback.js'
import {state,persist} from '@/store/index.js'
import {savePersonalityResult} from '@/utils/personality-store.js'
import {QUESTION_VERSION,BIG_FIVE_QUESTIONS,MBTI_QUESTIONS,scorePersonality,validMbti,manualMbtiResult} from '@/utils/personality-assessment.js'
const feedbackOwnerId=useFeedbackPage({handleBack:false})
const scale=[{value:1,label:'非常不像我'},{value:2,label:'不太像我'},{value:3,label:'一般'},{value:4,label:'比较像我'},{value:5,label:'非常像我'}]
const savedBigFive=computed(()=>state.personalityTests&&state.personalityTests.bigfive),savedMbti=computed(()=>state.personalityTests&&state.personalityTests.mbti)
const type=ref('bigfive'),started=ref(false),finished=ref(false),index=ref(0),answers=ref([]),result=ref(null)
const manualOpen=ref(false),manualType=ref(''),manualError=ref(''),savingManual=ref(false),answerLocked=ref(false)
let answerTimer=null
const questions=computed(()=>type.value==='bigfive'?BIG_FIVE_QUESTIONS:MBTI_QUESTIONS)
const resultTitle=computed(()=>result.value?.title||''),resultSummary=computed(()=>result.value?.summary||''),resultDetail=computed(()=>result.value?.detail||''),resultRows=computed(()=>result.value?.rows||[])
function unlock(){clearTimeout(answerTimer);answerTimer=null;answerLocked.value=false}
function start(next){
 if(!['bigfive','mbti'].includes(next))return
 unlock();manualOpen.value=false;type.value=next;started.value=true;finished.value=false;index.value=0;answers.value=[];result.value=null
}
function openManual(){
 unlock();testDraft.clear();type.value='mbti';started.value=false;finished.value=false;manualOpen.value=true
 manualType.value=savedMbti.value?.mbtiType||validMbti(savedMbti.value?.title?.slice(0,4))||'';manualError.value=''
}
function commitResult(data){
 const previousTests=state.personalityTests,previous=state.personality
 state.personalityTests={...(state.personalityTests||{}),[type.value]:data}
 state.personality={completed:true,type:type.value,result:data,completedAt:Date.now()}
 if(!persist()){
  state.personalityTests=previousTests;state.personality=previous
  showNotice({title:'本机保存失败，请检查存储后重试',icon:'none'});return false
 }
 testDraft.clear();result.value=data;finished.value=true;started.value=false;manualOpen.value=false
 savePersonalityResult(type.value,data).catch(error=>console.warn('[personality-cloud]',error.code||error.message))
 return true
}
function saveManual(){
 if(savingManual.value)return
 manualError.value=''
 const value=validMbti(manualType.value)
 if(!value){manualError.value='请输入有效的四位 MBTI 类型，例如 INFP';return}
 savingManual.value=true;type.value='mbti';manualType.value=value
 try{commitResult(manualMbtiResult(value))}finally{savingManual.value=false}
}
function answer(value){
 if(!started.value||answerLocked.value||!Number.isInteger(value)||value<1||value>5)return
 answerLocked.value=true;answers.value[index.value]=value
 if(index.value<questions.value.length-1)index.value++
 else{
  try{commitResult(scorePersonality(type.value,answers.value))}
  catch(error){showNotice({title:error.message,icon:'none'})}
 }
 answerTimer=setTimeout(()=>{answerLocked.value=false;answerTimer=null},220)
}
function back(){
 unlock()
 if(manualOpen.value){manualOpen.value=false;return}
 if(started.value){if(index.value>0){index.value--;return}started.value=false;testDraft.clear();return}
 if(finished.value){finished.value=false;return}
 uni.navigateBack()
}
function close(){unlock();uni.switchTab({url:'/pages/index/index'})}
onLoad(options=>{if(options?.type==='bigfive'||options?.type==='mbti')start(options.type)})
onBackPress(()=>{if(dismissFeedback(feedbackOwnerId))return true;if(started.value||manualOpen.value||finished.value){back();return true}return false})
onBeforeUnmount(unlock)
const testDraft=useSessionDraft(()=>({version:QUESTION_VERSION,type:type.value,started:started.value,index:index.value,answers:answers.value,manualOpen:manualOpen.value,manualType:manualType.value}),draft=>{
 if(!['bigfive','mbti'].includes(draft?.type)||!Array.isArray(draft.answers))return
 if(draft.version!==QUESTION_VERSION){showNotice({title:'题库已更新，请重新答题。历史结果仍保留。',icon:'none'});return}
 type.value=draft.type
 if(draft.manualOpen){manualType.value=String(draft.manualType||'').slice(0,8);manualOpen.value=true;started.value=false;finished.value=false;return}
 answers.value=draft.answers.slice(0,questions.value.length).map(value=>Number.isInteger(value)&&value>=1&&value<=5?value:null)
 const firstMissing=questions.value.findIndex((_,i)=>!Number.isInteger(answers.value[i]))
 index.value=Math.min(questions.value.length-1,Math.max(0,Math.min(Number(draft.index)||0,firstMissing<0?questions.value.length-1:firstMissing)))
 started.value=!!draft.started;finished.value=false
})
</script>
<style>
.personality-page{min-height:100vh;padding:calc(62px + var(--fire-status-top, env(safe-area-inset-top))) 18px calc(30px + env(safe-area-inset-bottom));background:#f3f7f1;color:#243830;box-sizing:border-box}.head{position:fixed;z-index:5;top:0;left:0;right:0;height:calc(58px + var(--fire-status-top, env(safe-area-inset-top)));padding:var(--fire-status-top, env(safe-area-inset-top)) 18px 0;display:flex;align-items:center;justify-content:space-between;background:#f3f7f1;border-bottom:1px solid #dfe7dd;box-sizing:border-box}.back,.close{width:40px;height:40px;display:flex;align-items:center;justify-content:center}.back{font-size:32px}.close{font-size:28px}.title{font-size:18px;font-weight:700}.chooser{padding-top:28px}.hero-title{display:block;font-size:26px;font-weight:700;margin-bottom:8px}.hero-sub{display:block;color:#71807a;line-height:1.7;font-size:13px}.test-card{position:relative;margin-top:18px;padding:20px;border-radius:16px;background:#fff;border:1px solid #e0e9df}.test-name{display:block;font-size:17px;font-weight:700}.test-desc{display:block;margin-top:7px;color:#71807a;font-size:12px;line-height:1.6;padding-right:20px}.arrow{position:absolute;right:17px;top:34px;font-size:25px;color:#8b9b8f}.notice,.result-note{display:block;margin-top:24px;color:#8b9489;font-size:12px;line-height:1.7;text-align:center}.quiz{padding-top:26px}.quiz-meta{display:flex;justify-content:space-between;color:#527059;font-size:13px}.bar{height:6px;margin-top:12px;border-radius:4px;background:#dce8dc;overflow:hidden}.bar view{display:block;height:100%;background:#39705b}.question-card{margin-top:45px;padding:26px 20px;border-radius:18px;background:#fff;border:1px solid #e0e9df;min-height:180px;display:flex;flex-direction:column;justify-content:center}.question{font-size:22px;font-weight:700;line-height:1.55}.question-tip{display:block;margin-top:18px;color:#8b9489;font-size:12px}.answers{display:grid;grid-template-columns:1fr;gap:10px;margin-top:20px}.answer{height:50px;border-radius:12px;background:#e5eee4;color:#243830;display:flex;align-items:center;justify-content:center;font-size:14px}.result{padding-top:28px}.result-kicker{display:block;color:#527059;font-size:12px;letter-spacing:.12em}.result-type{display:block;margin-top:12px;font-size:29px;font-weight:700}.result-detail{display:block;margin-top:12px;padding:12px;border-radius:12px;background:#eef5ed;color:#426052;font-size:13px;line-height:1.75}.result-summary{display:block;margin-top:10px;color:#52605a;line-height:1.7;font-size:13px}.result-row{margin-top:20px;padding:14px;border-radius:14px;background:#fff;border:1px solid #e0e9df}.result-row-head{display:flex;justify-content:space-between;font-weight:700}.result-bar{height:7px;margin-top:10px;border-radius:5px;background:#e5eee4;overflow:hidden}.result-bar view{display:block;height:100%;background:#39705b}.result-copy{display:block;margin-top:9px;color:#71807a;font-size:12px;line-height:1.6}.result-note{padding:12px;border-radius:12px;background:#fff7dc;color:#806b36}.result-actions{display:flex;gap:10px;margin-top:18px}.again,.done{flex:1;height:48px;border-radius:11px;display:flex;align-items:center;justify-content:center}.again{background:#e5eee4}.done{background:#173d35;color:#fff}

.my-personality{margin-top:24px;padding:18px;border-radius:18px;background:#fff;border:1px solid #e0e9df}.my-personality-head{display:flex;align-items:baseline;justify-content:space-between}.my-personality-title{font-size:18px;font-weight:700}.my-personality-sub{font-size:11px;color:#8b9489}.saved-result{margin-top:14px;padding-top:14px;border-top:1px solid #edf2ed}.saved-title{display:block;font-size:15px;font-weight:700}.saved-summary{display:block;margin-top:6px;color:#71807a;font-size:12px;line-height:1.6}.saved-row{margin-top:12px}.saved-row-head{display:flex;justify-content:space-between;font-size:12px;font-weight:600}.saved-bar{height:6px;margin-top:6px;border-radius:4px;background:#e5eee4;overflow:hidden}.saved-bar view{display:block;height:100%;background:#39705b}.saved-detail{display:block;margin-top:8px;color:#52605a;font-size:12px;line-height:1.7}.saved-copy{display:block;margin-top:5px;color:#71807a;font-size:11px;line-height:1.5}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-personality-index > .head{height:var(--fire-header-height);padding-top:var(--fire-page-top);box-sizing:border-box}
 .fire-page-personality-index{padding-top:var(--fire-content-top)}

.mbti-actions{display:flex;gap:8px;margin-top:15px;flex-wrap:wrap}.mbti-manual,.mbti-quiz{flex:1;min-width:120px;padding:10px 8px;border:1px solid #d6e2d5;border-radius:10px;font-size:12px;line-height:1.5;background:#eef3eb;color:#244c3d}.mbti-quiz{background:#173d35;color:#fff;border-color:#173d35}
.manual-panel{padding-top:30px}.mbti-input{height:58px;margin-top:24px;padding:0 16px;box-sizing:border-box;border:1px solid #cedccc;border-radius:12px;background:#fff;font-size:24px;color:#173d35;text-transform:uppercase}
.manual-save,.manual-cancel{margin-top:16px;width:100%;min-height:46px;border-radius:11px;font-size:14px;border:0;background:#173d35;color:#fff}.manual-cancel{background:#e5eee4;color:#243830}
.assessment-error,.legacy-result-note{display:block;margin-top:12px;padding:10px 12px;border-radius:10px;background:#fff4e5;color:#8e5e2e;font-size:12px;line-height:1.6}
.result-source{display:inline-block;margin-top:12px;padding:4px 9px;border-radius:7px;background:#e5eee4;color:#527059;font-size:11px}.answer.selected{background:#ccdcca;box-shadow:inset 0 0 0 1px #6b8c71}.answer[aria-disabled="true"]{pointer-events:none}
</style>