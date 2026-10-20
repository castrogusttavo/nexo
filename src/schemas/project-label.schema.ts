import z from 'zod'
import { TagColorSchema } from './_shared'

const projectLabelName = z
  .string()
  .min(1, 'Nome deve ter ao menos 1 caractere')
  .max(50, 'Nome deve ter no máximo 50 caracteres')

const projectLabelDescription = z
  .string()
  .max(280, 'Descrição deve ter no máximo 280 caracteres')

// Labels a workspace puts on its projects ("Marketing", "Q4"), not the
// project-scoped labels its issues carry (label.schema.ts)
export const CreateProjectLabelSchema = z.object({
  name: projectLabelName,
  description: projectLabelDescription.optional(),
  color: TagColorSchema.default('ZINC'),
})

export type CreateProjectLabelDTO = z.infer<typeof CreateProjectLabelSchema>

export const UpdateProjectLabelSchema = z.object({
  name: projectLabelName.optional(),
  description: projectLabelDescription.optional(),
  color: TagColorSchema.optional(),
})

export type UpdateProjectLabelDTO = z.infer<typeof UpdateProjectLabelSchema>
