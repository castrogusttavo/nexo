import { z } from 'zod'

const wikiPageTitle = z
  .string()
  .max(255, 'Título deve ter no máximo 255 caracteres')

const WikiPageContentSchema = z
  .array(z.record(z.string(), z.unknown()))
  .refine(
    (value) => JSON.stringify(value).length <= 100_000,
    'Conteúdo excede o tamanho permitido',
  )

export const CreateWikiPageSchema = z.object({
  title: wikiPageTitle.default(''),
  parentId: z.cuid2().optional(),
  icon: z.string().max(16).optional(),
})

export type CreateWikiPageDTO = z.infer<typeof CreateWikiPageSchema>

export const UpdateWikiPageSchema = z.object({
  title: wikiPageTitle.optional(),
  icon: z.string().max(16).nullable().optional(),
  coverImage: z.url().nullable().optional(),
  content: WikiPageContentSchema.optional(),
})

export type UpdateWikiPageDTO = z.infer<typeof UpdateWikiPageSchema>

export const MoveWikiPageSchema = z.object({
  parentId: z.cuid2().nullable(),
  position: z.number().int().nonnegative(),
})

export type MoveWikiPageDTO = z.infer<typeof MoveWikiPageSchema>
