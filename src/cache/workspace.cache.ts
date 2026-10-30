import type { WorkspaceDTO } from '@/types/workspace'
import { createKeyedCache } from './_cache'

export const WorkspaceCache = createKeyedCache<WorkspaceDTO>({
  // v2: the DTO gained projectStatesEnabled. A pre-deploy entry would read as
  // undefined (states hidden) for up to the TTL, so the old keys are skipped
  // and left to expire.
  // v3 -> v4: the DTO gained image, teamSize and timezone; a v3 entry would
  // read them as undefined for up to the TTL (a blank timezone in settings).
  prefix: 'workspace:v4:',
  ttl: 15 * 60, // 15 min
  name: 'workspace',
})
