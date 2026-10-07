# FIRE 绿岛云端 API 对接清单

当前前端已经统一通过 `utils/api-service.js` 访问云端。仓库中目前没有可用的业务 API 地址，所以必须先配置 `fire_api_base_url`，前端不会在未配置时伪造“保存成功”。本地 storage 只作为登录凭证、临时缓存和离线过渡缓存。

## 必需接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/v1/me/state` | 读取账户、财务、记账、拔草、成长、社区、阅读和设置等合并状态 |
| PUT | `/v1/me/state` | 保存合并状态，要求服务端按用户隔离并支持幂等更新 |
| GET | `/v1/me/privacy` | 读取隐私设置 |
| PUT | `/v1/me/privacy` | 更新隐私设置 |
| GET | `/v1/me/export` | 导出用户可读的数据副本 |
| DELETE | `/v1/me/state` | 删除账户数据（不等同于注销账户） |
| POST | `/v1/me/deletion` | 提交账号注销申请并返回处理状态 |

## 请求约定

- 使用 HTTPS；登录凭证通过 `Authorization: Bearer <token>` 传递。
- JSON 响应失败时返回 HTTP 4xx/5xx 和 `{ "message": "..." }`。
- `/v1/me/state` 的响应可以直接返回状态对象，也可以返回 `{ "state": {...} }`。
- 服务端必须以当前登录用户为主键，不能信任客户端传入的用户 ID。
- 服务端应记录版本或更新时间，避免多设备覆盖较新的数据。

## 配置

在登录服务完成后，把业务 API 地址写入 `uni.setStorageSync('fire_api_base_url', 'https://your-api.example.com')`，把登录令牌写入 `fire_access_token`。请将占位地址和联系邮箱替换为真实配置后再面向用户发布。