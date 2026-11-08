<template>
  <view class="guide-redirect" :style="pageLayoutStyle"><text>正在打开新手引导…</text></view>
</template>
<script>
import { pageLayoutStyle } from '@/utils/page-layout.js'
import { accountId } from '@/utils/account-cache.js'
import { requestGuideReplay } from '@/utils/spotlight-guide.js'
import { safeReturnRoute } from '@/utils/session-recovery.js'
// Compatibility entry for old bookmarks. Recovery destinations keep priority over a tour.
export default {
  computed:{pageLayoutStyle(){return pageLayoutStyle}},
  onLoad(options){
    if(uni.getStorageSync('fire_login_status')!==true){uni.reLaunch({url:'/pages/login/login'});return}
    const target=safeReturnRoute(options&&options.next)
    if(target.split('?')[0]!=='/pages/index/index'){uni.reLaunch({url:target});return}
    requestGuideReplay(accountId())
    uni.reLaunch({url:'/pages/index/index'})
  },
}
</script>
<style>
.guide-redirect{min-height:100vh;box-sizing:border-box;padding:var(--fire-page-top) 24px;background:#f2f7f1;color:#71807a;font-size:14px}
</style>
