import z from 'zod'
import { TagColorSchema } from './_shared'

const labelName = z
  .string()
  .min(1, 'Nome deve ter ao menos 1 caractere')
  .max(50, 'Nome deve ter no máximo 50 caracteres')

const labelDescription = z
  .string()
  .max(280, 'Descrição deve ter no máximo 280 caracteres')

export const CreateLabelSchema = z.object({
  name: labelName,
  description: labelDescription.optional(),
  color: TagColorSchema.default('ZINC'),
})

export type CreateLabelDTO = z.infer<typeof CreateLabelSchema>

export const UpdateLabelSchema = z.object({
  name: labelName.optional(),
  description: labelDescription.optional(),
  color: TagColorSchema.optional(),
})

export type UpdateLabelDTO = z.infer<typeof UpdateLabelSchema>
