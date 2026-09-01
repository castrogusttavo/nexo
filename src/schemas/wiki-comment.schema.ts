import { z } from 'zod'

const WikiCommentContentSchema = z
  .array(z.record(z.string(), z.unknown()))
  .refine(
    (value) => JSON.stringify(value).length <= 20_000,
    'Comentário excede o tamanho permitido',
  )

export const CreateWikiCommentSchema = z.object({
  markId: z.string().min(1).max(64),
  content: WikiCommentContentSchema,
  parentId: z.cuid2().optional(),
})

export type CreateWikiCommentDTO = z.infer<typeof CreateWikiCommentSchema>

export const UpdateWikiCommentSchema = z.object({
  content: WikiCommentContentSchema,
})

export type UpdateWikiCommentDTO = z.infer<typeof UpdateWikiCommentSchema>

export const ResolveWikiCommentSchema = z.object({
  resolved: z.boolean(),
})

export type ResolveWikiCommentDTO = z.infer<typeof ResolveWikiCommentSchema>
