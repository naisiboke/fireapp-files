// Compatibility adapter: approval always comes from the authenticated server.
import { submitCommunityPost } from './api-service.js'
export function validateCommunityPost(post){
 const title=String(post.title||'').trim(),content=String(post.content||post.summary||'').trim()
 if(title.length<4||content.length<8)return {approved:false,reason:'请补充有意义的标题和具体经历'}
 if((post.timeline||[]).some(row=>Number(row.year)>new Date().getFullYear()))return {approved:false,reason:'经历时间不能晚于现在'}
 return null
}
export async function reviewCommunityPost(post){
 const saved=await submitCommunityPost(post)
 return {approved:saved.status==='approved',reason:saved.reviewReason||'请到我的社区设置查看状态',post:saved}
}
