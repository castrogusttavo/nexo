import type { Job } from 'bullmq'
import { logger } from '@/lib/axiom/logger'
import { prisma } from '@/src/lib/prisma'
import { DataRetentionJob } from '../jobs'
import { RetentionWindowMs } from '../retention'

type CleanupResult = {
  deleted: number
  cutoff: string
}

async function cleanupExpiredSessions(): Promise<CleanupResult> {
  const cutoff = new Date(Date.now() - RetentionWindowMs.sessionAfterExpiry)
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  })
  return { deleted: count, cutoff: cutoff.toISOString() }
}

async function cleanupExpiredVerifications(): Promise<CleanupResult> {
  const cutoff = new Date(
    Date.now() - RetentionWindowMs.verificationAfterExpiry,
  )
  const { count } = await prisma.verification.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  })
  return { deleted: count, cutoff: cutoff.toISOString() }
}

async function expireStaleInvitations(): Promise<CleanupResult> {
  const cutoff = new Date()
  const { count } = await prisma.workspaceInvitation.updateMany({
    where: { status: 'PENDING', expiresAt: { lt: cutoff } },
    data: { status: 'EXPIRED' },
  })
  return { deleted: count, cutoff: cutoff.toISOString() }
}

export async function processDataRetention(job: Job): Promise<CleanupResult> {
  switch (job.name) {
    case DataRetentionJob.CleanupExpiredSessions: {
      const result = await cleanupExpiredSessions()
      logger.info('queue.data_retention.sessions_cleaned', {
        component: 'Worker',
        jobId: job.id,
        deleted: result.deleted,
        cutoff: result.cutoff,
      })
      return result
    }
    case DataRetentionJob.CleanupExpiredVerificationTokens: {
      const result = await cleanupExpiredVerifications()
      logger.info('queue.data_retention.verifications_cleaned', {
        component: 'Worker',
        jobId: job.id,
        deleted: result.deleted,
        cutoff: result.cutoff,
      })
      return result
    }
    case DataRetentionJob.ExpireStaleInvitations: {
      const result = await expireStaleInvitations()
      logger.info('queue.data_retention.invitations_expired', {
        component: 'Worker',
        jobId: job.id,
        expired: result.deleted,
        cutoff: result.cutoff,
      })
      return result
    }
    default:
      throw new Error(
        `Unknown data-retention job: ${job.name} (id=${job.id ?? 'unknown'})`,
      )
  }
}
