import { z } from 'zod'
import {
  COMPONENT_KEYS,
  type ComponentKey,
} from '@/src/services/status/components'

export const StatusHistoryQuerySchema = z.object({
  componentKey: z.enum(
    COMPONENT_KEYS as unknown as [ComponentKey, ...ComponentKey[]],
  ),
  days: z.coerce.number().int().min(1).max(365).default(90),
})

export type StatusHistoryQuery = z.infer<typeof StatusHistoryQuerySchema>
