import type { WorkspaceDTO } from '@/types/workspace'
import { createKeyedCache } from './_cache'

export const WorkspaceCache = createKeyedCache<WorkspaceDTO>({
  prefix: 'workspace:',
  ttl: 15 * 60, // 15 min
  name: 'workspace',
})
