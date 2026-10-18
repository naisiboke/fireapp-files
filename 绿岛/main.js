import './uni.scss'
import App from './App'

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

  const showRuntimeError = (error, info = '') => {
    const message = error && error.stack
      ? error.stack
      : String(error && error.message ? error.message : error)
    const content = [message, info].filter(Boolean).join('\\n\\n').slice(0, 1800)
    setTimeout(() => {
      uni.showModal({
        title: 'FIRE 英雄传运行错误',
        content: content || '未知错误，请截图反馈',
        showCancel: false,
        confirmText: '知道了',
      })
    }, 80)
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
