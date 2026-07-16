import { BlogPostTag } from "@/src/schemas/blog-post.schema"

export interface BlogPostMetaDTO {
  slug: string
  title: string
  date: string
  excerpt: string
  cover: string | null
  tag: BlogPostTag
}

export interface BlogPostHeading {
  id: string
  level: 1 | 2 | 3 | 4
  text: string
}

export interface BlogPostDTO extends BlogPostMetaDTO {
  content: string
  contentHtml: string
  headings: BlogPostHeading[]
}
