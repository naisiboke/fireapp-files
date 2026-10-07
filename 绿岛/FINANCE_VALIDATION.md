# 躺平倒计时更新与验证

## 范围和路由

新增页面 /pages/calculator/index（同一页包含表单和结果），工具页固定为第一个入口。
首页“填写财务数据”“查看计划”打开退休模式，“查看目标”打开 ?mode=goal。
不修改主导航、引导/登录状态或记账、拔草、社区、英雄传页面。

检查发现：原工具入口 URL 为空，UniApp 工程没有计算页面；原引擎有 FireEngine、GoalEngine。
HTML 参考也使用相同的函数，但当前 UniApp/HTML 中没有名为 PRO 深度诊断的现成实现。
保留其他页面的 PRO 入口，在计算结果页提供覆盖度、储蓄率与收益敏感性诊断；
不新增付费接口或修改会员状态。

## 字段和公式

| 页面字段 | 保存位置 | 单位 |
| --- | --- | --- |
| 当前可投资资产 | finance.assets | 人民币元 |
| 每月存入 | finance.monthlyDeposit | 元/月 |
| 退休后每月消费 | finance.retirementExpense | 元/月 |
| 预期年化收益率 | finance.rate | %/年 |
| 年度提取率 | finance.withdrawal | %/年，默认假设4 |
| 月被动收入（可选） | profile.passive | 元/月 |
| 目标名/已准备/金额/月存/预期月数/收益率 | goalDraft，再经确认到goalPlan | 元、元/月、个月、%/年 |
| 自由日基准与日期 | freedomPlan.calculatedAt、deadline、signature | 毫秒时间戳 |

finance.expense、income 是旧版生活支出/收入，不用退休消费覆盖这些字段。
旧版缺少 monthlyDeposit 时沿用 income-expense；缺少 retirementExpense 时沿用 expense。
reading 对象、账目、拔草、收藏、未知旧字段均保留。新安装采用零金额、financeEntered=false。
无法区分旧演示数据和用户真实保存数据，升级时不擅自删除旧值。

退休门槛 = 月退休消费 × 12 ÷ (withdrawal/100)。
有效月收益率 = (1 + rate/100)^(1/12) - 1。
每个月：资产 = 上月资产 × (1 + 月收益率) + 月存入，最多模拟1200个月。
目标模式沿用 GoalEngine 的目标金额、期望月数及年金终值分析。
被动覆盖度仅作诊断，不从引擎的退休消费中偷偷扣减。
保存计算基准和截止时间，避免每次打开页面重新将自由日向后推移。
日历运算沿用 addCalendarMonths、ReelCalendarParts、ReelParts。

## 验证方式与结果

使用实际 JS 引擎/store/计算页面提交及生命周期函数，模拟 UniApp storage、Vue refs/computed 和浏览器事件。
54项检查已执行通过，另外执行旧/新引擎在-10%、0%、8%、50%收益率下的退休/目标公式对照通过。
可在安装 Node 后从“绿岛”目录运行：

```sh
node scripts/check-finance.mjs
```

脚本无需 npm 依赖；它不会访问真实用户数据。
该检查不是 Vue 模板编译或手机界面测试。

| 用户验收项 | 已执行验证 | 未验证部分 |
| --- | --- | --- |
| 1. 无数据空白表单 | 实际 onLoad/校验逻辑通过 | H5/App显示 |
| 2. 有效输入计算保存 | 实际提交函数与存储通过，包括保存失败回滚 | 触屏与键盘输入 |
| 3. 重开回显和编辑 | onLoad、重算与重启读取通过 | 真机重启 |
| 4. 金额/周期/日期/单位 | 零收益与复利公式对照、目标月存分析、月末日期通过；字段单位已代码核对 | 手机排版 |
| 5. 计时和动效 | 每秒更新、H5隐藏/恢复/pageshow、单定时器和卸载清理通过；AnimatedNumber只对改变的值淡出120ms/淡入120ms | 0.24秒淡出/淡入的实际视觉 |
| 6. 首页同步 | refreshFinance实际读取通过，首页onShow已接入 | 页面切换渲染 |
| 7. 目标确认才展示 | 草稿/确认保存与首页goalPlan条件通过 | 点击结果视觉 |
| 8. 数据保护 | 账目、拔草、阅读、收藏、UGC、未知字段保留通过 | 不同设备存储权限 |
| 9. 双模式与PRO诊断 | 退休/目标提交、覆盖度与敏感性通过；旧PRO入口未改 | 真机展开操作 |

当前环境没有本地 shell、npm执行工具、HBuilderX或可启动的浏览器/真机实例，
因此未执行 npm install、build:h5，也没有把这些未执行的检查标为通过。
请用 HBuilderX 导入含 App.vue/main.js/pages.json 的“绿岛”文件夹运行 H5，
再进行 Android/iOS 真机的键盘、页面返回与动效检查。
