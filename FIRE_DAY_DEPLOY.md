# fireday.cn 部署说明

网页版主文件是 `fire-forge-island-onboarding-v2 (1).html`。

## 网站入口

将该文件作为静态站点首页部署到 `fireday.cn`，并开启 HTTPS。页面已经加入 canonical 和 Open Graph 地址：

- `https://fireday.cn/`

## 云端配置

网页使用现有 CloudBase 环境：

- 环境：`ziyoukedu-d0gyrczqk4de53b87`
- 区域：`ap-shanghai`
- API：`https://ziyoukedu-d0gyrczqk4de53b87-1311439378.ap-shanghai.app.tcloudbase.com/api`

上线前需要在 CloudBase API 服务的 CORS 白名单加入：

- `https://fireday.cn`
- `https://www.fireday.cn`
- `https://id0yg2.kicp.fun`（当前测试站点）

并确认邮箱验证码登录已开启。网页不会伪造保存成功：登录后会读取 `/v1/me/state`，修改数据后写入 `/v1/me/state`；读取或保存失败会显示错误。

## 网页功能

已接入登录/注册、会话恢复、退出登录、云端状态同步、一生存款曲线、年龄适配题库、自定义 F 选项、草稿、历史结果、记账、拔草、阅读、社区、AI、音乐、FIRE 英雄传和设置页面。

## 下载官网模板

已新增独立下载页：`download.html`。部署后可通过 `https://你的域名/download.html` 访问；其中 `DOWNLOAD_LINKS` 的三个空值分别对应 iOS、Windows、Android 下载地址，填入文件地址后按钮会自动启用。现有应用入口 `index.html` 保持不变。
