<template>
  <view class="personality-page">
    <view class="head"><view class="back" @tap="back">‹</view><text class="title">人格测试</text><view class="close" @tap="close">×</view></view>
    <view v-if="!started && !finished" class="chooser">
      <text class="hero-title">认识自己的行为方式</text><text class="hero-sub">选择一个测试开始。完成后可把结果用于 AI 的生活建议。</text>
      <view class="test-card" @tap="start('bigfive')"><text class="test-name">大五人格 · 50题</text><text class="test-desc">开放性、尽责性、外向性、宜人性、情绪稳定性</text><text class="arrow">›</text></view>
      <view class="test-card" @tap="start('mbti')"><text class="test-name">MBTI · 100题</text><text class="test-desc">从四组偏好了解你的思考和行动方式</text><text class="arrow">›</text></view>
      <view v-if="savedBigFive || savedMbti" class="my-personality">
        <view class="my-personality-head"><text class="my-personality-title">我的性格</text><text class="my-personality-sub">最近一次测试结果</text></view>
        <view v-if="savedMbti" class="saved-result"><text class="saved-title">{{ savedMbti.title }}</text><text class="saved-summary">{{ savedMbti.summary }}</text><view v-for="row in (savedMbti.rows || [])" :key="'m-'+row.name" class="saved-row"><view class="saved-row-head"><text>{{ row.name }}</text><text>{{ row.score }}%</text></view><view class="saved-bar"><view :style="{width:row.score+'%'}"></view></view><text class="saved-copy">{{ row.copy }}</text></view></view>
        <view v-if="savedBigFive" class="saved-result"><text class="saved-title">{{ savedBigFive.title }}</text><text class="saved-summary">{{ savedBigFive.summary }}</text><view v-for="row in (savedBigFive.rows || [])" :key="'b-'+row.name" class="saved-row"><view class="saved-row-head"><text>{{ row.name }}</text><text>{{ row.score }}%</text></view><view class="saved-bar"><view :style="{width:row.score+'%'}"></view></view><text class="saved-copy">{{ row.copy }}</text></view></view>
      </view>
      <text class="notice">结果页面不会提供长期保存功能，请完成后自行截图。</text>
    </view>
    <view v-else-if="started && !finished" class="quiz">
      <view class="quiz-meta"><text>{{ type==='bigfive'?'大五人格':'MBTI' }}</text><text>{{ index + 1 }} / {{ questions.length }}</text></view>
      <view class="bar"><view :style="{width:((index+1)/questions.length*100)+'%'}"></view></view>
      <view class="question-card"><text class="question">{{ questions[index].text }}</text><text class="question-tip">请选择最符合你的程度</text></view>
      <view class="answers"><view v-for="item in scale" :key="item.value" class="answer" @tap="answer(item.value)"><text>{{ item.label }}</text></view></view>
    </view>
    <view v-else class="result">
      <text class="result-kicker">{{ type==='bigfive'?'大五人格结果':'MBTI 结果' }}</text>
      <text class="result-type">{{ resultTitle }}</text>
      <text class="result-summary">{{ resultSummary }}</text>
      <view v-for="row in resultRows" :key="row.name" class="result-row"><view class="result-row-head"><text>{{ row.name }}</text><text>{{ row.score }}%</text></view><view class="result-bar"><view :style="{width:row.score+'%'}"></view></view><text class="result-copy">{{ row.copy }}</text></view>
      <view class="screenshot-note">测试结果不会自动保存。请现在截图保存，之后可以把结果发给 AI 继续分析。</view>
      <view class="result-actions"><view class="again" @tap="start(type)">重新测试</view><view class="done" @tap="close">完成</view></view>
    </view>
  </view>
