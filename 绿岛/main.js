import './uni.scss'
import App from './App'
import { showDialog } from './utils/feedback.js'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
import { tencentCloudConfig } from './utils/tencent-cloud.js'
export function createApp() {
	const app = createSSRApp(App)
  app.config.globalProperties.$tencentCloud = tencentCloudConfig

  let lastRuntimeErrorAt = 0
  let runtimeErrorPending = false
  const showRuntimeError = (error, info = '') => {
    console.error('[app-runtime]', error, info)
    const now = Date.now()
    if (runtimeErrorPending || now - lastRuntimeErrorAt < 10000) return
    lastRuntimeErrorAt = now
    runtimeErrorPending = true
    showDialog({
      title: '页面暂时遇到问题',
      content: '请返回后重试。如果仍然出现问题，可通过“问题反馈与奖励”联系我们。',
      showCancel: false,
      confirmText: '知道了',
    }).finally(() => { runtimeErrorPending = false })
  }

  app.config.errorHandler = (error, instance, info) => {
    showRuntimeError(error, info)
  }

  if (typeof uni.onError === 'function') {
    uni.onError(error => showRuntimeError(error))
  }

	return {
		app
	}
}
// #endif
