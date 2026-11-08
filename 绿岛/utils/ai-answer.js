export const AI_REPLY_MAX=500
// Count Unicode code points, including punctuation and line breaks, for a strict upper bound.
export function limitAIAnswer(input){
 const text=String(input??'').replace(/[\uFFFD]+/g,'').replace(/\*\*|__/g,'').trim()
 const chars=Array.from(text)
 if(chars.length<=AI_REPLY_MAX)return text
 const first=chars.slice(0,AI_REPLY_MAX-1).join('')
 const stop=Math.max(first.lastIndexOf('。'),first.lastIndexOf('！'),first.lastIndexOf('？'),first.lastIndexOf('\n'))
 return (stop>=350?first.slice(0,stop+1).trimEnd():first.trimEnd())+'…'
}
