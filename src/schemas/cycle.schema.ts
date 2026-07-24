import z from 'zod'

const cycleName = z
  .string()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(100, 'Nome deve ter no máximo 100 caracteres')

const cycleDescription = z
  .string()
  .max(500, 'Descrição deve ter no máximo 500 caracteres')

export const CycleStatusSchema = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
])

const IsoDate = z.iso.datetime({ offset: true })

export const CreateCycleSchema = z.object({
  name: cycleName,
  description: cycleDescription.optional(),
  status: CycleStatusSchema.default('NOT_STARTED'),
  startDate: IsoDate.optional(),
  endDate: IsoDate.optional(),
})

export type CreateCycleDTO = z.infer<typeof CreateCycleSchema>

export const UpdateCycleSchema = z.object({
  name: cycleName.optional(),
  description: cycleDescription.optional(),
  status: CycleStatusSchema.optional(),
  startDate: IsoDate.nullable().optional(),
  endDate: IsoDate.nullable().optional(),
})

export type UpdateCycleDTO = z.infer<typeof UpdateCycleSchema>
