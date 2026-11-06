import { z } from 'zod'

export const UpdateStatusSchema = z.enum(['ON_TRACK', 'AT_RISK', 'OFF_TRACK'])
export type UpdateStatusDTO = z.infer<typeof UpdateStatusSchema>

const updateContent = z
  .string()
  .max(2000, 'Conteúdo deve ter no máximo 2000 caracteres')

export const CreateUpdateSchema = z.object({
  status: UpdateStatusSchema,
  content: updateContent.optional(),
})
export type CreateUpdateDTO = z.infer<typeof CreateUpdateSchema>

export const EditUpdateSchema = CreateUpdateSchema
export type EditUpdateDTO = CreateUpdateDTO

export const CreateUpdateReplySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Resposta não pode ser vazia')
    .max(2000, 'Resposta deve ter no máximo 2000 caracteres'),
})
export type CreateUpdateReplyDTO = z.infer<typeof CreateUpdateReplySchema>

export const EditUpdateReplySchema = CreateUpdateReplySchema
export type EditUpdateReplyDTO = z.infer<typeof EditUpdateReplySchema>

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

const EMOJI_START =
  /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3)/u

export function isSingleEmoji(value: string): boolean {
  if (value.length === 0 || value.length > 32) return false
  return [...segmenter.segment(value)].length === 1 && EMOJI_START.test(value)
}

export const UpdateEmojiSchema = z
  .string()
  .refine(isSingleEmoji, 'Reação deve ser um único emoji')

export const ListUpdatesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})
export type ListUpdatesQuery = z.infer<typeof ListUpdatesQuerySchema>
