import { onShow, onHide, onUnload, onBackPress } from '@dcloudio/uni-app'
import { createFeedbackOwner, activateFeedbackOwner, deactivateFeedbackOwner, releaseFeedbackOwner, dismissFeedback } from './feedback.js'

export const feedbackPageMixin = {
  data() { return { feedbackOwnerId: createFeedbackOwner() } },
  onShow() { activateFeedbackOwner(this.feedbackOwnerId) },
  onHide() { deactivateFeedbackOwner(this.feedbackOwnerId) },
  onUnload() { releaseFeedbackOwner(this.feedbackOwnerId) },
}
export function useFeedbackPage(options = {}) {
  const owner = createFeedbackOwner()
  onShow(() => activateFeedbackOwner(owner))
  onHide(() => deactivateFeedbackOwner(owner))
  onUnload(() => releaseFeedbackOwner(owner))
  if (options.handleBack !== false) onBackPress(() => dismissFeedback(owner))
  return owner
}
