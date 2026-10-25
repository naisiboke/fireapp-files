const cloud = require('@cloudbase/node-sdk')

const app = cloud.init({ env: process.env.TCB_ENV || 'ziyoukedu-d0gyrczqk4de53b87' })
const db = app.database()
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'Authorization,Content-Type', 'access-control-allow-methods': 'GET,DELETE,OPTIONS' }, body: JSON.stringify(body) }
}
function token(event) {
  const headers = event.headers || {}
  const value = headers.authorization || headers.Authorization || ''
  return String(value).replace(/^Bearer\s+/i, '')
}
function guard(event) {
  return ADMIN_TOKEN && token(event) === ADMIN_TOKEN
}
async function list(name, limit = 100) {
  const result = await db.collection(name).limit(limit).get()
  return result.data || []
}
function pathOf(event) {
  return event.path || event.requestContext?.http?.path || event.requestContext?.path || '/'
}
exports.main = async (event) => {
  if (String(event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase() === 'OPTIONS') return json(204, {})
  if (!guard(event)) return json(401, { message: '管理员令牌无效' })
  const method = String(event.httpMethod || event.requestContext?.http?.method || 'GET').toUpperCase()
  const path = pathOf(event)
  try {
    if (method === 'GET' && path.endsWith('/overview')) {
      const [users, posts, collections] = await Promise.all([list('user_states', 1000), list('community_posts', 1000), list('user_collections', 1000)])
      return json(200, { users: users.length, members: users.filter(x => x.membership && (x.membership.active || x.membership.status === 'active')).length, communityPosts: posts.length, aiChats: collections.filter(x => x.collection === 'ai-chats' || x.name === 'ai-chats').length })
    }
    if (method === 'GET' && path.endsWith('/users')) return json(200, { items: await list('user_states', 200) })
    if (method === 'GET' && path.endsWith('/community/posts')) {
      const rows = await list('user_collections', 500)
      const posts = []
      rows.filter(x => x.collection === 'ugc' || x.name === 'ugc' || x.key === 'ugc').forEach(row => {
        const items = Array.isArray(row.items) ? row.items : (Array.isArray(row.value) ? row.value : [])
        items.forEach(item => posts.push({ ...item, ownerId: row.userId || row._openid || '' }))
      })
      return json(200, { items: posts })
    }
    if (method === 'GET' && path.endsWith('/ai/chats')) {
      const rows = await list('user_collections', 500)
      const chats = []
      rows.filter(x => x.collection === 'ai-chats' || x.name === 'ai-chats' || x.key === 'ai-chats').forEach(row => {
        const items = Array.isArray(row.items) ? row.items : (Array.isArray(row.value) ? row.value : [])
        items.forEach(item => chats.push({ ...item, ownerId: row.userId || row._openid || '' }))
      })
      const states = await list('user_states', 500)
      states.forEach(row => (row.aiChats || []).forEach(item => chats.push({ ...item, ownerId: row._openid || row.userId || row._id || '' })))
      return json(200, { items: chats })
    }
    const match = path.match(/\/community\/posts\/([^/]+)$/)
    if (method === 'DELETE' && match) {
      await db.collection('community_posts').doc(decodeURIComponent(match[1])).remove()
      return json(200, { ok: true })
    }
    return json(404, { message: '后台接口不存在' })
  } catch (error) {
    console.error(error)
    return json(500, { message: error.message || '后台服务错误' })
  }
}
