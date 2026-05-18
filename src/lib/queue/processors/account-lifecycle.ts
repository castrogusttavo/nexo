import type { Job } from 'bullmq'
import { logger } from '@/lib/axiom/logger'
import { prisma } from '@/src/lib/prisma'
import { AccountLifecycleJob, type AccountLifecycleJobPayload } from '../jobs'

type DeleteAccountOutcome =
  | { status: 'deleted'; userId: string }
  | { status: 'skipped'; userId: string; reason: string }

async function processDeleteAccount(
  job: Job<AccountLifecycleJobPayload['delete-account']>,
): Promise<DeleteAccountOutcome> {
  const { userId } = job.data

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deletionScheduledAt: true },
  })

  if (!user) {
    logger.info('queue.account_lifecycle.delete_skipped', {
      component: 'AccountLifecycle',
      jobId: job.id,
      userId,
      reason: 'user_not_found',
    })
    return { status: 'skipped', userId, reason: 'user_not_found' }
  }

  const scheduledAt = user.deletionScheduledAt
  if (!scheduledAt) {
    logger.info('queue.account_lifecycle.delete_skipped', {
      component: 'AccountLifecycle',
      jobId: job.id,
      userId,
      reason: 'deletion_canceled',
    })
    return { status: 'skipped', userId, reason: 'deletion_canceled' }
  }

  await prisma.user.delete({ where: { id: userId } })

  logger.info('queue.account_lifecycle.account_deleted', {
    component: 'AccountLifecycle',
    jobId: job.id,
    userId,
    scheduledAt: scheduledAt.toISOString(),
  })

  return { status: 'deleted', userId }
}

export async function processAccountLifecycle(
  job: Job,
): Promise<DeleteAccountOutcome> {
  switch (job.name) {
    case AccountLifecycleJob.DeleteAccount:
      return processDeleteAccount(
        job as Job<AccountLifecycleJobPayload['delete-account']>,
      )
    default:
      throw new Error(
        `Unknown account-lifecycle job: ${job.name} (id=${job.id ?? 'unknown'})`,
      )
  }
}
