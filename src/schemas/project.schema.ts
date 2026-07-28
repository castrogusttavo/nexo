import z from 'zod'

const slugRegex = /^[a-z0-9-]+$/

const projectName = z
  .string()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')

const projectSlug = z
  .string()
  .min(2, 'Slug deve ter ao menos 2 caracteres')
  .max(100, 'Slug deve ter no máximo 100 caracteres')
  .regex(
    slugRegex,
    'Slug deve conter apenas letras minúsculas, números e hífens',
  )

const projectDescription = z
  .string()
  .max(500, 'Descrição deve ter no máximo 500 caracteres')

const projectEmoji = z.string().max(30, 'Emoji inválido')

const projectCoverImage = z
  .string()
  .refine(
    (v) => v.startsWith('/') || z.url().safeParse(v).success,
    'URL de capa inválida',
  )

const projectIdentifier = z
  .string()
  .min(2, 'ID deve ter ao menos 2 caracteres')
  .max(10, 'ID deve ter no máximo 10 caracteres')
  .regex(/^[A-Z0-9]+$/, 'ID deve conter apenas letras maiúsculas e números')

export const CreateProjectSchema = z.object({
  name: projectName,
  slug: projectSlug,
  description: projectDescription.optional(),
  emoji: projectEmoji.optional(),
  coverImage: projectCoverImage.optional(),
  isPublic: z.boolean().default(false),
  issueTypesEnabled: z.boolean().default(true),
  modulesEnabled: z.boolean().default(true),
  cyclesEnabled: z.boolean().default(true),
  estimatesEnabled: z.boolean().default(true),
  identifier: projectIdentifier.optional(),
})

export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>

export const UpdateProjectSchema = z.object({
  name: projectName.optional(),
  slug: projectSlug.optional(),
  description: projectDescription.optional(),
  emoji: projectEmoji.optional(),
  coverImage: projectCoverImage.optional(),
  isPublic: z.boolean().optional(),
  issueTypesEnabled: z.boolean().optional(),
  modulesEnabled: z.boolean().optional(),
  cyclesEnabled: z.boolean().optional(),
  estimatesEnabled: z.boolean().optional(),
  identifier: projectIdentifier.optional(),
  leadId: z.cuid2('ID de usuário inválido').optional(),
})

export type UpdateProjectDTO = z.infer<typeof UpdateProjectSchema>

export const ListProjectsSchema = z.object({
  archived: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

export type ListProjectsDTO = z.infer<typeof ListProjectsSchema>
