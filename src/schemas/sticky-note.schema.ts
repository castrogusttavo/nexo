import { z } from 'zod'

export const StickyColorSchema = z.enum([
  'RED',
  'YELLOW',
  'BLUE',
  'GREEN',
  'PURPLE',
  'ZINC',
])

const TipTapContentSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (value) => JSON.stringify(value).length <= 100_000,
    'Conteúdo do sticky excede o tamanho permitido',
  )

export const CreateStickyNoteSchema = z.object({
  content: TipTapContentSchema.optional(),
  color: StickyColorSchema.optional(),
})

export type CreateStickyNoteDTO = z.infer<typeof CreateStickyNoteSchema>

export const UpdateStickyNoteSchema = z.object({
  content: TipTapContentSchema.optional(),
  color: StickyColorSchema.optional(),
})

export type UpdateStickyNoteDTO = z.infer<typeof UpdateStickyNoteSchema>
