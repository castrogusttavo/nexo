import z from 'zod'
import { TagColorSchema } from './_shared'

const stateName = z
  .string()
  .min(1, 'Nome deve ter ao menos 1 caractere')
  .max(50, 'Nome deve ter no máximo 50 caracteres')

const stateDescription = z
  .string()
  .max(280, 'Descrição deve ter no máximo 280 caracteres')

export const StateGroupSchema = z.enum([
  'BACKLOG',
  'UNSTARTED',
  'STARTED',
  'COMPLETED',
  'CANCELLED',
])

export const CreateStateSchema = z.object({
  name: stateName,
  description: stateDescription.optional(),
  group: StateGroupSchema,
  color: TagColorSchema.default('ZINC'),
})

export type CreateStateDTO = z.infer<typeof CreateStateSchema>

export const UpdateStateSchema = z.object({
  name: stateName.optional(),
  description: stateDescription.optional(),
  color: TagColorSchema.optional(),
  order: z.number().int().optional(),
})

export type UpdateStateDTO = z.infer<typeof UpdateStateSchema>
