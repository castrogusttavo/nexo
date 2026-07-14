import z from 'zod'

export const CAREER_JOB_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'] as const

const slugRegex = /^[a-z0-9-]+$/

export const careerJobSlug = z
  .string()
  .trim()
  .min(2, 'Slug deve ter ao menos 2 caracteres')
  .max(100, 'Slug deve ter no máximo 100 caracteres')
  .regex(
    slugRegex,
    'Slug deve conter apenas letras minúsculas, números e hífens',
  )

export const careerJobTitle = z
  .string()
  .trim()
  .min(2, 'Título deve ter ao menos 2 caracteres')
  .max(120, 'Título deve ter no máximo 120 caracteres')

export const careerJobDepartment = z
  .string()
  .trim()
  .max(80, 'Departamento deve ter no máximo 80 caracteres')

export const careerJobSummary = z
  .string()
  .trim()
  .min(10, 'Resumo deve ter ao menos 10 caracteres')
  .max(700, 'Resumo deve ter no máximo 700 caracteres')

const careerJobBullet = z
  .string()
  .trim()
  .min(2, 'Item muito curto')
  .max(300, 'Item muito longo')

export const CareerJobContentSchema = z.object({
  about: z
    .string()
    .trim()
    .min(10, 'Texto sobre a vaga muito curto')
    .max(2000, 'Texto sobre a vaga muito longo'),
  responsibilities: z
    .array(careerJobBullet)
    .min(1, 'Adicione ao menos uma responsabilidade'),
  requirements: z
    .array(careerJobBullet)
    .min(1, 'Adicione ao menos um requisito'),
  niceToHave: z.array(careerJobBullet).optional(),
  stack: z.array(careerJobBullet).min(1, 'Adicione ao menos uma tecnologia'),
})

export type CareerJobContentDTO = z.infer<typeof CareerJobContentSchema>

// New jobs always start as DRAFT (set by the service, not the client), so
// Create carries no default() field - safe to derive Update via .partial()
// without the reset-on-omit pitfall hit in project.schema.ts
export const CreateCareerJobSchema = z.object({
  slug: careerJobSlug,
  title: careerJobTitle,
  department: careerJobDepartment.optional(),
  summary: careerJobSummary,
  content: CareerJobContentSchema,
})

export type CreateCareerJobDTO = z.infer<typeof CreateCareerJobSchema>

export const UpdateCareerJobSchema = CreateCareerJobSchema.partial()

export type UpdateCareerJobDTO = z.infer<typeof UpdateCareerJobSchema>

// Status transitions (DRAFT -> OPEN -> CLOSED) are a distinct admin action
// from content edits, so they get their own schema/endpoint
export const ChangeCareerJobStatusSchema = z.object({
  status: z.enum(CAREER_JOB_STATUSES),
})

export type ChangeCareerJobStatusDTO = z.infer<
  typeof ChangeCareerJobStatusSchema
>
