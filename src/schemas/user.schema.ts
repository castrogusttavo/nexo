import { z } from 'zod'

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

const usernameRegex = /^[a-z0-9._-]+$/

export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100)
    .optional(),
  email: z.email('E-mail inválido').optional(),
  username: z
    .string()
    .min(3, 'Username deve ter ao menos 3 caracteres')
    .max(39, 'Username deve ter no máximo 39 caracteres')
    .regex(
      usernameRegex,
      'Username deve conter apenas letras minúsculas, números, ponto, hífen e underscore',
    )
    .optional(),
  coverImage: z
    .string()
    .refine(
      (v) => v.startsWith('/') || z.url().safeParse(v).success,
      'URL de capa inválida',
    )
    .optional(),
})

export const SaveRoleSchema = z.object({
  role: z.enum(UserRoleValues),
})

export const SaveGoalsSchema = z.object({
  goals: z
    .array(z.enum(UserGoalValues))
    .min(1, 'Selecione ao menos um objetivo'),
})

export const SaveProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
})

export const AcceptConsentSchema = z.object({
  acceptedTerms: z.literal(true, {
    message: 'Você precisa aceitar os Termos de Serviço',
  }),
  acceptedPrivacy: z.literal(true, {
    message: 'Você precisa aceitar a Política de Privacidade',
  }),
})

export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>
export type SaveRoleDTO = z.infer<typeof SaveRoleSchema>
export type SaveGoalsDTO = z.infer<typeof SaveGoalsSchema>
export type SaveProfileDTO = z.infer<typeof SaveProfileSchema>
export type AcceptConsentDTO = z.infer<typeof AcceptConsentSchema>
