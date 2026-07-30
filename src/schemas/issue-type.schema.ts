import z from 'zod'
import { TagColorSchema } from './_shared'

const issueTypeName = z
  .string()
  .min(1, 'Nome deve ter ao menos 1 caractere')
  .max(50, 'Nome deve ter no máximo 50 caracteres')

const issueTypeDescription = z
  .string()
  .max(280, 'Descrição deve ter no máximo 280 caracteres')

const issueTypeIcon = z
  .string()
  .min(1, 'Ícone é obrigatório')
  .max(50, 'Ícone deve ter no máximo 50 caracteres')

export const CreateIssueTypeSchema = z.object({
  name: issueTypeName,
  description: issueTypeDescription.optional(),
  color: TagColorSchema.default('ZINC'),
  icon: issueTypeIcon,
})

export type CreateIssueTypeDTO = z.infer<typeof CreateIssueTypeSchema>

export const UpdateIssueTypeSchema = z.object({
  name: issueTypeName.optional(),
  description: issueTypeDescription.optional(),
  color: TagColorSchema.optional(),
  icon: issueTypeIcon.optional(),
})

export type UpdateIssueTypeDTO = z.infer<typeof UpdateIssueTypeSchema>

export const ReorderIssueTypesSchema = z.object({
  typeIds: z.array(z.string()).min(1),
})

export type ReorderIssueTypesDTO = z.infer<typeof ReorderIssueTypesSchema>
