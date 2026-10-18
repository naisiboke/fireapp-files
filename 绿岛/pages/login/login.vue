<template>
  <view class="login-page"><view class="login-shell">
    <text class="brand">绿岛</text><view class="avatar"><text>岛</text></view>
    <view class="intro"><text class="title">欢迎回到绿岛</text><text class="subtitle">记录你的自由计划，继续向理想生活前进</text></view>
    <view class="mode-tabs" role="tablist"><view class="mode-tab" :class="{active:mode==='email'}" role="tab" :aria-selected="mode==='email'" @tap="switchMode('email')">邮箱登录</view><view class="mode-tab" :class="{active:mode==='phone'}" role="tab" :aria-selected="mode==='phone'" @tap="switchMode('phone')">手机号登录</view></view>
    <view class="form" aria-live="polite">
      <view class="field"><text class="field-icon">⌁</text><input v-if="mode==='email'" v-model="email" class="input" type="text" maxlength="80" aria-label="邮箱" placeholder="请输入邮箱" placeholder-class="placeholder"/><input v-else v-model="phone" class="input" type="number" maxlength="11" aria-label="手机号" placeholder="请输入手机号" placeholder-class="placeholder"/></view>
      <view class="code-row"><view class="field code-field"><text class="field-icon">◇</text><input v-model="code" class="input" type="number" maxlength="6" aria-label="验证码" placeholder="请输入验证码" placeholder-class="placeholder"/></view><button class="send-code" :disabled="sending || countdown > 0" @tap="sendCode">{{ countdown > 0 ? countdown + '秒' : '获取验证码' }}</button></view>
      <view class="form-meta"><text class="forgot" @tap="toast('验证码登录不需要密码')">登录帮助</text></view>
      <button class="login-button fire-button-primary fire-button-lg" :disabled="loading" @tap="login">{{loading?'登录中…':'登录'}}</button>
    </view>
    <view class="other"><view class="divider"><view></view><text>其他方式登录</text><view></view></view><view class="social-row"><button class="social wechat fire-button-outline" @tap="toast('微信登录暂未接入')">◉ 微信登录</button><button class="social qq fire-button-outline" @tap="toast('QQ 登录暂未接入')">◆ QQ 登录</button></view></view>
    <view class="register-entry"><text>还没有账号？</text><text class="register-link" @tap="register">立即注册</text></view>
    <view class="guest-entry" @tap="skipLogin">跳过登录，直接进入</view><text class="sr-status" aria-live="polite">{{notice}}</text>
  </view></view>
