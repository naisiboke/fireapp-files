# 1.0.3 / 103：更新提醒打开官网下载最新版

## 用户看到的流程

启动 App 后，在登录页或正常使用页面检测已发布的新版本。发现新版本时显示版本号、更新说明，以及“立即更新”和“稍后再说”。

点击“立即更新”通过系统浏览器打开：

https://fireday.cn/#download

官网直接定位到“下载版本”区域，用户再点对应的 Android / iOS 下载按钮。设置里的“检查更新”使用相同流程。无需先登录；启动引导、资料冲突处理等页面不插入自动更新提示。相同版本取消后一天内不反复提示，手动检查仍能再次查看。

App 更新按钮始终打开官方域名，不直接调起 APK 下载。网站上的 Android 按钮读取 app-update.json 中已发布版本的 downloadUrl，并显示版本名。版本信息读取失败时，原有 fireday.apk 下载链接继续可用，不显示禁用按钮。

iOS 目前仍保持“即将上线”。将来正式上架后，在 ios 配置中填写真实 App Store 地址，网站才能显示对应下载入口。

## 需要发布的文件

下载最新绿岛源码，确认 manifest.json 版本名称为 1.0.3、版本号 103，用已发布 App 相同的包名和签名打正式包。

CloudBase 静态网站托管应用仍为 lvdao，绑定域名 fireday.cn。网站根目录放置：

```text
index.html                 ← 仓库 download.html 改名后的官网入口
fireday-1.0.3.apk           ← 本次打包的新 APK，版本专用文件名
fireday.apk                ← 同一个新 APK 的副本，保留原有下载入口及无脚本回退
app-update.json            ← 仓库根目录的版本配置
```

先上传 APK 和官网 index.html，验证两个 APK 地址都能下载，再发布版本配置。不要把整个“官方”文件夹套在网站根目录外面。

当前仓库的 published 默认 false。新包上传完成后，将 android.published 改为 true，再上传 app-update.json：

```json
{
  "appId": "__UNI__6A9B0BE",
  "android": {
    "published": true,
    "versionCode": 103,
    "versionName": "1.0.3",
    "downloadUrl": "https://fireday.cn/fireday-1.0.3.apk",
    "websiteUrl": "https://fireday.cn/#download",
    "notes": [
      "更新提醒可直接前往官网下载最新版",
      "官网自动读取最新发布版本的下载链接",
      "保留存档冲突处理、资产任务和统一页面间距修复"
    ]
  },
  "ios": null
}
```

downloadUrl 仍保留真实 APK 地址，兼容已安装的 1.0.1 / 1.0.2 更新检查器；新版本的更新按钮使用 websiteUrl 指向官网。旧 APK 本次升级前仍按旧逻辑打开 APK，安装 1.0.3 后，后续提醒才采用官网跳转。更早、未包含更新检查的 APK 需先手动从官网下载覆盖安装一次。

## 以后更新

例如发布 1.0.4：

1. App manifest 版本号增为 104，版本名称改为 1.0.4，打包。
2. 上传 fireday-1.0.4.apk，同时更新 fireday.apk。
3. 将 app-update.json 的 versionCode 改为 104、versionName 改为 1.0.4、downloadUrl 改为新 APK 地址，并更新 notes。
4. 文件可下载后再将 published 设为 true，上传配置。websiteUrl 保持不变。

官网会自动读取这份配置，通常无需每次手改 HTML 下载按钮。更新 metadata 和 APK 后，如 CloudBase/CDN 仍提供旧文件，刷新对应文件缓存。建议 app-update.json 使用 Cache-Control: no-cache；页面和 App 也会带时间参数请求版本信息。

版本号相同或安装版本更高时不会弹窗；published 为 false 时不会弹窗。安装 103 的设备要验证提醒，需要使用已上传且版本号大于 103 的测试发布配置。

## 验证

在绿岛目录执行：

```sh
node scripts/check-website-update.mjs
node scripts/check-release-recovery.mjs
```

检查执行实际更新模块与官网脚本，覆盖自动/手动检查、未登录、系统浏览器跳转、取消、旧版配置兼容、官网最新下载链接以及网络/JSON 失败回退。它们不访问生产资料，也不能替代 HBuilderX 构建和真机验收。

真机确认“立即更新”打开外部浏览器的官网版本区，Android 下载的是本次新包，覆盖安装后显示 1.0.3，原有本机记录仍在。
