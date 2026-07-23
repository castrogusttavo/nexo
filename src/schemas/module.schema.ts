import z from 'zod'

const moduleName = z
  .string()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')

export const ModuleStatusSchema = z.enum([
  'BACKLOG',
  'PLANNED',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
])

const IsoDate = z.iso.datetime({ offset: true })

export const CreateModuleSchema = z.object({
  name: moduleName,
  status: ModuleStatusSchema.default('BACKLOG'),
  startDate: IsoDate.optional(),
  endDate: IsoDate.optional(),
})

export type CreateModuleDTO = z.infer<typeof CreateModuleSchema>

export const UpdateModuleSchema = z.object({
  name: moduleName.optional(),
  status: ModuleStatusSchema.optional(),
  startDate: IsoDate.optional(),
  endDate: IsoDate.optional(),
  progress: z.number().int().min(0).max(100).optional(),
})

export type UpdateModuleDTO = z.infer<typeof UpdateModuleSchema>
