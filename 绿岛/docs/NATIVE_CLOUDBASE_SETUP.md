# FIRE生活 App 云服务接入修复

网页使用浏览器内置的网络、存储接口；标准 uni-app App 需要注册官方适配器。此前手写的 window/fetch/localStorage 补丁已移除，避免误用浏览器通道。

## 更新依赖

进入有 package.json 的“绿岛”目录运行：

```sh
npm install
```

新增依赖为 @cloudbase/adapter-uni-app 1.1.1，保留当前 @cloudbase/js-sdk 2.27.3。当前仓库原有 package-lock 只有根依赖声明；npm install 会在本机补齐实际依赖锁定信息。本次环境无法执行 npm 安装或 APK 打包，依赖解析需要本机验证。

## 配置 App 专用授权

按照 [CloudBase 官方 UniApp 适配器说明](https://docs.cloudbase.net/en/api-reference/webv2/adapter/uniapp-adapter) 在当前 CloudBase 环境中配置移动应用标识/凭据。使用实际 APK 的包名和签名完成控制台要求的授权绑定。

把项目内 .env.example 复制为 .env.local，填写：

```dotenv
VITE_CLOUDBASE_APP_SIGN=CloudBase提供的App标识
VITE_CLOUDBASE_APP_ACCESS_KEY_ID=CloudBase提供的凭据版本整数
VITE_CLOUDBASE_APP_ACCESS_KEY=CloudBase移动应用专用凭据
```

- 不是支付宝 AppID，也不是 DCloud 的 __UNI__ AppID。
- 不是 DeepSeek 密钥，不是腾讯云管理员 SecretId/SecretKey，也不是 ADMIN_TOKEN。
- .env.local 已加入 Git 忽略，不要提交或发送这些值。
- VITE_* 配置会编译进 APK，不能用于保存服务端秘密。仅使用 CloudBase 允许在客户端使用的移动应用专用凭据，并在控制台按包名/签名等限制使用范围。
- 三项值不可猜测。缺少时 App 明确显示 APP_CONFIG_MISSING；H5 不读取这些值、不注册原生适配器。
- 每次更改 .env.local 后停止运行任务，再重新编译/打包；仅上传云函数不会更新 APK 的配置。

## 验证

1. 先保留旧 APK 和本机记录，覆盖安装使用原证书打出的新版 APK。
2. 用 HBuilderX“运行到手机或模拟器”验证验证码登录、accountData.bootstrap、个人财务恢复及社区发布。
3. 查看 accountData 的真实调用日志，确认请求到达，UID 与当前登录用户一致。
4. App 失败时截图错误代码；例如 APP_CONFIG_MISSING、APP_RUNTIME_UNSUPPORTED 或云端返回的具体代码。错误提示不输出令牌/凭据。
5. H5 回归：验证码登录、云端恢复和原有页面继续可用。
6. 使用一台未保存本机记录的设备登录同账号，验证云端数据恢复；在确认同步成功前不要卸载原设备。

客户端保留了 expectedUid 校验、读取失败暂停写入和空存档保护，不以绕过数据恢复校验来假装登录成功。

本次源码和隔离测试不能替代真实 SDK、真实 App 凭据和 APK 的验证。
