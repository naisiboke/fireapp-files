<template>
  <view class="login-page fire-page-login-login" :style="pageLayoutStyle">
    <AppFeedback :owner-id="feedbackOwnerId" /><view class="login-shell">
    <text class="brand">Fire生活</text><view class="avatar"><text>岛</text></view>
    <view class="intro"><text class="title">欢迎回到Fire生活</text><text class="subtitle">记录你的自由计划，继续向理想生活前进</text></view>
    <view v-if="sessionExpired" class="expired-note">登录已过期，本机记录已保留。登录原邮箱即可恢复同步。</view>
    <button v-if="canResume && !(loading && loginAction==='login')" class="resume-button" :disabled="loading" :aria-busy="loading && loginAction==='resume'" @tap="resumeLogin"><view class="login-button-content"><LoadingSpinner v-if="loading && loginAction==='resume'" :size="18" label="正在恢复登录"/><text>{{loading && loginAction==='resume'?'恢复中':'已验证邮箱，继续进入'}}</text></view></button>
    <view class="email-heading">邮箱验证码登录</view>
    <view class="form" aria-live="polite">
      <view class="field"><input v-model="email" :disabled="loading || sending" class="input" type="text" maxlength="80" aria-label="邮箱" placeholder="请输入邮箱" placeholder-class="placeholder"/></view>
      <view class="code-row"><view class="field code-field"><input :value="code" @input="code=String($event.detail?.value ?? $event.target?.value ?? '').slice(0,6)" class="input" type="number" maxlength="6" aria-label="验证码" placeholder="请输入验证码" placeholder-class="placeholder"/></view><button class="send-code" :disabled="sending || countdown > 0" @tap="sendCode">{{ countdown > 0 ? countdown + '秒' : '获取验证码' }}</button></view>
      <view class="form-meta"><text class="forgot" @tap="toast('验证码登录不需要密码')">登录帮助</text></view>
      <view class="consent-row" :class="{'consent-error':consentError}">
        <view class="consent-check" role="checkbox" :aria-checked="consentAccepted" aria-label="同意用户协议和隐私政策" tabindex="0" @tap.stop="toggleConsent" @keydown.space.prevent="toggleConsent" @keydown.enter.prevent="toggleConsent"><text aria-hidden="true">{{consentAccepted?'✓':''}}</text></view>
        <view class="consent-copy"><text @tap="toggleConsent">我已阅读并同意</text><text class="consent-link" role="link" @tap.stop="openLegal('terms')">《用户协议》</text><text>和</text><text class="consent-link" role="link" @tap.stop="openLegal('privacy')">《隐私政策》</text></view>
      </view>
      <text v-if="consentError" class="consent-message" role="alert">{{CONSENT_MESSAGE}}</text>
      <button class="login-button fire-button-primary fire-button-lg" :disabled="loading" :aria-busy="loading && loginAction==='login'" @tap="login"><view class="login-button-content"><LoadingSpinner v-if="loading && loginAction==='login'" :size="18" light label="正在登录"/><text>{{loading && loginAction==='login'?'登录中':'登录'}}</text></view></button>
    </view>
    <view class="register-entry"><text>首次使用？输入邮箱获取验证码即可注册</text></view>
    <view class="required-note">登录后才能进入Fire生活，数据会安全同步到你的账号</view><button v-if="isDev" class="test-login" @tap="fillAdmin">测试管理员邮箱</button><text class="sr-status" aria-live="polite">{{notice}}</text>
  </view></view>
