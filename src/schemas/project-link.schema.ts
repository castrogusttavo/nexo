import { z } from 'zod'

const linkUrl = z
  .string()
  .trim()
  .max(2048, 'URL deve ter no máximo 2048 caracteres')
  .refine((value) => {
    try {
      const { protocol } = new URL(value)
      return protocol === 'http:' || protocol === 'https:'
    } catch {
      return false
    }
  }, 'URL inválida')

const linkTitle = z
  .string()
  .trim()
  .max(100, 'Título deve ter no máximo 100 caracteres')

export const CreateProjectLinkSchema = z.object({
  url: linkUrl,
  title: linkTitle.optional(),
})
export type CreateProjectLinkDTO = z.infer<typeof CreateProjectLinkSchema>

export const UpdateProjectLinkSchema = z
  .object({
    url: linkUrl.optional(),
    title: linkTitle.nullable().optional(),
  })
  .refine(
    (value) => value.url !== undefined || value.title !== undefined,
    'Informe ao menos um campo',
  )
export type UpdateProjectLinkDTO = z.infer<typeof UpdateProjectLinkSchema>
