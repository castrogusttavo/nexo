import z from 'zod'

export const CreateAttachmentSchema = z.object({
  fileName: z
    .string()
    .min(1, 'Nome do arquivo é obrigatório')
    .max(255, 'Nome do arquivo deve ter no máximo 255 caracteres'),
  contentType: z.string().min(1).max(120),
  size: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024, 'Arquivo deve ter no máximo 25MB'),
})

export type CreateAttachmentDTO = z.infer<typeof CreateAttachmentSchema>
