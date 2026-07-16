import z from 'zod'

const slugRegex = /^[a-z0-9-]+$/

export const BLOG_POST_TAGS = [
  'TECNOLOGIA',
  'COMPARACOES',
  'CONCEITOS',
  'PRODUTO',
  'POV',
  'ANUNCIOS',
]

export type BlogPostTag = (typeof BLOG_POST_TAGS)[number]

export const blogPostSlug = z
  .string()
  .trim()
  .min(2, 'Slug deve ter ao menos 2 caracteres')
  .max(100, 'Slug deve ter no máximo 100 caracteres')
  .regex(
    slugRegex,
    'slug deve conter apenas letras minúsculas, números e hífens',
  )

export const BlogPostFrontmatterSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: blogPostSlug,
  date: z.coerce.date(),
  excerpt: z.string().trim().min(10).max(300),
  cover: z.string().trim().optional(),
  tag: z.enum(BLOG_POST_TAGS),
})

export type BlogPostFrontmatter = z.infer<typeof BlogPostFrontmatterSchema>
