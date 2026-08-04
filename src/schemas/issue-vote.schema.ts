import z from 'zod'

export const IssueVoteTypeSchema = z.enum(['UP', 'DOWN'])

export const CastIssueVoteSchema = z.object({
  type: IssueVoteTypeSchema,
})

export type CastIssueVoteDTO = z.infer<typeof CastIssueVoteSchema>
