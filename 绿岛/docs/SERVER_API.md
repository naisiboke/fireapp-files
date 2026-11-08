# accountData 当前部署与排查

App 的账户、昵称和社区操作使用已认证的 CloudBase accountData 云函数。环境为 `ziyoukedu-d0gyrczqk4de53b87`。
配置旧的 `fire_api_base_url` 不能解决当前 accountData 的 UNKNOWN_ACTION。

- 入口：`cloudfunctions/accountData/index.js`，加载同目录 `service.js`。
- 昵称：`profile.nickname`。
- 社区：`posts.submit`、`posts.public`、`posts.mine`、`posts.delete`。
- 聊天：`ai.chat`，单次模型调用，输出参数 `max_tokens=500`。
- 账户：`bootstrap`、`state.save`、`collection.read`、`collection.save`。
- 只读版本检测：控制台测试 `{"action":"service.info"}`。只返回版本与功能列表，不读取账户或数据库。
- 私有数据操作仍验证登录身份与 expectedUid，客户端不能指定其他用户来读取存档。
- 云端错误日志只记录版本、操作、错误码和安全的数据库步骤，不记录用户内容或凭证。

完整部署、集合检查和实时日志步骤见仓库 `docs/accountData-deployment-help.md`。
`updates/accountData-deploy-20261108.zip` 包含可直接覆盖到函数根目录的五个源文件和部署说明。
