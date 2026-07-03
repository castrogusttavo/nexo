import { z } from 'zod'

export const CreateSubscriptionSchema = z.object({
  plan: z.enum(['PRO', 'BUSINESS', 'ENTERPRISE']),
  workspaceId: z.string().min(1, 'workspaceId é obrigatório'),
})

export type CreateSubscriptionDTO = z.infer<typeof CreateSubscriptionSchema>
