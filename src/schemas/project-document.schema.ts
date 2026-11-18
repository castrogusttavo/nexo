import { z } from 'zod'

const ProjectDocumentContentSchema = z
  .array(z.record(z.string(), z.unknown()))
  .refine(
    (value) => JSON.stringify(value).length <= 100_000,
    'Conteúdo excede o tamanho permitido',
  )

export const UpdateProjectDocumentSchema = z.object({
  content: ProjectDocumentContentSchema,
})

export type UpdateProjectDocumentDTO = z.infer<
  typeof UpdateProjectDocumentSchema
>
