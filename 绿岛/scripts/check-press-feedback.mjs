import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=fileURLToPath(new URL('../',import.meta.url))
const read=p=>readFileSync(path.join(root,p),'utf8')
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(x=>x.isDirectory()&&!['node_modules','unpackage','.git'].includes(x.name)?walk(path.join(p,x.name)):x.isFile()&&x.name.endsWith('.vue')?[path.join(p,x.name)]:[])
let entries=0,masks=0
for(const file of walk(root)){
 const template=readFileSync(file,'utf8').split('<script')[0]
 for(const tag of template.match(/<(view|text|button|image)\b(?:"[^"]*"|'[^']*'|[^'">])*>/g)||[]){
  const event=tag.match(/@(tap|click)(?:\.[\w-]+)*\s*=\s*("([^"]*)"|'([^']*)')/)
  if(!event||!(event[3]||event[4]||'').trim())continue
  const classes=tag.match(/(?:^|\s)class="([^"]*)"/)?.[1]||''
  if(/(?:^|\s)[\w-]*(?:mask|overlay|backdrop)(?:\s|$)/.test(classes)||/@touchmove/.test(tag)){
   assert(!tag.includes('data-fire-press'),'backdrops and drag areas do not scale');masks++;continue
  }
  assert(tag.includes('data-fire-press="true"'),file+': missing press feedback')
  if(/^<(view|button)\b/.test(tag)){
   assert(tag.includes('hover-class="fire-pressed"')&&tag.includes(':hover-start-time="0"')&&tag.includes(':hover-stay-time="90"')&&tag.includes(':hover-stop-propagation="true"'),'native touch release/cancel uses built in hover state')
  }
  entries++
 }
}
assert(entries>=240&&masks>=3,'App wide actionable entry coverage')
const css=read('styles/press-feedback.css')
assert(css.includes('scale(.975)')&&css.includes(':active')&&css.includes('prefers-reduced-motion'),'shared touch feedback and reduced motion supported')
assert(css.includes(':not([disabled])')&&css.includes(':not(.disabled)'),'disabled controls excluded')
assert(read('pages/music/index.vue').includes('--fire-press-transform:translate(-50%,-50%)'),'music button retains positioning while pressed')
assert(read('App.vue').includes("@import './styles/press-feedback.css'"),'feedback installed globally')
console.log('Press feedback: '+entries+' controls, '+masks+' backdrops excluded; disabled, reduced motion and positioned music button checked')
