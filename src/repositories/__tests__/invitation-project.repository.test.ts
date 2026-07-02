import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedInvitation } from '@/src/__tests__/factories/invitation.factory'
import { seedProject } from '@/src/__tests__/factories/project.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { expectOk } from '@/src/__tests__/helpers/result.helpers'
import { InvitationRepository } from '@/src/repositories/invitation.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InvitationRepository.listByProject()', () => {
  it('should return only PENDING invitations that belong to the project', async () => {
    const [inviter, ws] = await Promise.all([
      seedUser({ email: `inv-${Date.now()}@example.com` }),
      seedWorkspace(),
    ])
    const project = await seedProject(ws.id, inviter.id)

    await seedInvitation({
      invitedById: inviter.id,
      workspaceId: ws.id,
      projectId: project.id,
      email: 'pending@example.com',
    })
    await seedInvitation({
      invitedById: inviter.id,
      workspaceId: ws.id,
      projectId: project.id,
      email: 'revoked@example.com',
      status: 'REVOKED',
    })
    // A workspace-only invite (no projectId) must not leak into the list.
    await seedInvitation({
      invitedById: inviter.id,
      workspaceId: ws.id,
      email: 'workspace-only@example.com',
    })

    const list = expectOk(await InvitationRepository.listByProject(project.id))

    expect(list).toHaveLength(1)
    expect(list[0].email).toBe('pending@example.com')
  })
})
