import { debounce, parseAsString, parseAsStringEnum } from 'nuqs'
import { BLOG_POST_TAGS } from '@/src/schemas/blog-post.schema'

export const blogTagParser = parseAsStringEnum([...BLOG_POST_TAGS])
export const blogSearchParser = parseAsString.withOptions({
  limitUrlUpdates: debounce(300),
})