</template>
<script setup>
import { computed, ref, onMounted } from 'vue'
import { state, persist } from '@/store/index.js'
import { savePersonalityResult } from '@/utils/personality-store.js'
const scale=[{value:1,label:'非常不像我'},{value:2,label:'不太像我'},{value:3,label:'一般'},{value:4,label:'比较像我'},{value:5,label:'非常像我'}]
const bigTemplates={
 openness:['我喜欢接触陌生的观点和知识','我会主动尝试新的生活方式','我常常从不同角度思考问题','艺术、音乐或文字容易引起我的兴趣','我喜欢想象未来的各种可能','我愿意改变原有的做法','我对抽象问题有耐心','我会把日常经历联想到更大的主题','我喜欢探索不熟悉的地方','我能欣赏与自己不同的审美'],
 conscientiousness:['我会提前安排重要的事情','我通常能按计划完成任务','我会把物品和资料整理好','开始行动前我会确认细节','我能长期坚持一个目标','我会为自己的承诺负责','我习惯记录需要完成的事项','遇到困难时我会继续推进','我会复盘自己的决定','我做事时很少拖到最后'],
 extraversion:['和新认识的人交谈对我来说不难','我喜欢参加有人的活动','我会主动表达自己的想法','热闹的环境通常让我感到有能量','我愿意在团队中承担带头角色','我常常主动联系朋友','我喜欢把开心的事情分享出来','我在群体中容易找到存在感','我能自然地开启一段对话','长时间独处会让我想找人聊天'],
 agreeableness:['我会认真倾听别人的感受','别人需要帮助时我愿意搭把手','我会尽量避免无意义的争执','我容易理解别人为什么这样做','我愿意给别人留出余地','我在合作中重视彼此的感受','即使不同意我也会保持尊重','我会关注自己的话是否伤人','我愿意先寻找共同点','我通常相信别人是善意的'],
 stability:['遇到突发情况时我能保持冷静','我能较快从不愉快中恢复','压力大时我仍能分清轻重','我不会长时间反复担心同一件事','我能接受计划临时改变','面对批评时我可以客观看待','我的情绪通常比较稳定','我能在忙乱中保持清晰','我会用实际行动处理焦虑','睡前我不太会被琐事困扰']
}
const mbtiGroups=[
 {axis:'EI',positive:'E',items:['我通常会主动认识新朋友','我喜欢和别人一起讨论想法','团队活动会让我更有动力','我习惯把想法说出来再整理','我喜欢在热闹环境中工作','遇到问题我会找人商量','我愿意在群体中承担发言角色','社交后我通常感觉更有能量','我会主动分享近况','我喜欢边交流边产生新点子','我能很快融入新团队','我常常先行动再调整','独处太久会让我想联系别人','我喜欢成为活动的参与者','公开表达对我来说不难','我倾向从外界获得刺激','我会主动邀请别人一起做事','我喜欢认识不同圈子的人','讨论能帮助我确认想法','我通常不介意成为关注中心','我喜欢同步进行多人的活动','我容易把陌生人变成朋友','我会用聊天整理情绪','我期待面对面的互动','我的精力常被社交激发']},
 {axis:'SN',positive:'S',items:['我更关注事实和具体细节','我喜欢使用已经验证过的方法','我会先看眼前能做什么','我习惯用实际经验判断','说明清楚步骤会让我安心','我更相信可观察的证据','我会注意环境中的细节变化','我喜欢把目标拆成可执行任务','我通常从现实条件出发','我会先确认数据再下结论','我倾向记住具体发生过的事','我喜欢明确而直接的表达','我会优先处理当前问题','我关注事情如何落地','我更容易理解具体例子','我会比较不同方案的实际成本','经验对我的判断很重要','我习惯按照流程推进','我喜欢看得见的结果','我会留意别人话里的事实','我先解决问题再讨论可能性','我更重视当下的可靠性','细节遗漏会影响我的决定','我喜欢清晰的标准','我会从已知信息开始']},
 {axis:'TF',positive:'T',items:['做决定时我会先比较逻辑','我愿意指出方案中的问题','公平比照顾情绪更重要','我会把利弊列出来再选择','我喜欢用标准而不是感觉判断','批评一个想法不等于否定一个人','我会优先考虑长期效率','我能接受直接的反馈','争论时我会关注论据','我习惯问“这样是否有效”','我会把事情和个人情绪分开','规则一致对我很重要','我喜欢找出问题的根因','我会为了更好的结果调整立场','明确的结论比委婉更有用','我会先判断事实是否成立','我擅长发现前后矛盾','我重视能力和结果','我会用分析减少偏见','我更愿意听有证据的建议','我不会因为关系改变标准','我喜欢把复杂事情拆开','我会追问依据是什么','我倾向做客观选择','解决问题时我会保持理性']},
 {axis:'JP',positive:'J',items:['我喜欢提前安排日程','确定的计划会让我安心','我习惯按时完成任务','我喜欢把事情先做完再休息','临时变化会让我需要重新整理','我会为旅行提前准备清单','我倾向尽快做出决定','桌面和文件有固定位置','我喜欢知道下一步是什么','我会给目标设定截止日期','我更愿意遵循明确的流程','我通常不会把任务拖到最后','我喜欢把大事拆成时间表','完成计划会让我有成就感','我会提前考虑风险','我倾向保持稳定的节奏','我喜欢事情有明确结论','我会主动整理未完成事项','规则清楚时我行动更快','我愿意为计划留出缓冲','我会在开始前准备材料','我喜欢可预测的安排','我通常按优先级推进','我会定期检查进度','我希望决定后能执行到底']}
]
const savedBigFive=computed(()=>state.personalityTests&&state.personalityTests.bigfive),savedMbti=computed(()=>state.personalityTests&&state.personalityTests.mbti)
const type=ref('bigfive'),started=ref(false),finished=ref(false),index=ref(0),answers=ref([]),result=ref(null)
const questions=computed(()=>type.value==='bigfive'?Object.entries(bigTemplates).flatMap(([dimension,items])=>items.map((text,i)=>({text,dimension,reverse:i%3===0}))):mbtiGroups.flatMap(group=>group.items.map((text,i)=>({text,axis:group.axis,positive:group.positive,index:i}))))
const resultTitle=computed(()=>result.value?.title||'')
const resultSummary=computed(()=>result.value?.summary||'')
const resultRows=computed(()=>result.value?.rows||[])
function start(next){type.value=next;started.value=true;finished.value=false;index.value=0;answers.value=[];result.value=null}
function onPageLoad(options){if(options && (options.type==='bigfive' || options.type==='mbti')) start(options.type)}
function answer(value){answers.value[index.value]=value;if(index.value<questions.value.length-1){index.value++;return}finish()}
function finish(){
 let data
 if(type.value==='bigfive'){
  const names={openness:'开放性',conscientiousness:'尽责性',extraversion:'外向性',agreeableness:'宜人性',stability:'情绪稳定性'}
  const copies={openness:'你对新观点和新体验的接受度。高分适合持续探索，低分更偏好熟悉和稳定。',conscientiousness:'你把目标变成行动并持续推进的能力。高分适合长期计划，低分需要更轻量的节奏。',extraversion:'你从社交和外部互动中获得能量的程度。高分适合协作，低分更适合独处后深度工作。',agreeableness:'你理解他人、合作与维护关系的倾向。高分温和协作，低分更重视边界和直接表达。',stability:'你在压力和变化中保持稳定的能力。高分恢复更快，低分需要更多休息和情绪整理。'}
  const rows=Object.keys(names).map(k=>{const qs=questions.value.filter(q=>q.dimension===k);const score=Math.round(qs.reduce((sum,q,i)=>{const raw=answers.value[questions.value.indexOf(q)]||3;return sum+(q.reverse?6-raw:raw)},0)/(qs.length*5)*100);return{name:names[k],score,copy:copies[k]}})
  data={title:'你的大五人格画像',summary:'这是你的行为倾向参考，不是固定标签。你可以根据高分和低分调整生活方式。',rows}
 }else{
  const axes=[['EI','E','外向','内向'],['SN','S','实感','直觉'],['TF','T','思考','情感'],['JP','J','判断','感知']]
  const rows=axes.map(([axis,pos,a,b])=>{const qs=questions.value.filter(q=>q.axis===axis);const score=Math.round(qs.reduce((sum,q)=>sum+((answers.value[questions.value.indexOf(q)]||3)-3),0 )/(qs.length*2)*50+50);return{name:a+' / '+b,score,copy:'这一维度反映你在'+a+'与'+b+'之间的偏好，分数越高越偏向'+a+'。'}})
  const letters=rows.map((r,i)=>r.score>=50?axes[i][1]:axes[i][3]).join('')
  data={title:'你的 MBTI 参考类型：'+letters,summary:'MBTI 是偏好模型，不是能力诊断。结果用于自我理解，建议结合真实经历判断。',rows}
 }
 result.value=data;finished.value=true;started.value=false
 state.personalityTests={...(state.personalityTests||{}),[type.value]:data}
 state.personality={completed:true,type:type.value,result:data,completedAt:Date.now()}
 persist()
 savePersonalityResult(type.value,data).catch(error=>console.warn('[personality-cloud]',error))
}
onMounted(()=>{const pages=getCurrentPages();const current=pages[pages.length-1];onPageLoad(current?.options||{})})
function back(){if(started.value){started.value=false;return}uni.navigateBack()}
function close(){uni.switchTab({url:'/pages/index/index'})}
</script>
<style>
.personality-page{min-height:100vh;padding:calc(62px + env(safe-area-inset-top)) 18px calc(30px + env(safe-area-inset-bottom));background:#f3f7f1;color:#243830;box-sizing:border-box}.head{position:fixed;z-index:5;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 18px 0;display:flex;align-items:center;justify-content:space-between;background:#f3f7f1;border-bottom:1px solid #dfe7dd;box-sizing:border-box}.back,.close{width:40px;height:40px;display:flex;align-items:center;justify-content:center}.back{font-size:32px}.close{font-size:28px}.title{font-size:18px;font-weight:700}.chooser{padding-top:28px}.hero-title{display:block;font-size:26px;font-weight:700;margin-bottom:8px}.hero-sub{display:block;color:#71807a;line-height:1.7;font-size:13px}.test-card{position:relative;margin-top:18px;padding:20px;border-radius:16px;background:#fff;border:1px solid #e0e9df}.test-name{display:block;font-size:17px;font-weight:700}.test-desc{display:block;margin-top:7px;color:#71807a;font-size:12px;line-height:1.6;padding-right:20px}.arrow{position:absolute;right:17px;top:34px;font-size:25px;color:#8b9b8f}.notice,.screenshot-note{display:block;margin-top:24px;color:#8b9489;font-size:12px;line-height:1.7;text-align:center}.quiz{padding-top:26px}.quiz-meta{display:flex;justify-content:space-between;color:#527059;font-size:13px}.bar{height:6px;margin-top:12px;border-radius:4px;background:#dce8dc;overflow:hidden}.bar view{display:block;height:100%;background:#39705b}.question-card{margin-top:45px;padding:26px 20px;border-radius:18px;background:#fff;border:1px solid #e0e9df;min-height:180px;display:flex;flex-direction:column;justify-content:center}.question{font-size:22px;font-weight:700;line-height:1.55}.question-tip{display:block;margin-top:18px;color:#8b9489;font-size:12px}.answers{display:grid;grid-template-columns:1fr;gap:10px;margin-top:20px}.answer{height:50px;border-radius:12px;background:#e5eee4;color:#243830;display:flex;align-items:center;justify-content:center;font-size:14px}.result{padding-top:28px}.result-kicker{display:block;color:#527059;font-size:12px;letter-spacing:.12em}.result-type{display:block;margin-top:12px;font-size:29px;font-weight:700}.result-summary{display:block;margin-top:10px;color:#52605a;line-height:1.7;font-size:13px}.result-row{margin-top:20px;padding:14px;border-radius:14px;background:#fff;border:1px solid #e0e9df}.result-row-head{display:flex;justify-content:space-between;font-weight:700}.result-bar{height:7px;margin-top:10px;border-radius:5px;background:#e5eee4;overflow:hidden}.result-bar view{display:block;height:100%;background:#39705b}.result-copy{display:block;margin-top:9px;color:#71807a;font-size:12px;line-height:1.6}.screenshot-note{padding:12px;border-radius:12px;background:#fff7dc;color:#806b36}.result-actions{display:flex;gap:10px;margin-top:18px}.again,.done{flex:1;height:48px;border-radius:11px;display:flex;align-items:center;justify-content:center}.again{background:#e5eee4}.done{background:#173d35;color:#fff}

.my-personality{margin-top:24px;padding:18px;border-radius:18px;background:#fff;border:1px solid #e0e9df}.my-personality-head{display:flex;align-items:baseline;justify-content:space-between}.my-personality-title{font-size:18px;font-weight:700}.my-personality-sub{font-size:11px;color:#8b9489}.saved-result{margin-top:14px;padding-top:14px;border-top:1px solid #edf2ed}.saved-title{display:block;font-size:15px;font-weight:700}.saved-summary{display:block;margin-top:6px;color:#71807a;font-size:12px;line-height:1.6}.saved-row{margin-top:12px}.saved-row-head{display:flex;justify-content:space-between;font-size:12px;font-weight:600}.saved-bar{height:6px;margin-top:6px;border-radius:4px;background:#e5eee4;overflow:hidden}.saved-bar view{display:block;height:100%;background:#39705b}.saved-copy{display:block;margin-top:5px;color:#71807a;font-size:11px;line-height:1.5}
</style>