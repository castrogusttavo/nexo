import z from 'zod'

export const InvitableRoleValues = ['ADMIN', 'MEMBER', 'VIEWER'] as const

export const CreateInvitationSchema = z.object({
  email: z.email('E-mail inválido'),
  role: z.enum(InvitableRoleValues).default('MEMBER'),
  projectId: z.cuid2('ID de projeto inválido').optional(),
})

export type CreateInvitationDTO = z.infer<typeof CreateInvitationSchema>

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
})

export type AcceptInvitationDTO = z.infer<typeof AcceptInvitationSchema>
