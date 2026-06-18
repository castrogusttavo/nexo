import z from 'zod'

const slugRegex = /^[a-z0-9-]+$/

export const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome de ter no máximo 100 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter ao menos 2 caracteres')
    .max(100, 'Slug de ter no máximo 100 caracteres')
    .regex(
      slugRegex,
      'Slug deve conter apenas letras minúsculas, números e hífens',
    ),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  emoji: z.string().max(30, 'Emoji inválido').optional(),
  coverImage: z
    .string()
    .refine(
      (v) => v.startsWith('/') || z.url().safeParse(v).success,
      'URL de capa inválida',
    )
    .optional(),
  isPublic: z.boolean().default(false),
})

export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>

export const UpdateProjectSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome de ter no máximo 100 caracteres')
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug deve ter ao menos 2 caracteres')
    .max(100, 'Slug de ter no máximo 100 caracteres')
    .regex(
      slugRegex,
      'Slug deve conter apenas letras minúsculas, números e hífens',
    )
    .optional(),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  emoji: z.string().max(30, 'Emoji inválido').optional(),
  coverImage: z
    .string()
    .refine(
      (v) => v.startsWith('/') || z.url().safeParse(v).success,
      'URL de capa inválida',
    )
    .optional(),
  isPublic: z.boolean().optional(),
})

export type UpdateProjectDTO = z.infer<typeof UpdateProjectSchema>

export const ListProjectsSchema = z.object({
  archived: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

export type ListProjectsDTO = z.infer<typeof ListProjectsSchema>
