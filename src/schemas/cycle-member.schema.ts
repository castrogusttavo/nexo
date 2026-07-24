import z from 'zod'

export const AddCycleMemberSchema = z.object({
  userId: z.cuid2('ID de usuário inválido'),
})

export type AddCycleMemberDTO = z.infer<typeof AddCycleMemberSchema>
