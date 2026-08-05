import z from 'zod'

const CommentContentSchema = z
  .record(z.string(), z.unknown())
  .refine(
    (value) => JSON.stringify(value).length <= 100_000,
    'Comentário excede o tamanho permitido',
  )

export const CreateCommentSchema = z.object({
  content: CommentContentSchema,
  parentId: z.cuid2().optional(),
})

export type CreateCommentDTO = z.infer<typeof CreateCommentSchema>

export const UpdateCommentSchema = z.object({
  content: CommentContentSchema,
})
export type UpdateCommentDTO = z.infer<typeof UpdateCommentSchema>
