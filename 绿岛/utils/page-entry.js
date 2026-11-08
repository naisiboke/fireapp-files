import { nextTick } from 'vue'
import { enterTab } from './tab-motion.js'

// Cached tab pages need a rendered reset before the same CSS animation can run again.
export function createPageEntryController({ reset, play, afterRender = nextTick, schedule = setTimeout, cancel = clearTimeout }) {
  let generation = 0
  let visible = false
  let timer = null

  function clearTimer() {
    if (timer !== null) cancel(timer)
    timer = null
  }

  return {
    show() {
      const current = ++generation
      visible = true
      clearTimer()
      reset()
      afterRender(() => {
        if (!visible || current !== generation) return
        // Allow one painted frame with animation:none, including on App WebViews.
        timer = schedule(() => {
          timer = null
          if (visible && current === generation) play()
        }, 32)
      })
    },
    hide() {
      generation++
      visible = false
      clearTimer()
      reset()
    },
  }
}

const controllers = new WeakMap()

function controllerFor(page) {
  if (!controllers.has(page)) {
    controllers.set(page, createPageEntryController({
      reset: () => { page.pageEntryReset = true },
      play: () => { page.pageEntryReset = false },
    }))
  }
  return controllers.get(page)
}

function dispose(page) {
  const controller = controllers.get(page)
  if (controller) controller.hide()
  controllers.delete(page)
}

export const pageEntryMixin = {
  data() { return { pageEntryReset: true, tabEntryDirection: 0 } },
  computed: {
    tabEntryStyle(){return {'--tab-enter-x':(this.tabEntryDirection*12)+'px'}},
  },
  onShow() {
    let path=''
    try{const pages=getCurrentPages();path='/'+String(pages[pages.length-1]?.route||'').replace(/^\//,'')}catch{}
    this.tabEntryDirection=enterTab(path)
    controllerFor(this).show()
    nextTick(()=>{const footer=this.$refs?.bottomNav||this.$refs?.guideTabs;footer?.resumeMotion?.()})
  },
  onHide() { const controller = controllers.get(this); if (controller) controller.hide() },
  onUnload() { dispose(this) },
  beforeUnmount() { dispose(this) },
}
