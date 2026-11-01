import { readAccountCache, writeAccountCache } from './account-cache.js'
export const storage = {
  get(key,fallback=null){return readAccountCache('fire_forge_'+key,fallback)},
  set(key,value){return writeAccountCache('fire_forge_'+key,value)},
  remove(key){return writeAccountCache('fire_forge_'+key,null)},
}
