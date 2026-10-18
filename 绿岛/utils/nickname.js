const FORBIDDEN_WORDS = [
  '傻逼', '妈的', '操你', '草泥马', '畜生', '废物', '垃圾', '脑残',
  '去死', '狗东西', '王八蛋', '他妈', '纳粹', '法西斯', '恐怖分子',
  '极端主义', '管理员', '客服', '官方', 'admin', 'root',
  '习近平', '李强', '毛泽东', '邓小平', '江泽民', '胡锦涛', '温家宝',
  '中国共产党', '共产党', '国民党', '中华人民共和国', '中央政府', '国务院',
  '政府', '国家', '政治', '总统', '主席', '总理', '军队', '警察', '法院',
]

export function validateNickname(input) {
  const value = String(input || '').trim()
  if (!value) return { ok: false, message: '请输入昵称' }
  if (value.length < 2 || value.length > 20) return { ok: false, message: '昵称需要 2-20 个字符' }
  if (/\s{2,}|[\u0000-\u001f]/.test(value)) return { ok: false, message: '昵称格式不正确' }
  if (/(https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|1\d{10})/i.test(value)) {
    return { ok: false, message: '昵称不能包含链接、邮箱或手机号' }
  }
  const normalized = value.toLowerCase().replace(/[\s·._-]/g, '')
  if (FORBIDDEN_WORDS.some(word => normalized.includes(word.toLowerCase().replace(/[\s·._-]/g, '')))) {
    return { ok: false, message: '昵称包含不合适的内容，请换一个' }
  }
  return { ok: true, value }
}
