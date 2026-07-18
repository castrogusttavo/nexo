import z from 'zod'
import { EmailSchema } from './_shared'

export const InvitableRoleValues = ['ADMIN', 'MEMBER', 'VIEWER'] as const

export const CreateInvitationSchema = z.object({
  email: EmailSchema,
  role: z.enum(InvitableRoleValues).default('MEMBER'),
  projectId: z.cuid2('ID de projeto inválido').optional(),
})

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
})

export const InviteToProjectSchema = z.object({
  email: EmailSchema,
  role: z.enum(InvitableRoleValues).default('MEMBER'),
})

export const UpdateInvitationRoleSchema = z.object({
  role: z.enum(InvitableRoleValues),
})

export type CreateInvitationDTO = z.infer<typeof CreateInvitationSchema>

export type AcceptInvitationDTO = z.infer<typeof AcceptInvitationSchema>

export type InviteToProjectDTO = z.infer<typeof InviteToProjectSchema>

export type UpdateInvitationRoleDTO = z.infer<typeof UpdateInvitationRoleSchema>
