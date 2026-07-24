import z from 'zod'

export const AddModuleMemberSchema = z.object({
  userId: z.cuid2('ID de usuário inválido'),
})

export type AddModuleMemberDTO = z.infer<typeof AddModuleMemberSchema>
