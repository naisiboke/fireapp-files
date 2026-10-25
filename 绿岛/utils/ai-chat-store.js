const KEY='fire_ai_chats_v1'
function read(){try{const value=uni.getStorageSync(KEY);return Array.isArray(value)?value:[]}catch(e){return[]}}
function write(value){try{uni.setStorageSync(KEY,JSON.stringify(value));return true}catch(e){return false}}
export async function loadAIChats(fallback=[]){return Array.isArray(fallback)&&fallback.length?fallback:read()}
export async function saveAIChats(chats){const value=(Array.isArray(chats)?chats:[]).slice(0,30);write(value);return value}
