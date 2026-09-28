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
  // No `email` here, on purpose. This endpoint applied one straight to the
  // row, checking only that nobody else held it and leaving `emailVerified`
  // as it was — so an account verified under one address could take over
  // another without ever proving it owned it. With the platform admin list
  // keyed by e-mail, that was a two-request path from any signed-in user to
  // platform admin whenever an allowlisted address was unregistered. Changing
  // an e-mail has to go through a flow that mails the new address.
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
  // Opt-in only: absent means no consent (LGPD requires an active choice).
  marketingConsent: z.boolean().default(false),
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
