import { pageLayoutStyle, refreshPageLayout } from './page-layout.js'
import { attachOptionsDraft, detachOptionsDraft, currentPageRoute } from './session-drafts.js'
import { maybePromptWishlist } from './wishlist-reminder.js'
import { maybeCheckAppUpdate } from './app-update.js'
import { onShow, onHide, onUnload, onBackPress, onResize } from '@dcloudio/uni-app'
import { createFeedbackOwner, activateFeedbackOwner, deactivateFeedbackOwner, releaseFeedbackOwner, dismissFeedback } from './feedback.js'

export const feedbackPageMixin = {
  data() { return { feedbackOwnerId: createFeedbackOwner() } },
  computed: { pageLayoutStyle() { return pageLayoutStyle } },
  onShow() {
    refreshPageLayout();activateFeedbackOwner(this.feedbackOwnerId)
    const route=currentPageRoute()
    this.$nextTick(()=>{if(currentPageRoute()===route)attachOptionsDraft(this)})
    maybePromptWishlist(this.feedbackOwnerId)
    maybeCheckAppUpdate()
  },
  onResize() { refreshPageLayout() },
  onHide() { deactivateFeedbackOwner(this.feedbackOwnerId) },
  onUnload() { detachOptionsDraft(this); releaseFeedbackOwner(this.feedbackOwnerId) },
}
export function useFeedbackPage(options = {}) {
  const owner = createFeedbackOwner()
  onShow(() => { refreshPageLayout(); activateFeedbackOwner(owner); maybePromptWishlist(owner); maybeCheckAppUpdate() })
  onResize(() => refreshPageLayout())
  onHide(() => deactivateFeedbackOwner(owner))
  onUnload(() => releaseFeedbackOwner(owner))
  if (options.handleBack !== false) onBackPress(() => dismissFeedback(owner))
  return owner
}
