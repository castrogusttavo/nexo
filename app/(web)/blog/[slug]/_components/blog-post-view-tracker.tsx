'use client'

import { useEffect } from 'react'
import { captureEvent } from '@/lib/posthog/client'

interface Props {
  slug: string
  title: string
}

export function BlogPostViewTracker({ slug, title }: Props) {
  useEffect(() => {
    captureEvent('blog_post_read', { post_slug: slug, post_title: title })
  }, [slug, title])

  return null
}
