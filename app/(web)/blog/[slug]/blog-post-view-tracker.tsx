'use client'

import { sendGAEvent } from '@next/third-parties/google'
import { useEffect } from 'react'

interface Props {
  slug: string
  title: string
}

export function BlogPostViewTracker({ slug, title }: Props) {
  useEffect(() => {
    sendGAEvent('event', 'blog_post_read', {
      post_slug: slug,
      post_title: title,
    })
  }, [slug, title])

  return null
}
