// Fire生活会员状态统一入口。
// 会员权限必须来自云端确认；本地只保留最近一次状态，避免用演示开关伪造会员。
export const MEMBERSHIP_PLAN = {
  id: 'fire-life-monthly',
  name: 'Fire生活通用会员',
  price: 9,
  unit: '月',
}

export function membershipState(source) {
  const membership = source && source.membership && typeof source.membership === 'object'
    ? source.membership
    : {}
  const expiresAt = Number(membership.expiresAt || membership.expireAt || 0)
  const active = membership.active === true || membership.status === 'active' || membership.pro === true
  const valid = active && (!expiresAt || expiresAt > Date.now())
  return {
    ...membership,
    active: valid,
    plan: membership.plan || MEMBERSHIP_PLAN.id,
    name: membership.name || MEMBERSHIP_PLAN.name,
    price: Number(membership.price) || MEMBERSHIP_PLAN.price,
    expiresAt,
  }
}

export function isMembershipActive(source) {
  return membershipState(source).active === true
}

export function membershipText(source) {
  const info = membershipState(source)
  if (!info.active) return '未开通'
  if (!info.expiresAt) return '已开通'
  return '有效期至 ' + new Date(info.expiresAt).toLocaleDateString('zh-CN')
}
