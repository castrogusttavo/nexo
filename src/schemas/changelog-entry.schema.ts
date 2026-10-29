import { z } from 'zod'
import { blogPostSlug } from './blog-post.schema'

const changelogItem = z.string().trim().min(3).max(300)

// The Markdown body is the "Novidades" part of an entry; improvements and
// fixes are shot one-liners, kept in the frontmatter so they render as the
// collapsible lists without a parsing convention in the body.
export const ChangelogEntryFrontmatterSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: blogPostSlug.refine((slug) => slug !== 'page', {
    message: 'Slug "page" é reservado para paginação do changelog',
  }),
  date: z.coerce.date(),
  summary: z.string().trim().min(10).max(300),
  improvements: z.array(changelogItem).default([]),
  fixes: z.array(changelogItem).default([]),
})

export type ChangelogEntryFrontmatter = z.infer<
  typeof ChangelogEntryFrontmatterSchema
>
