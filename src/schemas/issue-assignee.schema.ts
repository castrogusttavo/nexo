import z from 'zod'

export const AssignIssueSchema = z.object({
  userId: z.cuid2(),
})

export type AssignIssueDTO = z.infer<typeof AssignIssueSchema>
