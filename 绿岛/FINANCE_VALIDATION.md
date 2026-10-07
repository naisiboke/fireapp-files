# 躺平倒计时更新与验证

## 页面和字段

- 路由：`/pages/calculator/index`
- 工具页第一入口：躺平倒计时
- FIRE 模式字段：
  - `finance.assets`：当前资产，元，新建时为空
  - `finance.monthlyDeposit`：每月存入，元/月，新建时为空
  - `finance.retirementExpense`：退休后每月消费，元/月，新建时为空
  - `finance.rate`：预期年化收益率，%/年，新建默认真实值 4
  - `finance.withdrawal`：退休后提取率，%/年，新建默认真实值 4
- 目标模式金额字段新建为空；年化收益率默认真实值 4。
- 页面、校验和诊断中已移除月被动收入；旧 storage 中的 `monthlyPassiveIncome` 或旧 `profile.passive` 不会被删除，但不会被新页面读取或要求填写。

## 计算和保存

沿用 `utils/engine.js` 的 `FireEngine` 和 `GoalEngine`：

```
FIRE目标资产 = 退休后每月消费 × 12 ÷ (提取率 ÷ 100)
月收益率 = (1 + 年化收益率 ÷ 100) ^ (1 ÷ 12) - 1
每月资产 = 上月资产 × (1 + 月收益率) + 每月存入
```

计算基准保存在 `freedomPlan.calculatedAt`，自由日保存在 `freedomPlan.deadline`，重复打开不会把日期向后推移。
目标模式先写 `goalDraft`，用户点击“更新目标到首页”后才写 `goalPlan`。
保存使用现有 store/storage，不覆盖记账、拔草、社区、阅读或未知字段。

## Pro 诊断

会员判断兼容已有可能的状态来源：

- `state.proMember === true`
- `state.profile.pro === true`
- `state.membership.pro === true`
- `fire_pro_member === true`

项目当前没有统一会员字段，因此默认显示锁定卡片。非会员不会渲染诊断正文，只显示开通提示；会员正文由当前真实数据生成，并分为状态、自由日、储蓄速度、消费/提取率、风险、行动和下一阶段七段。

## 验证

`scripts/check-finance.mjs` 使用真实引擎、store、计算页提交逻辑，并模拟 UniApp storage 和 H5 生命周期。当前验证结果：

```
58 finance checks passed
```

包含空白表单、默认4%、金额校验、保存/回显/重算、目标确认、旧字段迁移、数据保留、计时器、Pro 条件渲染、迷你目标卡片静态检查。

当前环境没有 HBuilderX、npm、浏览器或真机，因此没有标记 H5 编译、键盘输入、刘海屏和实际视觉效果为已通过。
