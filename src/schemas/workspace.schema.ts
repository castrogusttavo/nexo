import { z } from 'zod'

// Team-size buckets asked during onboarding; kept for plan segmentation.
export const TEAM_SIZES = [
  '1',
  '2-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
] as const

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
  teamSize: z.enum(TEAM_SIZES).optional(),
})

export type CreateWorkspaceDTO = z.infer<typeof CreateWorkspaceSchema>

export const UpdateWorkspaceSchema = CreateWorkspaceSchema.partial()

export type UpdateWorkspaceDTO = z.infer<typeof UpdateWorkspaceSchema>
