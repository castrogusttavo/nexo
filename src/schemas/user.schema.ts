import { z } from 'zod'

export const UpdateUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter ao menos 2 caracteres')
    .max(100)
    .optional(),
  email: z.email('E-mail inválido').optional(),
})

export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>
