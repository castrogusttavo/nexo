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
      projectStatesEnabled: true,
      projectLabelsEnabled: true,
      image: null,
      teamSize: null,
      timezone: 'UTC',
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

  it('should carry the project states switch', () => {
    const dto = toWorkspaceDTO(
      createFakeWorkspace({ projectStatesEnabled: false }),
    )

    expect(dto.projectStatesEnabled).toBe(false)
  })

  it('should carry the project labels switch', () => {
    const dto = toWorkspaceDTO(
      createFakeWorkspace({ projectLabelsEnabled: false }),
    )

    expect(dto.projectLabelsEnabled).toBe(false)
  })

  it('should carry the logo url, team size and timezone', () => {
    const dto = toWorkspaceDTO(
      createFakeWorkspace({
        image: 'http://silo/workspace-logos/workspace/ws-1/a.png',
        teamSize: '11-50',
        timezone: 'America/Sao_Paulo',
      }),
    )

    expect(dto.image).toBe('http://silo/workspace-logos/workspace/ws-1/a.png')
    expect(dto.teamSize).toBe('11-50')
    expect(dto.timezone).toBe('America/Sao_Paulo')
  })
})
