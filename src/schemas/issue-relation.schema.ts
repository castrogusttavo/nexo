import z from 'zod'

export const IssueRelationTypeSchema = z.enum(['RELATES_TO', 'IMPLEMENTS'])

export const CreateIssueRelationSchema = z.object({
  targetId: z.cuid2(),
  type: IssueRelationTypeSchema,
})

export type CreateIssueRelationDTO = z.infer<typeof CreateIssueRelationSchema>
