import z from 'zod'

export const AddIssueLabelSchema = z.object({
  labelId: z.cuid2(),
})

export type AddIssueLabelDTO = z.infer<typeof AddIssueLabelSchema>
