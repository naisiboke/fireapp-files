export function validateNickname(input) {
  const value = String(input || '').normalize('NFKC').trim()
  if (!value) return { ok: false, message: '请输入昵称' }
  if ([...value].length < 2 || [...value].length > 20) return { ok: false, message: '昵称需要 2-20 个字符' }
  if (/\s{2,}|[\u0000-\u001f]/.test(value)) return { ok: false, message: '昵称格式不正确' }
  if (/(https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|1\d{10})/i.test(value)) {
    return { ok: false, message: '昵称不能包含链接、邮箱或手机号' }
  }
  return { ok: true, value }
}
