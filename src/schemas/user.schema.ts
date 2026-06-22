import { z } from 'zod'

export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100)
    .optional(),
  email: z.email('E-mail inválido').optional(),
})

export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>

export const UserRoleValues = [
  'PRODUCT_MANAGER',
  'ENGINEERING_MANAGER',
  'DESIGNER',
  'DEVELOPER',
  'FOUNDER_EXECUTIVE',
  'OPERATIONS_MANAGER',
  'OTHER',
] as const

export const UserGoalValues = [
  'ROADMAP',
  'SPRINTS',
  'CROSS_FUNCTIONAL',
  'REPLACE_TOOL',
  'EXPLORING',
]

export const SaveRoleSchema = z.object({
  role: z.enum(UserRoleValues),
})

export const SaveGoalsSchema = z.object({
  goals: z
    .array(z.enum(UserGoalValues))
    .min(1, 'Selecione ao menos um objetivo'),
})

export type SaveRoleDTO = z.infer<typeof SaveRoleSchema>
export type SaveGoalsDTO = z.infer<typeof SaveGoalsSchema>
