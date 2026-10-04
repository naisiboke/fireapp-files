export const money = v =>
  '¥ ' + Number(v).toLocaleString('zh-CN', { maximumFractionDigits: 0 })

export const amountText = n =>
  Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const escapeText = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))