import z from 'zod'

export const AddProjectMemberSchema = z.object({
  userId: z.cuid2('ID de usuário inválido'),
})

export type AddProjectMemberDTO = z.infer<typeof AddProjectMemberSchema>
