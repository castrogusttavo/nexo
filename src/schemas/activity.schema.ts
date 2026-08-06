import z from 'zod'

export const ActivityEntityTypeSchema = z.enum(['ISSUE', 'CYCLE', 'MODULE'])

export const ListActivityQuerySchema = z.object({
  entityType: ActivityEntityTypeSchema,
  entityId: z.cuid2(),
})

export type ListActivitiesQueryDTO = z.infer<typeof ListActivityQuerySchema>
