import { describe, expect, it } from 'vitest'
import { createFakeWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { toWorkspaceDTO } from '@/src/mappers/workspace.mapper'

describe('toWorkspaceDTO()', () => {
  it('should map all fields correctly', () => {
    const ws = createFakeWorkspace({
      id: 'ws-1',
      name: 'Acme',
      slug: 'acme',
      activePlan: 'PRO',
    })

    const dto = toWorkspaceDTO(ws)

    expect(dto).toEqual({
      id: 'ws-1',
      name: 'Acme',
      slug: 'acme',
      activePlan: 'PRO',
      trialEndsAt: null,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    })
  })

  it('should serialize createdAt/updatedAt as ISO strings', () => {
    const created = new Date('2025-01-15T10:30:00.000Z')
    const updated = new Date('2025-02-01T08:00:00.000Z')
    const ws = createFakeWorkspace({ createdAt: created, updatedAt: updated })

    const dto = toWorkspaceDTO(ws)

    expect(dto.createdAt).toBe('2025-01-15T10:30:00.000Z')
    expect(dto.updatedAt).toBe('2025-02-01T08:00:00.000Z')
  })

  it('should default to FREE plan when factory default is used', () => {
    const dto = toWorkspaceDTO(createFakeWorkspace())

    expect(dto.activePlan).toBe('FREE')
  })
})
