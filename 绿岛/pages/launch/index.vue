<template><view class="launch-page"></view></template>
<script>
let redirecting = false
function routeByState() {
  if (redirecting) return
  redirecting = true
  const hasSeenIsland = uni.getStorageSync('fire_island_onboarding_done') === true
  const hasLoggedIn = uni.getStorageSync('fire_login_status') === true
  const guestMode = uni.getStorageSync('fire_guest_mode') === true
  const url = !hasSeenIsland
    ? '/pages/onboarding/onboarding'
    : (!hasLoggedIn && !guestMode ? '/pages/login/login' : '/pages/index/index')
  uni.reLaunch({ url, fail: () => { redirecting = false } })
}
export default { onLoad() { routeByState() } }
</script>
<style>
.launch-page{position:fixed;inset:0;background:#fdfdfb}
</style>
