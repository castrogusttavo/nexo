import { z } from 'zod'

export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter ao menos 2 caracteres')
    .max(50, 'Slug deve ter no máximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hífens',
    ),
})

export type CreateWorkspaceDTO = z.infer<typeof CreateWorkspaceSchema>

export const UpdateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug deve ter ao menos 2 caracteres')
    .max(50, 'Slug deve ter no máximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hífens',
    )
    .optional(),
})

export type UpdateWorkspaceDTO = z.infer<typeof UpdateWorkspaceSchema>
