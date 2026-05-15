import { z } from 'zod'

export const CreateShortLinkSchema = z.object({
  title: z
    .string()
    .min(2, 'Titulo deve ter ao menos 2 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),
  url: z
    .url('URL inválida')
    .max(2048, 'URL deve ter no máximo 2048 caracteres'),
})

export type CreateShortLinkDTO = z.infer<typeof CreateShortLinkSchema>

export const UpdateShortLinkSchema = z.object({
  title: z
    .string()
    .min(2, 'Titulo deve ter ao menos 2 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .optional(),
  url: z
    .url('URL inválida')
    .max(2048, 'URL deve ter no máximo 2048 caracteres')
    .optional(),
})

export type UpdateShortLinkDTO = z.infer<typeof UpdateShortLinkSchema>
