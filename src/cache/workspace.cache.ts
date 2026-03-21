import { ensureRedisConnected } from '@/src/lib/redis'
import type { WorkspaceDTO } from '@/types/workspace'

const PREFIX = 'workspace:'
const TTL = 15 * 60 // 15 minutes

export const WorkspaceCache = {
  async get(workspaceId: string): Promise<WorkspaceDTO | null> {
    const client = await ensureRedisConnected()
    const data = await client.get(`${PREFIX}${workspaceId}`)

    if (!data) return null

    return JSON.parse(data) as WorkspaceDTO
  },

  async set(workspaceId: string, workspace: WorkspaceDTO): Promise<void> {
    const client = await ensureRedisConnected()
    await client.set(`${PREFIX}${workspaceId}`, JSON.stringify(workspace), { EX: TTL })
  },

  async invalidate(workspaceId: string): Promise<void> {
    const client = await ensureRedisConnected()
    await client.del(`${PREFIX}${workspaceId}`)
  },
}
