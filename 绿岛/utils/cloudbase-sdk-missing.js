// 本地依赖未安装时的编译占位模块。
// 真正登录前请在 绿岛 目录执行 npm install，使 @cloudbase/js-sdk 被安装。
export default {
  init() {
    throw new Error('缺少 @cloudbase/js-sdk，请在绿岛目录执行 npm install 后重新运行')
  },
}
