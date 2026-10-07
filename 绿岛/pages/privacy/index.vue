<template>
  <view class="privacy-page">
    <view class="head"><text class="title">隐私政策</text><view class="close" role="button" aria-label="关闭" @tap="close">×</view></view>
    <view class="content"><text class="h2">FIRE 绿岛隐私政策</text><text class="date">版本：v1.0 · 生效日期：2026-10-07 · 最后更新时间：2026-10-07</text>
      <view v-for="section in sections" :key="section.title" class="section"><text class="h3">{{ section.title }}</text><text class="p">{{ section.text }}</text></view>
      <view class="contact-card"><text class="contact-title">联系方式</text><text class="p">当前项目尚未配置真实客服邮箱、公司名称或办公地址。发布前请在应用配置中补充 PRIVACY_CONTACT_EMAIL、PRIVACY_OPERATOR_NAME 和 PRIVACY_OPERATOR_ADDRESS；在配置完成前，请通过应用商店页面或项目维护入口联系我们。</text></view>
    </view>
  </view>
</template>

<script>
export default { data() { return { sections: [
{ title: '一、隐私政策概述', text: 'FIRE 绿岛帮助你记录生活计划、财务目标、消费选择、成长行动、社区内容和阅读状态。本政策说明我们会处理哪些数据、为什么处理、怎样保存以及你可以如何管理。政策内容以当前实际数据流和已配置的云端服务为准。' },
{ title: '二、适用范围', text: '本政策适用于 FIRE 绿岛移动端、H5 和小程序版本，以及通过本应用访问的页面、工具和云端接口。若某项功能单独提供补充说明，补充说明与本政策一并适用。' },
{ title: '三、我们收集的数据类型', text: '数据包括账户和登录信息、个人资料、财务与资产数据、收入和消费记录、躺平倒计时与自由日目标、记账和拔草计划、英雄传成长数据、社区内容与互动、阅读记录和书架、设备和运行日志，以及你主动选择的设置。我们只处理功能所需的数据。' },
{ title: '四、账户和登录信息', text: '当你登录或使用游客模式时，应用会保存登录状态、账户标识、访问令牌和必要的会话信息。登录凭证用于识别你的账户和保护云端数据；不会把密码以可读形式保存。请不要在昵称、帖子或备注中填写身份证号、银行卡号等敏感信息。' },
{ title: '五、财务、资产、收入和消费数据', text: '你填写的资产、收入、消费、储蓄、收益率、提取率和目标等数据用于计算自由日、目标门槛、进度和诊断结果。财务数据是敏感的个人信息，我们会按账户隔离并通过已配置的云端接口保存。前端本地只保留必要的缓存或离线过渡副本。' },
{ title: '六、躺平倒计时、自由日和目标数据', text: '应用会保存计算模式、输入参数、计算时间、预计自由日、剩余天数、目标名称、金额和预计达成日期，以便重新打开时回显并在首页同步。修改后会以最新版本更新云端记录。' },
{ title: '七、记账和拔草数据', text: '记账金额、类别、日期、备注，以及拔草项目的金额、冷静期、状态、已购买和已省下金额用于展示记录、统计和首页同步。删除或改变状态时会同步更新对应云端数据；请在共享设备上退出账户。' },
{ title: '八、FIRE 英雄传成长数据', text: '英雄传任务进度、完成记录、经验值、等级和徽章用于提供成长反馈和任务展示。该数据属于你的账户数据，不用于推断你的信用、工作或其他与应用无关的身份特征。' },
{ title: '九、社区内容、收藏和互动数据', text: '你发布的经历、草稿、标签、收藏、点赞或其他互动会按社区功能保存并展示给相应用户。发布前请确认内容中没有他人的联系方式、未公开财务信息或其他不应公开的个人信息。删除内容后，服务端可能因备份和安全日志保留必要记录一段时间。' },
{ title: '十、阅读记录和书架数据', text: '书架清单、阅读状态、阅读时长和历史记录用于恢复阅读进度、生成个人记录和改进相关功能。除非你主动分享，阅读记录不会作为社区公开内容展示。' },
{ title: '十一、设备、日志和运行数据', text: '为保证页面打开、错误排查和安全运行，服务可能接收设备类型、系统版本、应用版本、页面路由、错误信息、请求时间和网络状态等运行日志。我们不会为了广告目的建立跨应用画像。' },
{ title: '十二、数据收集和使用目的', text: '我们处理数据的目的包括：提供登录和同步；保存和展示你主动创建的内容；执行财务和目标计算；同步首页统计；保存成长和阅读进度；处理会员权益；排查故障、保障安全；回应删除、导出和注销请求；履行法律要求。' },
{ title: '十三、数据服务器存储方式', text: '正式数据源应为项目配置的云端 API，使用 HTTPS 和账户授权访问。当前仓库只提供统一 API service 层，尚未内置真实业务 API 地址；未配置地址时，应用会明确提示无法云端同步，不会显示虚假的服务器成功结果。本地 storage 仅作为凭证、临时缓存和离线过渡。' },
{ title: '十四、数据传输和安全保护', text: '我们会通过 HTTPS 传输数据，并使用访问令牌进行授权。服务端应实施账户隔离、权限校验、传输加密、访问审计、备份保护和最小化权限。任何互联网传输都不能保证绝对安全，请妥善保管设备和登录凭证。' },
{ title: '十五、数据保存期限', text: '数据在账户使用期间按提供功能所需保存。你删除数据或注销账户后，我们会按服务端流程删除或匿名化可删除数据；为处理争议、履行法律义务、保障安全所需的最短备份和日志留存期限可能不同。具体期限应由正式服务条款和后端配置补充。' },
{ title: '十六、数据删除、导出和账号注销', text: '你可以在设置中的数据管理发起数据导出、删除数据或账号注销。导出和云端删除需要已配置的服务端接口；接口不可用时会显示失败原因，不会伪造完成。删除本机缓存只影响本设备，不代表云端数据已经删除。' },
{ title: '十七、第三方服务和数据共享', text: '除提供云端存储、登录、崩溃排查或支付所必需的服务外，我们不会出售你的个人数据。第三方只能在完成对应功能、获得必要授权和承担保密义务的范围内处理数据。当前项目未配置具体第三方服务清单，正式发布前应在配置和商店说明中补充。' },
{ title: '十八、会员和支付相关数据', text: '如果未来开通 Pro 会员，订单号、权益状态、支付结果和退款状态可能由支付或应用商店服务处理。我们只接收验证权益所需的结果，不保存完整银行卡或支付密码。当前会员功能仍以项目实际接入情况为准。' },
{ title: '十九、未成年人使用说明', text: '本应用不以未成年人为主要服务对象。未成年人应在监护人同意和指导下使用，不要提交真实财务、联系方式或其他敏感信息。若监护人发现未经同意的未成年人数据，请通过配置后的联系方式联系我们。' },
{ title: '二十、用户隐私权利', text: '在法律允许范围内，你可以查询、更正、导出、删除个人数据，撤回可选设置同意，关闭个性化内容，以及注销账户。我们可能需要验证账户身份后处理请求，并在无法满足时说明原因和替代方式。' },
{ title: '二十一、隐私政策更新方式', text: '当数据类型、使用目的、服务器或权利安排发生重要变化时，我们会更新本页面的版本和时间，并在适当位置提示。继续使用更新后的功能表示你已阅读更新内容；需要单独同意的事项会按法律要求另行处理。' },
{ title: '二十二、联系方式', text: '当前项目没有配置真实运营主体名称、办公地址或客服邮箱。发布前请补充 PRIVACY_CONTACT_EMAIL、PRIVACY_OPERATOR_NAME 和 PRIVACY_OPERATOR_ADDRESS，并在应用内和应用商店同步展示。配置完成前，请通过项目维护入口提交隐私问题。' },
{ title: '二十三、生效日期和最后更新时间', text: '本政策 v1.0 于 2026-10-07 生效，最后更新时间为 2026-10-07。后续版本会在本页更新版本号和时间。' },
] } }, methods: { close() { uni.reLaunch({ url: '/pages/profile/index' }) } }, onBackPress() { this.close(); return true } }
</script>

<style>
.privacy-page{min-height:100vh;padding:0 24px calc(48px + env(safe-area-inset-bottom));background:#fdfdfb;box-sizing:border-box}.head{position:fixed;z-index:30;top:0;left:0;right:0;height:calc(58px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 16px 0 24px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;background:rgba(253,253,251,.97);border-bottom:1px solid #edf1eb}.title{font-size:18px;font-weight:600;color:#243830}.close{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:27px;line-height:1;color:#243830;border-radius:50%}.close:active{background:#edf2e9}.content{padding-top:calc(84px + env(safe-area-inset-top))}.h2{display:block;font-size:22px;font-weight:700;color:#143e37}.date{display:block;font-size:13px;color:#71807a;margin-top:8px}.section{margin-top:22px}.h3{display:block;font-size:16px;font-weight:600;color:#243830;margin-bottom:7px}.p{display:block;font-size:14px;line-height:1.85;color:#52605a;white-space:pre-line}.contact-card{margin-top:28px;padding:16px;background:#eff2e9;border-left:2px solid #bfd0b5;border-radius:0 14px 14px 0}.contact-title{display:block;font-size:15px;font-weight:600;color:#243830;margin-bottom:5px}
</style>