import { describe, expect, it } from 'vitest'
import {
  BLOG_POST_TAGS,
  BlogPostFrontmatterSchema,
  blogPostSlug,
} from '../blog-post.schema'

const validFrontmatter = {
  title: 'Como usar Nexo',
  slug: 'como-usar-nexo',
  date: '2026-05-18',
  excerpt: 'Um resumo com mais de dez caracteres.',
  tag: 'PRODUTO',
}

describe('blogPostSlug', () => {
  it('accepts a lowercase slug with hyphens', () => {
    expect(blogPostSlug.safeParse('my-post-1').success).toBe(true)
  })

  it('rejects uppercase letters', () => {
    expect(blogPostSlug.safeParse('My-Post').success).toBe(false)
  })

  it('rejects a slug shorter than 2 characters', () => {
    expect(blogPostSlug.safeParse('a').success).toBe(false)
  })
})

describe('BlogPostFrontmatterSchema', () => {
  it('accepts a valid frontmatter payload', () => {
    expect(BlogPostFrontmatterSchema.safeParse(validFrontmatter).success).toBe(
      true,
    )
  })

  it('coerces the date field', () => {
    const result = BlogPostFrontmatterSchema.safeParse(validFrontmatter)
    expect(result.success && result.data.date).toBeInstanceOf(Date)
  })

  it('accepts every declared tag', () => {
    for (const tag of BLOG_POST_TAGS) {
      expect(
        BlogPostFrontmatterSchema.safeParse({ ...validFrontmatter, tag })
          .success,
      ).toBe(true)
    }
  })

  it('rejects an unknown tag', () => {
    expect(
      BlogPostFrontmatterSchema.safeParse({
        ...validFrontmatter,
        tag: 'UNKNOWN',
      }).success,
    ).toBe(false)
  })

  it('rejects an excerpt shorter than 10 characters', () => {
    expect(
      BlogPostFrontmatterSchema.safeParse({
        ...validFrontmatter,
        excerpt: 'too short',
      }).success,
    ).toBe(false)
  })

  it('allows cover to be omitted', () => {
    const { cover: _cover, ...rest } = validFrontmatter as Record<
      string,
      unknown
    >
    expect(BlogPostFrontmatterSchema.safeParse(rest).success).toBe(true)
  })
})
