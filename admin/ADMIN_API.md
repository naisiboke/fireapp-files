# Fire生活后台接口

后台静态页面位于 `admin/index.html`，需要后端签发管理员令牌，前端通过 `Authorization: Bearer <admin-token>` 访问。

需要实现以下管理员接口：

- `GET /v1/admin/overview`
  - 返回 `{ users, members, communityPosts, aiChats }`
- `GET /v1/admin/users`
  - 返回用户状态列表，包含 `id、email、membership、updatedAt`
- `GET /v1/admin/community/posts`
  - 返回社区经历列表
- `DELETE /v1/admin/community/posts/:id`
  - 删除一条社区经历
- `GET /v1/admin/ai/chats`
  - 返回聊天记录列表

管理员接口必须在服务端校验管理员身份，不能只依赖前端隐藏入口。可以继续使用现有的 CloudBase 集合：

- `user_states`
- `community_posts`
- `user_collections`

后台不需要直接暴露数据库密钥，也不需要给网页配置普通用户令牌。