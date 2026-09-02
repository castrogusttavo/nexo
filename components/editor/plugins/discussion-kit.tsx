'use client'

import { DiscussionOverlay } from '@/components/ui/discussion-overlay'
import { discussionPlugin } from './discussion-plugin'

export const DiscussionKit = [
  discussionPlugin.configure({
    render: { afterEditable: DiscussionOverlay },
  }),
]

export { discussionPlugin }
