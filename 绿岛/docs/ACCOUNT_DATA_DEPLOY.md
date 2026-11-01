# 账号数据恢复修复：先部署云函数，再打包 APP

本次前端数据同步改为调用普通云函数 `accountData`。原来的 AI 对话、支付 HTTP 函数保持独立。App 当前通过带用户 Bearer Token 的官方 `/v1/functions/accountData` API 调用，详情见 [App 邮箱登录说明](./NATIVE_CLOUDBASE_SETUP.md)。**只重新打包 APK 不会完成修复**：未部署 accountData 时，新版会保留本机副本并暂停上传，登录恢复会提示失败，避免用空数据覆盖旧存档。

## 1. 部署 accountData

在同一个 CloudBase 环境 `ziyoukedu-d0gyrczqk4de53b87` 中：

1. 先备份/导出已有 `user_states`、`user_collections`、`community_posts`；不要清空集合。
2. 创建普通云函数（不是 HTTP Hello World），名称必须为 `accountData`，Node.js 18 或更高版本，超时设为 60 秒。
3. 上传仓库 `cloudfunctions/accountData/` 目录的全部文件，安装 package.json 依赖。若上传 ZIP，index.js、service.js、package.json 必须在 ZIP 根目录。入口是 index.main。函数执行角色需具有当前环境数据库读写权限。
4. 创建/确认这些文档集合存在：`user_states`、`user_collections`、`community_posts`、`data_backups`、`account_deletion_requests`。客户端权限均设为“无权限 ADMINONLY”；由云函数服务端 SDK 访问。
5. 为 community_posts 建立查询索引：ownerId + deleted + createdAt(倒序)；status + deleted + journey + createdAt(倒序)；status + deleted + createdAt(倒序)。按控制台提示创建缺少的组合索引。
6. 把 DeepSeek 密钥只放到该云函数环境变量 `DEEPSEEK_API_KEY`，不要放到 APP 或代码里。没有密钥时帖子仍会保存到云端，但标记为审核失败，允许重试。
7. 发布函数后，再更新 APP 源码并重新打包，使用同一邮箱/手机号登录。

此函数必须经 CloudBase 已登录 SDK 或携带用户 AccessToken 的官方普通云函数 HTTP API 调用。服务端从 auth.getUserInfo() 获取 UID，忽略客户端的 userId/clientId。不要把此入口直接改成无鉴权 HTTP 接口。普通云函数控制台测试没有真实用户上下文，返回 AUTH_REQUIRED 是预期行为。

官方参考：[云函数用户身份](https://github.com/TencentCloudBase/node-sdk/blob/master/docs/auth.md)、[服务端事务](https://docs.cloudbase.net/database/transaction)。

## 2. 旧资料恢复

新版会保存一份只读的 `fire_legacy_cache_backup_v1` 本机备份。只有云端确认的登录邮箱与旧备份邮箱一致，才会复制到该账号的独立缓存；无法确认归属时保留备份，不自动合并。卸载前未上传的旧数据，无法靠重装后的空缓存重建。

服务端只自动迁移已经明确绑定同一 UID 的单份旧 state 记录。旧版按随机设备 ID 保存的行不会被猜测归属，也不会被删除。

管理员在身份认证控制台找到旧账号的 UID，在数据库核对旧记录的账号归属。必要时，在已人工核实的旧行增加 `migrationVerifiedUid` 字段（值为该账号真实 UID），再使用恢复脚本。不要把别人的行标记到当前账号。

在有 CloudBase 管理员凭证的可信运行环境中，进入 cloudfunctions/accountData 目录，先运行预览：

```sh
TCB_ENV=环境ID TARGET_UID=账号UID SOURCE_STATE_ID=旧state文档ID SOURCE_COLLECTION_IDS='["旧集合文档ID"]' node recover-legacy.js
```

Windows PowerShell 可逐行设置参数，再运行预览：

```powershell
$env:TCB_ENV = '环境ID'
$env:TARGET_UID = '账号UID'
$env:SOURCE_STATE_ID = '旧state文档ID'
$env:SOURCE_COLLECTION_IDS = '["旧集合文档ID"]'
node recover-legacy.js
```

核对预览后，设置 `$env:APPLY_RECOVERY = 'yes'`，再运行脚本。只设置环境 ID 不等于具有管理员权限；该脚本必须在已配置管理员身份的可信环境运行。管理员凭证不能发到聊天、写进前端或提交仓库。

- 原记录始终保留，并写入 data_backups。
- 已经存在目标账号的正式存档时脚本拒绝覆盖，需要先导出两份数据再核对合并。
- 旧社区内容只恢复到“我的社区设置”，重新经过服务端审核后才公开。
- 恢复后重新登录/点击首页“重试”读取。不能把三个内置示例当成恢复成功的证据。

## 3. 验收

在真实 APK 中依次检查：
- 登录 A，填写退休计划、月预算、收支；等待首页显示“已与账号云端同步”。
- 发布一段正常经历，确认 community_posts 出现 ownerId=A 的记录且 status=approved。
- 正常覆盖安装升级：原数据、聊天和发布内容仍在。
- 完全卸载后重装，登录同一个 A：财务、记账、个人经历和收藏恢复；另一台设备看到审核通过的公共帖子。
- 切换 B：看不到 A 的私人财务/聊天/草稿，公共已发布内容仍可见。
- 断网保存：提示本机保留，不宣称云端成功；恢复网络后重试。
- 模拟云端读取失败、旧版本冲突：不能上传空白覆盖，也不能把旧快照覆盖新记录。
- 正常内容通过；乱码、辱骂、未来经历未通过；审核接口故障时帖子仍可在“我的社区设置”找到并重试。

本次修改未在开发环境执行真实云端部署，也未完成真机卸载重装测试。必须完成以上验收后再对外发布。

## 4. 回归检查

在本地已安装 Node.js 18+ 的环境中执行：

```sh
cd 绿岛
node scripts/check-account-data.mjs
node scripts/check-ledger-summary.mjs
```

account-data 脚本使用真实客户端/服务端模块和内存数据库，覆盖账号隔离、同账号重装、空快照拒绝、网络中断、保存确认丢失、异步账号切换、帖子审核及恢复。它不访问生产环境，也不能替代真实 SDK 和 APK 的验收。
