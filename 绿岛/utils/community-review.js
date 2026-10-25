import { askBehaviorAI, isApiConfigured } from './api-service.js'

function answerOf(result) {
  return result && (result.reply || result.message || result.content || result.answer || '')
}

function parseVerdict(text) {
  const raw = String(text || '').trim()
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('审核结果格式无效')
  let parsed
  try { parsed = JSON.parse(match[0]) } catch (e) { throw new Error('审核结果格式无效') }
  const approved = parsed.approved === true || parsed.approved === 'true' || parsed.result === '通过' || parsed.verdict === 'pass'
  const rejected = parsed.approved === false || parsed.approved === 'false' || parsed.result === '拒绝' || parsed.verdict === 'reject'
  if (!approved && !rejected) throw new Error('审核结果不明确')
  return { approved, reason: String(parsed.reason || parsed.message || (approved ? '内容符合社区规范' : '内容不符合社区规范')).slice(0, 160) }
}

export async function reviewCommunityPost(post) {
  if (!isApiConfigured()) throw new Error('审核服务尚未配置')
  const question = [
    '你是 Fire生活社区的内容安全审核器。请审核下面的用户投稿。',
    '只审核是否适合公开展示：辱骂、人身攻击、仇恨歧视、色情、血腥暴力、违法犯罪、诈骗引流、恶意广告、泄露他人隐私、极端危险行为等应拒绝。',
    '正常的生活经历、困难、批评、情绪表达和理财记录可以通过。',
    '请只返回 JSON，不要返回 Markdown：{"approved":true或false,"reason":"不超过40字的中文原因"}。',
    '标题：' + String(post.title || ''),
    '内容：' + String(post.content || post.summary || ''),
    '时间点：' + JSON.stringify(post.timeline || []),
  ].join('\\n')
  const result = await askBehaviorAI({ question, communityReview: true, postId: post.id })
  return parseVerdict(answerOf(result))
}
