import z from 'zod'
import { TagColorSchema } from './_shared'

const projectStateName = z
  .string()
  .min(1, 'Nome deve ter ao menos 1 caractere')
  .max(50, 'Nome deve ter no máximo 50 caracteres')

const projectStateDescription = z
  .string()
  .max(280, 'Descrição deve ter no máximo 280 caracteres')

// A project's lifecycle, not an issue's: these groups never mix with
// StateGroupSchema, and every workspace keeps at least one state per group
export const ProjectStateGroupSchema = z.enum([
  'DRAFT',
  'PLANNING',
  'EXECUTION',
  'MONITORING',
  'COMPLETED',
  'CANCELLED',
])

export type ProjectStateGroupDTO = z.infer<typeof ProjectStateGroupSchema>

export const CreateProjectStateSchema = z.object({
  name: projectStateName,
  description: projectStateDescription.optional(),
  group: ProjectStateGroupSchema,
  color: TagColorSchema.default('ZINC'),
})

export type CreateProjectStateDTO = z.infer<typeof CreateProjectStateSchema>

// No `group`: moving a state between could empty one begind the
// last-in-group rule, so a state is deleted an recreated instead.
export const UpdateProjectStateSchema = z.object({
  name: projectStateName.optional(),
  description: projectStateDescription.optional(),
  color: TagColorSchema.optional(),
  order: z.number().int().optional(),
})

export type UpdateProjectStateDTO = z.infer<typeof UpdateProjectStateSchema>