</template>
<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { state, persist } from '@/store/index.js'
import { sendVerificationCode, signInWithCode, saveAuthToken } from '@/utils/cloudbase-auth.js'
const mode=ref('email'), email=ref(''), phone=ref(''), code=ref(''), loading=ref(false), sending=ref(false), countdown=ref(0), notice=ref('')
let noticeTimer=null, countdownTimer=null, verificationInfo=null
onMounted(()=>{if(uni.getStorageSync('fire_login_status')===true) uni.reLaunch({url:'/pages/index/index'})})
onBeforeUnmount(()=>{clearTimeout(noticeTimer);clearInterval(countdownTimer)})
watch(mode,()=>{code.value='';verificationInfo=null;countdown.value=0})
function toast(message){notice.value=message;uni.showToast({title:message,icon:'none',duration:2200});clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.value='',2200)}
function switchMode(next){mode.value=next}
function register(){uni.navigateTo({url:'/pages/register/register'})}
function account(){return (mode.value==='email'?email.value:phone.value).trim()}
async function sendCode(){
 if(sending.value||countdown.value>0)return
 const value=account()
 if(mode.value==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return toast('请输入正确的邮箱地址')
 if(mode.value==='phone'&&!/^1\d{10}$/.test(value))return toast('请输入正确的手机号')
 sending.value=true
 try{verificationInfo=await sendVerificationCode(mode.value,value);countdown.value=60;countdownTimer=setInterval(()=>{countdown.value-=1;if(countdown.value<=0){clearInterval(countdownTimer);countdownTimer=null}},1000);toast('验证码已发送，请查收')}
 catch(error){toast(error.message||'验证码发送失败，请重试')}
 finally{sending.value=false}
}
async function login(){
 if(loading.value)return
 const value=account()
 if(!value)return toast(mode.value==='email'?'请输入邮箱':'请输入手机号')
 if(!code.value.trim())return toast('请输入验证码')
 if(!verificationInfo)return toast('请先获取验证码')
 loading.value=true
 try{const loginState=await signInWithCode(mode.value,value,code.value.trim(),verificationInfo);await saveAuthToken(loginState);uni.setStorageSync('fire_login_status',true);uni.removeStorageSync('fire_guest_mode');state.started=true;persist();uni.reLaunch({url:'/pages/index/index'})}
 catch(error){toast(error.message||'登录失败，请重试')}
 finally{loading.value=false}
}
function skipLogin(){uni.setStorageSync('fire_guest_mode',true);state.started=true;persist();uni.reLaunch({url:'/pages/index/index'})}
</script>
<style lang="scss">
.login-page{min-height:100vh;background:#f5f7f2;padding:calc(24px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom));box-sizing:border-box}.login-shell{width:100%;max-width:440px;margin:0 auto;display:flex;flex-direction:column;align-items:center}.brand{color:#173d35;font-size:22px;font-weight:700;letter-spacing:.16em;animation:fadeUp .3s ease both}.avatar{width:76px;height:76px;margin-top:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dfece1;border:1px solid #c6dccb;color:#39705b;font-size:26px;font-weight:600;animation:fadeUp .3s .06s ease both}.intro{display:flex;flex-direction:column;align-items:center;margin-top:22px;animation:fadeUp .3s .12s ease both}.title{color:#173d35;font-size:24px;font-weight:700;line-height:1.4}.subtitle{margin-top:8px;color:#6b7c70;font-size:13px;line-height:1.6;text-align:center}.mode-tabs{width:100%;display:flex;margin-top:28px;border-bottom:1px solid #dde7dd;animation:fadeUp .3s .18s ease both}.mode-tab{flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;color:#6b7c70;font-size:14px;position:relative}.mode-tab.active{color:#173d35;font-weight:600}.mode-tab.active:after{content:'';position:absolute;left:25%;right:25%;bottom:-1px;height:2px;background:#173d35;border-radius:2px}.form{width:100%;margin-top:16px;animation:fadeUp .3s .22s ease both}.field{min-height:52px;display:flex;align-items:center;background:#fff;border:1px solid #dde7dd;border-radius:13px;margin-bottom:11px;padding:0 14px;box-sizing:border-box}.field:focus-within{border-color:#4f8068;box-shadow:0 0 0 2px rgba(79,128,104,.12)}.field-icon{width:22px;color:#4f8068;font-size:22px;text-align:center;margin-right:9px}.input{flex:1;height:50px;color:#173d35;font-size:15px;background:transparent}.placeholder{color:#a2afa5}.code-row{display:flex;align-items:stretch;gap:10px}.code-field{flex:1;margin-bottom:11px}.send-code{width:112px;min-height:52px;margin:0 0 11px;padding:0 8px;border:1px solid #b8cbb9;border-radius:13px;background:#fff;color:#173d35;font-size:12px;display:flex;align-items:center;justify-content:center}.send-code[disabled]{opacity:.55}.form-meta{height:32px;display:flex;justify-content:flex-end;align-items:center}.forgot{min-height:32px;display:flex;align-items:center;color:#6b7c70;font-size:13px}.login-button{width:100%;min-height:50px;border-radius:13px;background:#173d35;color:#fff;font-size:16px;border:0;display:flex;align-items:center;justify-content:center}.login-button:active{transform:scale(.98)}.login-button[disabled]{opacity:.7}.other{width:100%;margin-top:30px;animation:fadeUp .3s .28s ease both}.divider{display:flex;align-items:center;gap:12px;color:#91a096;font-size:12px}.divider view{flex:1;height:1px;background:#dde7dd}.social-row{display:flex;gap:12px;margin-top:14px}.social{flex:1;min-height:46px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;gap:7px;font-size:13px;border:1px solid #dde7dd}.social.wechat{color:#3baa62}.social.qq{color:#4a83c9}.register-entry{min-height:44px;margin-top:24px;display:flex;align-items:center;color:#6b7c70;font-size:13px}.register-link{color:#173d35;font-weight:600;margin-left:4px}.guest-entry{min-height:44px;margin-top:8px;display:flex;align-items:center;justify-content:center;color:#527059;font-size:13px}.sr-status{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
</style>