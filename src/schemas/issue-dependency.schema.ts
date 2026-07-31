import z from 'zod'

export const IssueDependencyTypeSchema = z.enum([
  'BLOCKS',
  'STARTS_BEFORE',
  'FINISHES_BEFORE',
])

export const CreateIssueDependencySchema = z.object({
  targetId: z.cuid2(),
  type: IssueDependencyTypeSchema,
})

export type CreateIssueDependencyDTO = z.infer<
  typeof CreateIssueDependencySchema
>
