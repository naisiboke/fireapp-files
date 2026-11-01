# FIRE生活 App：邮箱登录与账号同步

当前登录入口仅支持邮箱验证码。手机号、QQ、微信登录入口已经移除。

## 更新和打包

1. 下载最新源码，在包含 package.json 的“绿岛”目录执行 `npm install`。
2. 在 HBuilderX 停止旧运行任务，再重新编译/打包。
3. 用原签名证书覆盖安装 APK，保留旧版本和本机记录。在云端恢复验证成功之前不要卸载旧 App。

不再需要复制 .env.example、创建 .env.local 或填写 appSign/appAccessKey。
原先的强制 APP_CONFIG_MISSING 检查已移除。

## 接入方式

App 通过 uni.request 访问当前环境的官方 HTTPS API：
`https://ziyoukedu-d0gyrczqk4de53b87.api.tcloudbasegateway.com`

邮箱发送验证码 → 验证验证码 → 已有邮箱登录 / 新邮箱注册。
登录、刷新返回的 sub 作为当前 UID；账号数据仍由普通云函数 accountData 从 CloudBase 服务端认证上下文读取 UID。
客户端不会把邮箱或设备编号作为云端数据归属凭据。

App 不再初始化浏览器版 SDK 或官方适配器的旧移动应用签名通道。
网页继续使用原有 SDK。App 的图片下载链接也走官方带用户令牌的存储 HTTP API。

令牌只保存在本机登录会话中，过期前通过 refresh_token 刷新；并发请求共享刷新任务。
退出后清除登录凭据，并阻止迟到的刷新结果重建旧会话。
验证码不写入持久化存储。每次账号数据请求都检查 UID，保留空存档拒绝覆盖、读取失败暂停写入、修订号冲突和本机副本保护。

## 控制台

保持当前环境“身份认证 → 登录方式 → 邮箱验证码”启用即可。
本次补丁不要求重建用户、清空数据库、创建无鉴权 HTTP 路径或部署新的函数。
已部署的 accountData 仍是普通云函数，通过官方 `/v1/functions/accountData` API 携带用户 Bearer Token 调用。

若环境 OPA 策略拒绝 HTTP API，App 会提示 ACTION_FORBIDDEN / ACCESS_DENIED 等具体错误，需按当前环境策略允许已登录用户调用 accountData；不要关闭鉴权、放开整个数据库或使用管理员 API Key。
旧手机号/第三方用户不会被删除；如尚未绑定邮箱，需要核实归属后另行处理，不会自动合并到邮箱账号。

## 验证与限制

- 用现有邮箱在真实 APK 登录，确认恢复原 UID 和数据。
- 用新邮箱获取验证码，确认注册后按新 UID 初始化。
- 覆盖安装后再次读取同账号的财务、聊天和社区记录。
- 切换邮箱账号，验证私人数据隔离。
- 断网、错误验证码、过期令牌、云函数拒绝调用时，不显示同步成功，不上传空白覆盖旧存档。
- 云服务要求图形验证时，当前 App 显示明确提示；图形挑战页面尚未接入，需使用网页版完成登录或稍后重试。不能跳过服务端验证。

运行 `node scripts/check-cloudbase-platform.mjs` 检查原生请求、认证、刷新竞争和账号归属。
本次环境无法安装 npm 依赖、打 APK 或访问你的真实登录会话；隔离检查不代表真机登录已通过。

官方接口依据：
- [发送验证码](https://docs.cloudbase.net/http-api/auth/auth-send-verification)
- [验证验证码](https://docs.cloudbase.net/http-api/auth/auth-verify-verification)
- [邮箱登录](https://docs.cloudbase.net/http-api/auth/auth-sign-in)
- [新用户注册](https://docs.cloudbase.net/http-api/auth/auth-sign-up)
- [刷新令牌](https://docs.cloudbase.net/http-api/auth/auth-grant-token)
- [普通云函数 HTTP API](https://docs.cloudbase.net/en/cloud-function/function-calls/http-api)
