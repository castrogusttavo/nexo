import { logger } from '@/lib/axiom/logger'
import { AccountLifecycleJob } from './jobs'
import { getAccountLifecycleQueue } from './queues'

export const ACCOUNT_DELETION_GRACE_DAYS = 30
export const ACCOUNT_DELETION_GRACE_MS =
  ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000

// BullMQ rejects ':' in custom job IDs because it uses ':' as the
// Redis key separator internally.
function deleteAccountJobId(userId: string): string {
  return `delete-account-${userId}`
}

export async function scheduleAccountDeletion(
  userId: string,
  scheduledAt: Date,
): Promise<void> {
  const queue = getAccountLifecycleQueue()
  const delay = Math.max(0, scheduledAt.getTime() - Date.now())

  await queue.add(
    AccountLifecycleJob.DeleteAccount,
    { userId },
    { jobId: deleteAccountJobId(userId), delay },
  )

  logger.info('queue.account_lifecycle.deletion_scheduled', {
    component: 'AccountLifecycle',
    userId,
    scheduledAt: scheduledAt.toISOString(),
    delayMs: delay,
  })
}

export async function cancelAccountDeletion(userId: string): Promise<boolean> {
  const queue = getAccountLifecycleQueue()
  const jobId = deleteAccountJobId(userId)

  try {
    await queue.remove(jobId)
    logger.info('queue.account_lifecycle.deletion_canceled', {
      component: 'AccountLifecycle',
      userId,
      jobId,
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('queue.account_lifecycle.cancel_noop', {
      component: 'AccountLifecycle',
      userId,
      jobId,
      message,
    })
    return false
  }
}
