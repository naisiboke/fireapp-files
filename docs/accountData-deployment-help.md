accountData 云函数部署与错误排查
版本：2026-11-08-accountData-diagnostics-1

已从代码确认的情况
- App 昵称请求 action 为 profile.nickname，当前服务源码包含该操作。
- UNKNOWN_ACTION 表示函数已经收到请求，但运行中的代码不认识该操作。需要核对线上入口、服务文件、环境和版本，不等同于网络断开。
- DATABASE_REQUEST_FAILED 只能说明数据库步骤失败。仅凭 App 截图和200调用统计，不能确认是缺集合、缺索引还是权限配置问题。
- 本包包含完整的入口和服务文件，并加入只读版本检测及安全诊断日志；没有修改云端现有数据或自动改变数据库配置。

正确部署
1. 在腾讯云选择 App 固定使用的环境：ziyoukedu-d0gyrczqk4de53b87。
2. 打开名为 accountData 的云函数（注意大小写），先备份原代码。
3. 解压本包，把 index.js、service.js、action-rewards.js、recover-legacy.js、package.json 五个文件一起覆盖到该函数根目录。
   不要把压缩包或整个目录拖进去形成第二层 accountData 文件夹。
   index.js 必须 require('./service')，不能继续执行旧的内嵌处理器。
4. 函数入口为 index.main；运行环境按 package.json 使用 Node.js 18 或以上。依赖为 @cloudbase/node-sdk 3.18.3；如控制台提示安装依赖，使用云端安装。
5. 保留已有 DEEPSEEK_API_KEY 环境变量。函数超时建议60秒；不要把密钥复制到App。
6. 点击“部署”，等待成功，再在“版本及流量”核对 App 实际访问的版本。只保存编辑器文件不等于线上版本已切换。

不用按日志时间猜版本
部署后点击页面右上“测试”，输入以下JSON事件：
{"action":"service.info"}

这是只读版本检测，不读取数据库，不需要用户验证码，不调用AI。预期返回：
{"ok":true,"serviceBuild":"2026-11-08-accountData-diagnostics-1","capabilities":["profile.nickname","posts.submit","posts.public","ai.chat","bootstrap"],"chatMaxTokens":500}

如果返回 UNKNOWN_ACTION、AUTH_REQUIRED 或没有上述 serviceBuild，说明本次测试尚未执行本包的新服务，应继续检查入口、环境、部署版本和流量配置。
版本检测成功只证明新代码已加载，不能代替昵称/数据库实际保存的业务验证。

对应 App 操作找日志
- 点“实时日志”，在App只点击一次“审核并保存昵称”或“提交审核”。
- 找新出现的 [account-data-request]，里面应有新 serviceBuild 与 action（profile.nickname 或 posts.submit）。
- 如失败，同一请求会有 [account-data] 记录，含 code、collection、operation、reason，可能还包含数据库 requestId。
- 用同一次调用的请求ID对应记录，不要只按电脑或模拟器的钟点判断。截图中的 Report RequestId 和200只说明函数调用完成，业务返回仍可能是 ok:false。
- 日志不记录邮箱、验证码、访问令牌、昵称、正文、财务金额或完整数据库请求内容。

数据库检查按诊断结果进行
当前代码使用的集合：account_deletion_requests、action_reward_claims、action_rewards、community_posts、data_backups、user_collections、user_states、vip_codes。
这里只列出代码依赖，不代表你的云端一定缺少这些集合。
- reason=COLLECTION_MISSING：检查 collection 指向的集合是否存在；仅在确认缺失时创建空集合，不删除原集合。
- reason=INDEX_REQUIRED：按云开发数据库的错误提示配置缺少的索引；不要凭截图猜字段。
- reason=ACCESS_DENIED：检查函数环境、执行身份和数据库访问权限，不要为了消除报错开放所有用户写权限。
- operation=post-backup 且 collection=data_backups：失败发生在编辑旧帖前保存备份的步骤。
- reason=CHECK_DATABASE_LOG 或没有集合步骤：需要查看对应数据库请求的详细日志，不能据此确定根因。

App 提示说明
仓库中的 utils/cloudbase-platform.js 也已修正“所有业务错误都显示连接失败”的问题。
若希望App直接显示部署版本或集合诊断提示，可另外覆盖该文件并重新打包；先部署本云函数包即可在控制台看到上述诊断，无需等待新APK。
昵称和社区审核继续保留，聊天仍是单次调用、max_tokens=500。

回报排查结果
请只提供 service.info 返回值，以及失败那次日志中的 serviceBuild、action、code、collection、operation、reason、requestId。
不要提供验证码、访问令牌、API密钥或用户财务内容。
