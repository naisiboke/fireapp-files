const cloud = require('@cloudbase/node-sdk')
const { createHandler, SERVICE_BUILD } = require('./service')
const app = cloud.init({})
// This must be an ordinary CloudBase cloud function invoked through the authenticated SDK.
// Do not publish this entry point as an unauthenticated HTTP function.
const handler = createHandler({
  db: app.database(),
  identity: async () => {
    const auth = app.auth()
    const user = auth.getUserInfo()
    if (!user.uid || user.isAnonymous) return null
    let email = ''
    try {
      const result = await auth.getEndUserInfo(user.uid)
      const info = result.userInfo || {}
      email = String(info.email || (info.platform === 'EMAIL' ? info.platformId : '') || '')
    } catch (error) { console.warn('[account-email-unavailable]', error.code || '') }
    return { uid: user.uid, email: email.toLowerCase() }
  },
})
exports.main = event => {
  const requested=String(event?.action||'')
  const action=/^[A-Za-z0-9_.:-]{1,80}$/.test(requested)?requested:'unknown'
  console.info('[account-data-request]',JSON.stringify({serviceBuild:SERVICE_BUILD||'legacy-service',action}))
  return handler(event)
}
