import z from 'zod'

const issueTitle = z
  .string()
  .min(1, 'Título deve ter ao menos 1 caractere')
  .max(255, 'Título deve ter no máximo 255 caracteres')

const IssueContentSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (value) => JSON.stringify(value).length <= 100_000,
    'Descrição excede o tamanho permitido',
  )

export const IssuePrioritySchema = z.enum([
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
])

export const CreateIssueSchema = z.object({
  title: issueTitle,
  description: IssueContentSchema,
  stateId: z.cuid2(),
  priority: IssuePrioritySchema.default('NONE'),
  typeId: z.cuid2().optional(),
})

export type CreateIssueDTO = z.infer<typeof CreateIssueSchema>

export const UpdateIssueSchema = CreateIssueSchema.partial()

export type UpdateIssueDTO = z.infer<typeof UpdateIssueSchema>
