import { createPlatePlugin } from 'platejs/react'

// Shared UI state for the comment/discussion feature: which mark's thread is
// currently open. Kept in its own file (no render wiring here) so it can be
// imported by CommentLeaf, DiscussionOverlay, DiscussionThread and
// CommentToolbarButton without any of them forming an import cycle with
// discussion-kit.tsx, which is the one file that wires DiscussionOverlay in.
export const discussionPlugin = createPlatePlugin({
  key: 'discussion',
  options: {
    activeId: null as string | null,
  },
})
