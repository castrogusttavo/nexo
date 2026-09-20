import { logger } from '@/lib/axiom/logger'
import { ACCOUNT_DELETION_GRACE_OVERRIDE_MS } from '@/lib/env/_server'
import { AccountLifecycleJob } from './jobs'
import { getAccountLifecycleQueue } from './queues'

export const ACCOUNT_DELETION_GRACE_DAYS = 30
export const ACCOUNT_DELETION_GRACE_MS =
  ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000

// Allow shortening the grace period in dev/staging via env var
// (e.g. ACCOUNT_DELETION_GRACE_OVERRIDE_MS=60000 → 1 minute).
// Ignored in tests so the constant-based assertions stay deterministic.
export function getAccountDeletionGraceMs(): number {
  if (process.env.NODE_ENV === 'test') return ACCOUNT_DELETION_GRACE_MS
  return ACCOUNT_DELETION_GRACE_OVERRIDE_MS ?? ACCOUNT_DELETION_GRACE_MS
}

// BullMQ rejects ':' in custom job IDs because it uses ':' as the
// Redis key separator internally.
function deleteAccountJobId(userId: string): string {
  return `delete-account-${userId}`
}

// BullMQ's remove() answers 1 whenever the job is not locked — whether or
// not it ever existed — and 0 when a worker already holds the lock. It never
// rejects for a missing job, so existence has to be read separately for the
// return value to mean "there was a job and it is gone now".
async function removeDeleteAccountJob(
  userId: string,
  jobId: string,
): Promise<boolean> {
  const queue = getAccountLifecycleQueue()

  try {
    const job = await queue.getJob(jobId)
    if (!job) return false

    const removed = await queue.remove(jobId)
    if (removed > 0) return true

    // 0 = the job is locked, i.e. a worker is already processing it.
    logger.warn('queue.account_lifecycle.remove_locked', {
      component: 'AccountLifecycle',
      userId,
      jobId,
    })
    return false
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('queue.account_lifecycle.remove_failed', {
      component: 'AccountLifecycle',
      userId,
      jobId,
      message,
    })
    return false
  }
}

export async function scheduleAccountDeletion(
  userId: string,
  scheduledAt: Date,
): Promise<void> {
  const queue = getAccountLifecycleQueue()
  const jobId = deleteAccountJobId(userId)
  const delay = Math.max(0, scheduledAt.getTime() - Date.now())

  // A custom jobId makes BullMQ keep the FIRST job and silently drop the
  // second add(), so re-scheduling would never move the deadline. Remove
  // any pending job first: the latest schedule is the authoritative one.
  const replaced = await removeDeleteAccountJob(userId, jobId)

  await queue.add(
    AccountLifecycleJob.DeleteAccount,
    { userId },
    { jobId, delay },
  )

  logger.info('queue.account_lifecycle.deletion_scheduled', {
    component: 'AccountLifecycle',
    userId,
    scheduledAt: scheduledAt.toISOString(),
    delayMs: delay,
    replaced,
  })
}

/**
 * Removes the pending delete-account job for `userId`.
 *
 * @returns `true` when a job was actually removed, `false` when there was
 * nothing queued (or the removal failed) — callers must not report a
 * cancellation that did not happen.
 */
export async function cancelAccountDeletion(userId: string): Promise<boolean> {
  const jobId = deleteAccountJobId(userId)
  const removed = await removeDeleteAccountJob(userId, jobId)

  if (removed) {
    logger.info('queue.account_lifecycle.deletion_canceled', {
      component: 'AccountLifecycle',
      userId,
      jobId,
    })
  } else {
    logger.warn('queue.account_lifecycle.cancel_noop', {
      component: 'AccountLifecycle',
      userId,
      jobId,
    })
  }

  return removed
}
