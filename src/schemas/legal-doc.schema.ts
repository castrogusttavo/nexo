import z from 'zod'

const slugRegex = /^[a-z0-9-]+$/

export const legalDocSlug = z
  .string()
  .trim()
  .min(2, 'Slug deve ter ao menos 2 caracteres')
  .max(100, 'Slug deve ter no máximo 100 caracteres')
  .regex(
    slugRegex,
    'slug deve conter apenas letras minúsculas, números e hífens',
  )

export const LegalDocFrontmatterSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: legalDocSlug,
  date: z.coerce.date(),
  summary: z.string().trim().min(10).max(300),
})

export type LegalDocFrontmatter = z.infer<typeof LegalDocFrontmatterSchema>
