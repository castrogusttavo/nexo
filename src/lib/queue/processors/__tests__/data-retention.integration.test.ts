import type { Job } from 'bullmq'
import { describe, expect, it } from 'vitest'
import { seedInvitation } from '@/src/__tests__/factories/invitation.factory'
import { seedUser } from '@/src/__tests__/factories/user.factory'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { prisma } from '@/src/lib/prisma'
import { DataRetentionJob } from '../../jobs'
import { processDataRetention } from '../data-retention'

function expireJob(): Job {
  return {
    name: DataRetentionJob.ExpireStaleInvitations,
    id: 'test-expire',
  } as unknown as Job
}

describe('processDataRetention() - ExpiresStaleInvitation', () => {
  it('should flip only past-due PENDING ivites to EXPIRED', async () => {
    const [inviter, ws] = await Promise.all([
      seedUser({ email: `inviter-${Date.now()}@xample.com` }),
      seedWorkspace(),
    ])

    const stale = await seedInvitation({
      invitedById: inviter.id,
      workspaceId: ws.id,
      email: 'stale@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() - 60_000),
    })
    const live = await seedInvitation({
      invitedById: inviter.id,
      workspaceId: ws.id,
      email: 'live@example.com',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 60_000),
    })
    const accepted = await seedInvitation({
      invitedById: inviter.id,
      workspaceId: ws.id,
      email: 'accepted@example.com',
      status: 'ACCEPTED',
      expiresAt: new Date(Date.now() - 60_000),
    })

    const result = (await processDataRetention(expireJob())) as {
      deleted: number
    }

    expect(result.deleted).toBe(1)

    const [staleAfter, liveAfter, acceptedAfter] = await Promise.all([
      prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: stale.id } }),
      prisma.workspaceInvitation.findUniqueOrThrow({ where: { id: live.id } }),
      prisma.workspaceInvitation.findUniqueOrThrow({
        where: { id: accepted.id },
      }),
    ])

    expect(staleAfter.status).toBe('EXPIRED')
    expect(liveAfter.status).toBe('PENDING')
    expect(acceptedAfter.status).toBe('ACCEPTED')
  })
})
