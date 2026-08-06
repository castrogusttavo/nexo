import z from 'zod'

export const IssueUpdateStatusSchema = z.enum([
  'ON_TRACK',
  'AT_RISK',
  'OFF_TRACK',
])

const issueUpdateContent = z
  .string()
  .max(2000, 'Conteúdo deve ter no máximo 2000 caracteres')

export const CreateIssueUpdateSchema = z.object({
  status: IssueUpdateStatusSchema,
  content: issueUpdateContent.optional(),
})

export type CreateIssueUpdateDTO = z.infer<typeof CreateIssueUpdateSchema>

export const UpdateIssueUpdateSchema = z.object({
  status: IssueUpdateStatusSchema,
  content: issueUpdateContent.optional(),
})

export type UpdateIssueUpdateDTO = z.infer<typeof UpdateIssueUpdateSchema>
