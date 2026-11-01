import { reactive } from 'vue'

// One visible dialog per page. Preserve success/complete callbacks used by existing actions.
export const feedbackState = reactive({ owner: null, dialog: null, notice: null })
let nextId = 0
let noticeTimer = null
const queue = []
const overlays = []
const createId = () => ++nextId
export const createFeedbackOwner = createId

function notify(request, result) {
  request.listeners.forEach(listener => {
    try { if (typeof listener.success === 'function') listener.success(result) }
    catch (error) { console.error('[feedback-callback]', error) }
    try { if (typeof listener.complete === 'function') listener.complete(result) }
    catch (error) { console.error('[feedback-complete]', error) }
    listener.resolve(result)
  })
}
function pump() {
  if (feedbackState.dialog || feedbackState.owner === null) return
  const index = queue.findIndex(item => item.owner === null || item.owner === feedbackState.owner)
  if (index < 0) return
  const request = queue.splice(index, 1)[0]
  request.owner = feedbackState.owner
  feedbackState.dialog = request
}
export function activateFeedbackOwner(owner) {
  feedbackState.owner = owner
  pump()
}
export function closeDialog(confirm = false) {
  const request = feedbackState.dialog
  if (!request) return
  feedbackState.dialog = null
  notify(request, { confirm, cancel: !confirm, errMsg: 'showModal:ok' })
  pump()
}
export function hideNotice() {
  clearTimeout(noticeTimer)
  noticeTimer = null
  feedbackState.notice = null
}
export function deactivateFeedbackOwner(owner) {
  if (feedbackState.owner === owner) feedbackState.owner = null
  const dismissed = []
  if (feedbackState.dialog && feedbackState.dialog.owner === owner) {
    dismissed.push(feedbackState.dialog)
    feedbackState.dialog = null
  }
  for (let index = queue.length - 1; index >= 0; index--) {
    if (queue[index].owner === owner) dismissed.push(...queue.splice(index, 1))
  }
  dismissed.forEach(request => notify(request, { confirm: false, cancel: true, errMsg: 'showModal:ok' }))
}
export function releaseFeedbackOwner(owner) {
  deactivateFeedbackOwner(owner)
  for (let index = overlays.length - 1; index >= 0; index--) {
    if (overlays[index].owner === owner) overlays.splice(index, 1)
  }
}
export function showDialog(options = {}) {
  return new Promise(resolve => {
    const owner = feedbackState.owner
    const title = String(options.title || '温馨提示')
    const content = String(options.content || '').replace(/\\n/g, '\n')
    const listener = { success: options.success, complete: options.complete, resolve }
    const existing = [feedbackState.dialog, ...queue].find(item =>
      item && item.owner === owner && item.title === title && item.content === content)
    if (existing) { existing.listeners.push(listener); return }
    queue.push({
      id: createId(), owner, title, content,
      confirmText: options.confirmText || (options.showCancel === false ? '知道了' : '确定'),
      cancelText: options.cancelText || '取消',
      showCancel: options.showCancel !== false,
      danger: options.danger === true || /删除|清除|注销/.test(title),
      listeners: [listener],
    })
    pump()
  })
}
export function showNotice(options = {}) {
  const title = String(options.title || '').trim()
  if (!title) return
  const owner = feedbackState.owner
  const current = feedbackState.notice
  if (current && current.owner === owner && current.title === title && Date.now() - current.createdAt < 800) return
  clearTimeout(noticeTimer)
  feedbackState.notice = {
    id: createId(), owner, title, success: options.icon === 'success', createdAt: Date.now(),
  }
  noticeTimer = setTimeout(hideNotice, Math.max(1200, Math.min(Number(options.duration) || 2200, 6000)))
}
export function registerFeedbackOverlay(owner, close, dismissible = true) {
  const entry = { id: createId(), owner, close, dismissible }
  overlays.push(entry)
  return () => {
    const index = overlays.findIndex(item => item.id === entry.id)
    if (index >= 0) overlays.splice(index, 1)
  }
}
export function dismissFeedback(owner) {
  if (feedbackState.dialog && feedbackState.dialog.owner === owner) {
    closeDialog(false)
    return true
  }
  const overlay = overlays.slice().reverse().find(item => item.owner === owner)
  if (!overlay) return false
  if (overlay.dismissible) overlay.close()
  return true
}