</template>
<script setup>
import { CONSENT_MESSAGE, consentRecord } from '@/utils/login-consent.js'
import { pageLayoutStyle } from '@/utils/page-layout.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import AppFeedback from '@/components/AppFeedback.vue'
import { useFeedbackPage } from '@/utils/feedback-page.js'
import { showNotice } from '@/utils/feedback.js'
const feedbackOwnerId = useFeedbackPage()
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { state, persist, hydrateFromServer, endAccountSession } from '@/store/index.js'
import { sendVerificationCode, signInWithCode, saveAuthToken } from '@/utils/cloudbase-auth.js'
const loginAction=ref('')
const consentAccepted=ref(false),consentError=ref(false)
function toggleConsent(){if(loading.value||sending.value)return;consentAccepted.value=!consentAccepted.value;if(consentAccepted.value)consentError.value=false}
function requireConsent(){if(consentAccepted.value)return true;consentError.value=true;return false}
function openLegal(kind){uni.navigateTo({url:kind==='terms'?'/pages/terms/index':'/pages/privacy/index'})}
const email=ref(''), code=ref(''), loading=ref(false), sending=ref(false), countdown=ref(0), notice=ref(''), redirect=ref('')
import { safeReturnRoute, finishSessionRecovery } from '@/utils/session-recovery.js'
const sessionExpired=ref(false),canResume=ref(false)
const isDev = import.meta.env.DEV
const ADMIN_TEST_EMAIL = '3263383331@qq.com'
let noticeTimer=null, countdownTimer=null, verificationInfo=null, sentEmail=''
onMounted(()=>{
 const pages=getCurrentPages(); const current=pages[pages.length-1]; const options=(current&&current.options)||{}; redirect.value=safeReturnRoute(options.redirect);sessionExpired.value=options.expired==='1';if(sessionExpired.value)email.value=String(uni.getStorageSync('fire_account_email')||'');
 canResume.value=uni.getStorageSync('fire_login_status')===true

})
onBeforeUnmount(()=>{clearTimeout(noticeTimer);clearInterval(countdownTimer)})
watch(email,()=>{code.value='';verificationInfo=null;sentEmail=''})
function toast(message){notice.value=message;showNotice({title:message,icon:'none',duration:2200});clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.value='',2200)}
function fillAdmin(){email.value=ADMIN_TEST_EMAIL;toast('已填入测试邮箱，请获取验证码')}
function account(){return email.value.trim().toLowerCase()}
async function sendCode(){
 if(sending.value||countdown.value>0)return
 if(!requireConsent())return
 const value=account()
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return toast('请输入正确的邮箱地址')
 sending.value=true
 try{const received=await sendVerificationCode('email',value);if(value!==account())return toast('邮箱已修改，请重新获取验证码');verificationInfo=received;sentEmail=value;countdown.value=60;countdownTimer=setInterval(()=>{countdown.value-=1;if(countdown.value<=0){clearInterval(countdownTimer);countdownTimer=null}},1000);toast('验证码已发送，请查收')}
 catch(error){toast(error.message||'验证码发送失败，请重试')}
 finally{sending.value=false}
}
async function enterAccount(value){
 const restored=await hydrateFromServer()
 if(!restored.loaded){toast(restored.error?.message||'账号资料暂未恢复，本机记录已保留，请重试');return}
 value=String(restored.email||value||state.profile?.email||'')
 if(value)uni.setStorageSync('fire_account_email',value)
 uni.removeStorageSync('fire_guest_mode')
 state.profile={...(state.profile||{}),email:value};state.legalConsent=consentRecord();state.started=true;persist()
 await import('@/utils/community-store.js').then(({CS})=>CS.hydrate()).catch(()=>{})
 const target=finishSessionRecovery(restored.uid,redirect.value)
 const destination=restored.conflict?'/pages/sync-conflict/index?next='+encodeURIComponent(target):target
 uni.reLaunch({url:destination})
}
async function resumeLogin(){
 if(loading.value)return
 if(!requireConsent())return
 loginAction.value='resume';loading.value=true
 try{await enterAccount(String(uni.getStorageSync('fire_account_email')||email.value||''))}
 catch(error){toast(error.message||'恢复失败，本机记录已保留，请重试')}
 finally{canResume.value=uni.getStorageSync('fire_login_status')===true;loading.value=false;loginAction.value=''}
}
async function login(){
 if(loading.value)return
 if(!requireConsent())return
 const value=account()
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return toast('请输入正确的邮箱地址')
 if(!String(code.value??'').trim())return toast('请输入验证码')
 if(!verificationInfo||sentEmail!==value)return toast('请先获取当前邮箱的验证码')
 loginAction.value='login';loading.value=true
 try{
   const loginState=await signInWithCode('email',value,String(code.value??'').trim(),verificationInfo)
   endAccountSession();uni.setStorageSync('fire_login_status',false)
   await saveAuthToken(loginState);uni.setStorageSync('fire_login_status',true)
   canResume.value=true
   await enterAccount(value)
 }catch(error){
   const detail=error&&(error.message||error.errMsg||error.error_description||error.error)
   toast(detail||'登录失败，请重新获取验证码后重试')
   console.error('[email-login]',error)
 }finally{canResume.value=uni.getStorageSync('fire_login_status')===true;loading.value=false;loginAction.value=''}
}
</script>
<style lang="scss">
.login-page{min-height:100vh;background:#f5f7f2;padding:calc(24px + var(--fire-status-top, env(safe-area-inset-top))) 20px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box}.login-shell{width:100%;max-width:440px;margin:0 auto;display:flex;flex-direction:column;align-items:center}.brand{color:#173d35;font-size:22px;font-weight:700;letter-spacing:.16em;animation:fadeUp .3s ease both}.avatar{width:76px;height:76px;margin-top:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dfece1;border:1px solid #c6dccb;color:#39705b;font-size:26px;font-weight:600;animation:fadeUp .3s .06s ease both}.intro{display:flex;flex-direction:column;align-items:center;margin-top:22px;animation:fadeUp .3s .12s ease both}.title{color:#173d35;font-size:24px;font-weight:700;line-height:1.4}.subtitle{margin-top:8px;color:#6b7c70;font-size:13px;line-height:1.6;text-align:center}.email-heading{width:100%;margin-top:28px;color:#173d35;font-size:15px;font-weight:600}.form{width:100%;margin-top:16px;animation:fadeUp .3s .22s ease both}.field{min-height:52px;display:flex;align-items:center;background:#fff;border:1px solid #dde7dd;border-radius:13px;margin-bottom:11px;padding:0 14px;box-sizing:border-box}.field:focus-within{border-color:#4f8068;box-shadow:0 0 0 2px rgba(79,128,104,.12)}.field-icon{width:22px;color:#4f8068;font-size:22px;text-align:center;margin-right:9px}.input{flex:1;height:50px;color:#173d35;font-size:15px;background:transparent}.placeholder{color:#a2afa5}.code-row{display:flex;align-items:stretch;gap:10px}.code-field{flex:1;margin-bottom:11px}.send-code{width:112px;min-height:52px;margin:0 0 11px;padding:0 8px;border:1px solid #b8cbb9;border-radius:13px;background:#fff;color:#173d35;font-size:12px;display:flex;align-items:center;justify-content:center}.send-code[disabled]{opacity:.55}.form-meta{height:32px;display:flex;justify-content:flex-end;align-items:center}.forgot{min-height:32px;display:flex;align-items:center;color:#6b7c70;font-size:13px}.login-button{width:100%;min-height:50px;border-radius:13px;background:#173d35;color:#fff;font-size:16px;border:0;display:flex;align-items:center;justify-content:center}.login-button:active{transform:scale(.98)}.login-button[disabled]{opacity:.9}.login-button:disabled:active{transform:none}.login-button-content{display:flex;align-items:center;justify-content:center;gap:9px;min-height:24px;line-height:1.4}.register-entry{min-height:44px;margin-top:24px;display:flex;align-items:center;color:#6b7c70;font-size:13px}.required-note{display:block;margin-top:18px;color:#71807a;font-size:12px;line-height:1.6;text-align:center}.test-login{min-height:34px;margin-top:10px;border:1px dashed #b8cbb9;border-radius:17px;background:transparent;color:#527059;font-size:12px}.sr-status{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}

/* Shared status-bar inset and 12px content gap; keep bottom navigation fixed. */
 .fire-page-login-login{padding-top:var(--fire-page-top)}
.expired-note{width:100%;box-sizing:border-box;margin-top:20px;padding:12px 14px;border-radius:12px;background:#e5eee2;color:#3c604d;font-size:13px;line-height:1.6}
.resume-button{width:100%;min-height:44px;margin-top:18px;padding:10px 14px;border-radius:12px;background:#e5eee2;color:#315f4a;font-size:14px}

.consent-row{display:flex;align-items:flex-start;gap:8px;margin:8px 0 12px;padding:8px 6px;border:1px solid transparent;border-radius:10px;box-sizing:border-box}
.consent-check{flex-shrink:0;width:24px;height:24px;margin-top:0;border:1.5px solid #8c9d90;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;background:#fff;box-sizing:border-box;position:relative}
.consent-check:before{content:'';position:absolute;inset:-10px}.consent-check[aria-checked="true"]{background:#173d35;border-color:#173d35}
.consent-check text{font-size:17px;font-weight:700;line-height:1}
.consent-copy{font-size:12px;color:#68786d;line-height:24px;flex:1;min-width:0}
.consent-link{color:#1768c4;text-decoration:underline;text-underline-offset:2px}
.consent-error{border-color:#c64c45;background:#fff7f5}.consent-error .consent-check{border-color:#c64c45}
.consent-message{display:block;margin:-3px 0 12px;color:#b8332d;font-size:12px;line-height:1.6}
/* Keep the retained login form visible immediately after returning from either document. */
.login-shell .brand,.login-shell .avatar,.login-shell .intro,.login-shell .form{animation:none}
</style>