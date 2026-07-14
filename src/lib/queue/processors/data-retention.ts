import type { Job } from 'bullmq'
import { logger } from '@/lib/axiom/logger'
import { prisma } from '@/src/lib/prisma'
import { deleteObject } from '@/src/lib/storage/s3'
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

async function purgeExpiredCareerApplications(): Promise<CleanupResult> {
  const cutoff = new Date(
    Date.now() - RetentionWindowMs.careerApplicationAfterSubmission,
  )
  const expired = await prisma.careerApplication.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, resumeBucket: true, resumeKey: true },
  })

  await Promise.all(
    expired.map((app) =>
      deleteObject({ bucket: app.resumeBucket, key: app.resumeKey }).catch(
        (error) => {
          logger.error('queue.data_retention.resume_delete_failed', {
            component: 'Worker',
            applicationId: app.id,
            message: error instanceof Error ? error.message : String(error),
          })
        },
      ),
    ),
  )

  const { count } = await prisma.careerApplication.deleteMany({
    where: { id: { in: expired.map((app) => app.id) } },
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
    case DataRetentionJob.PurgeExpiredCareerApplications: {
      const result = await purgeExpiredCareerApplications()
      logger.info('queue.data_retention.career_applications_purged', {
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
