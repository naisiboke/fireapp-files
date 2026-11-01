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

已新增独立下载页：`download.html`。部署后可通过 `https://你的域名/download.html` 访问；下载页只保留 Android 和 iOS。Android 地址为同站点的 `./downloads/fireday.apk`，检测文件可用后启用下载。iOS 暂未提供正式地址，显示“即将上线”；有正式地址后再填写 `DOWNLOAD_LINKS.ios`。现有应用入口 `index.html` 保持不变。

## Android APK 发布到 CloudBase 静态网站托管

本次网页源码已更新，但当前执行环境无法读取聊天中的 APK 附件，安装包尚未代上传。请使用用户提供的真实 fireday.apk，不能创建占位文件。

1. 在当前官网环境打开“静态网站托管”的文件管理。
2. 将仓库最新 download.html 上传至站点根目录，替换旧下载页。
3. 在同一站点根目录创建 downloads 文件夹，将 fireday.apk 上传进去。
4. 确认 `https://fireday.cn/downloads/fireday.apk` 返回真实安装包，刷新 `https://fireday.cn/download.html`，Android 按钮应显示“下载 Android”。

页面只发起 HEAD 检测，不会提前下载整份 APK；不存在、空文件、网络失败或返回 HTML 首页的路径均不会启用下载。iOS 保留待上线状态，未提供 App Store 地址时不会生成假链接。
