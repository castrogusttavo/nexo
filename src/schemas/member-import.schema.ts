import z from 'zod'
import { EmailSchema } from './_shared'
import { InvitableRoleValues } from './invitation.schema'

export const MemberImportRequiredColumns = [
  'email',
  'username',
  'name',
  'role',
] as const

export const MemberImportRowSchema = z.object({
  email: EmailSchema,
  username: z.string().trim().optional(),
  name: z.string().trim().optional(),
  role: z.enum(InvitableRoleValues).default('MEMBER'),
})

export type MemberImportRowDTO = z.infer<typeof MemberImportRowSchema>
