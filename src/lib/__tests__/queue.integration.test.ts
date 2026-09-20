import type { Queue } from 'bullmq'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

// The integration project has no global logger mock (that one lives in
// setup.unit), and the queue helpers log on every call — keep Axiom out.
vi.mock('@/lib/axiom/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    flush: vi.fn(),
  },
}))

import { TRIAL_EXPIRY_CRON } from '@/src/config/trial'
import {
  cancelAccountDeletion,
  scheduleAccountDeletion,
} from '@/src/lib/queue/account-lifecycle'
import { closeQueueConnection } from '@/src/lib/queue/connection'
import { enqueueUserExport } from '@/src/lib/queue/data-export'
import {
  AccountLifecycleJob,
  DataExportJob,
  DataRetentionJob,
  QueueName,
  TrialLifecycleJob,
} from '@/src/lib/queue/jobs'
import {
  closeQueues,
  getAccountLifecycleQueue,
  getDataExportQueue,
  getDataRetentionQueue,
  getTrialLifecycleQueue,
} from '@/src/lib/queue/queues'
import { RetentionCron, RetentionTimezone } from '@/src/lib/queue/retention'
import {
  scheduleDataRetentionJobs,
  scheduleTrialLifecycleJobs,
} from '@/src/lib/queue/scheduler'

function allQueues(): Queue[] {
  return [
    getDataRetentionQueue() as unknown as Queue,
    getAccountLifecycleQueue() as unknown as Queue,
    getDataExportQueue() as unknown as Queue,
    getTrialLifecycleQueue() as unknown as Queue,
  ]
}

afterEach(async () => {
  for (const queue of allQueues()) {
    // Job schedulers survive obliterate on some paths, so drop them by id
    // first; obliterate then clears jobs, both plain and delayed.
    const schedulers = await queue.getJobSchedulers()
    await Promise.all(
      schedulers.map((scheduler) => queue.removeJobScheduler(scheduler.key)),
    )
    await queue.obliterate({ force: true })
  }
})

afterAll(async () => {
  await closeQueues()
  await closeQueueConnection()
})

describe('queue layer against a real Redis', () => {
  describe('queue identity', () => {
    it('names the four queues exactly as the worker registers them', () => {
      expect(getDataRetentionQueue().name).toBe(QueueName.DataRetention)
      expect(getAccountLifecycleQueue().name).toBe(QueueName.AccountLifecycle)
      expect(getDataExportQueue().name).toBe(QueueName.DataExport)
      expect(getTrialLifecycleQueue().name).toBe(QueueName.TrialLifecycle)
    })

    it('returns the same lazy singleton on repeated calls', () => {
      expect(getDataExportQueue()).toBe(getDataExportQueue())
      expect(getAccountLifecycleQueue()).toBe(getAccountLifecycleQueue())
    })
  })

  describe('enqueueUserExport()', () => {
    it('lands a job with the expected name, payload and retry policy', async () => {
      const jobId = await enqueueUserExport('user-export-1')
      expect(jobId).not.toBe('')

      const job = await getDataExportQueue().getJob(jobId)
      expect(job).toBeDefined()
      expect(job?.name).toBe(DataExportJob.ExportUserData)
      expect(job?.data).toEqual({ userId: 'user-export-1' })

      // defaultJobOptions from queues.ts, applied by BullMQ at add() time.
      expect(job?.opts.attempts).toBe(3)
      expect(job?.opts.backoff).toEqual({ type: 'exponential', delay: 5000 })
      expect(job?.opts.removeOnComplete).toEqual({
        age: 60 * 60 * 24,
        count: 1000,
      })
      expect(job?.opts.removeOnFail).toEqual({ age: 60 * 60 * 24 * 7 })
    })

    it('enqueues one job per call (no implicit dedup on the export queue)', async () => {
      const first = await enqueueUserExport('user-export-2')
      const second = await enqueueUserExport('user-export-2')

      expect(first).not.toBe(second)
      expect(await getDataExportQueue().getWaitingCount()).toBe(2)
    })
  })

  describe('scheduleAccountDeletion()', () => {
    it('creates a delayed job under a deterministic jobId', async () => {
      const delayMs = 60_000
      const scheduledAt = new Date(Date.now() + delayMs)

      await scheduleAccountDeletion('user-del-1', scheduledAt)

      const queue = getAccountLifecycleQueue()
      const job = await queue.getJob('delete-account-user-del-1')
      expect(job).toBeDefined()
      expect(job?.name).toBe(AccountLifecycleJob.DeleteAccount)
      expect(job?.data).toEqual({ userId: 'user-del-1' })
      expect(await job?.getState()).toBe('delayed')

      // The helper derives the delay from the wall clock, so allow slack.
      expect(job?.opts.delay).toBeGreaterThan(delayMs - 5_000)
      expect(job?.opts.delay).toBeLessThanOrEqual(delayMs)
      expect(await queue.getDelayedCount()).toBe(1)
      expect(await queue.getWaitingCount()).toBe(0)
    })

    it('clamps a past deadline to an immediately runnable job', async () => {
      const queue = getAccountLifecycleQueue()

      await scheduleAccountDeletion(
        'user-del-past',
        new Date(Date.now() - 10 * 60_000),
      )

      const job = await queue.getJob('delete-account-user-del-past')
      expect(job?.opts.delay).toBe(0)
      expect(await job?.getState()).toBe('waiting')
      expect(await queue.getDelayedCount()).toBe(0)
    })

    it('re-scheduling the same user replaces the deadline, keeping one job', async () => {
      const queue = getAccountLifecycleQueue()
      const first = new Date(Date.now() + 60_000)
      const second = new Date(Date.now() + 10 * 60_000)

      await scheduleAccountDeletion('user-del-2', first)
      await scheduleAccountDeletion('user-del-2', second)

      expect(await queue.getDelayedCount()).toBe(1)
      const job = await queue.getJob('delete-account-user-del-2')
      // The helper drops the pending job first, so the LATEST deadline wins.
      expect(job?.opts.delay).toBeGreaterThan(60_000)
      expect(job?.opts.delay).toBeLessThanOrEqual(10 * 60_000)
    })

    it('can pull a deadline forward as well as push it out', async () => {
      const queue = getAccountLifecycleQueue()

      await scheduleAccountDeletion(
        'user-del-5',
        new Date(Date.now() + 10 * 60_000),
      )
      await scheduleAccountDeletion('user-del-5', new Date(Date.now() + 60_000))

      const job = await queue.getJob('delete-account-user-del-5')
      expect(job?.opts.delay).toBeLessThanOrEqual(60_000)
      expect(await queue.getDelayedCount()).toBe(1)
    })

    it('keeps deletions for different users apart', async () => {
      await scheduleAccountDeletion('user-a', new Date(Date.now() + 60_000))
      await scheduleAccountDeletion('user-b', new Date(Date.now() + 60_000))

      const queue = getAccountLifecycleQueue()
      expect(await queue.getDelayedCount()).toBe(2)
      expect(await queue.getJob('delete-account-user-a')).toBeDefined()
      expect(await queue.getJob('delete-account-user-b')).toBeDefined()
    })
  })

  describe('cancelAccountDeletion()', () => {
    it('removes the scheduled job and reports success', async () => {
      const queue = getAccountLifecycleQueue()
      await scheduleAccountDeletion('user-del-3', new Date(Date.now() + 60_000))
      expect(await queue.getJob('delete-account-user-del-3')).toBeDefined()

      const canceled = await cancelAccountDeletion('user-del-3')

      expect(canceled).toBe(true)
      expect(await queue.getJob('delete-account-user-del-3')).toBeUndefined()
      expect(await queue.getDelayedCount()).toBe(0)
    })

    it('reports false when there was nothing to cancel', async () => {
      // BullMQ's remove() resolves with 0 for a missing job instead of
      // throwing; the helper reads that count so the boolean means
      // "removed" rather than "did not blow up".
      const canceled = await cancelAccountDeletion('user-never-scheduled')

      expect(canceled).toBe(false)
    })

    it('reports false on a second cancel for the same user', async () => {
      await scheduleAccountDeletion('user-del-6', new Date(Date.now() + 60_000))

      expect(await cancelAccountDeletion('user-del-6')).toBe(true)
      expect(await cancelAccountDeletion('user-del-6')).toBe(false)
    })

    it('cancels only the targeted user', async () => {
      const queue = getAccountLifecycleQueue()
      await scheduleAccountDeletion('user-keep', new Date(Date.now() + 60_000))
      await scheduleAccountDeletion('user-drop', new Date(Date.now() + 60_000))

      await cancelAccountDeletion('user-drop')

      expect(await queue.getJob('delete-account-user-drop')).toBeUndefined()
      expect(await queue.getJob('delete-account-user-keep')).toBeDefined()
    })

    it('lets the user be re-scheduled after a cancel', async () => {
      const queue = getAccountLifecycleQueue()
      await scheduleAccountDeletion('user-del-4', new Date(Date.now() + 60_000))
      await cancelAccountDeletion('user-del-4')

      await scheduleAccountDeletion(
        'user-del-4',
        new Date(Date.now() + 120_000),
      )

      const job = await queue.getJob('delete-account-user-del-4')
      expect(job).toBeDefined()
      expect(job?.opts.delay).toBeGreaterThan(60_000)
    })
  })

  describe('scheduleDataRetentionJobs()', () => {
    it('registers the four retention schedulers on the daily 03:00 UTC cron', async () => {
      await scheduleDataRetentionJobs()

      const queue = getDataRetentionQueue()
      const schedulers = await queue.getJobSchedulers()

      expect(schedulers.map((s) => s.key).sort()).toEqual(
        [
          DataRetentionJob.CleanupExpiredSessions,
          DataRetentionJob.CleanupExpiredVerificationTokens,
          DataRetentionJob.ExpireStaleInvitations,
          DataRetentionJob.PurgeExpiredCareerApplications,
        ].sort(),
      )

      for (const scheduler of schedulers) {
        expect(scheduler.pattern).toBe(RetentionCron.dataRetention)
        expect(scheduler.tz).toBe(RetentionTimezone)
        // The scheduler id doubles as the job name the processor switches on.
        expect(scheduler.name).toBe(scheduler.key)
        expect(scheduler.next).toBeGreaterThan(Date.now())
      }
    })

    it('is idempotent across worker restarts', async () => {
      await scheduleDataRetentionJobs()
      await scheduleDataRetentionJobs()

      expect(await getDataRetentionQueue().getJobSchedulersCount()).toBe(4)
    })

    it('queues the first delayed run of every retention job', async () => {
      await scheduleDataRetentionJobs()

      // upsertJobScheduler materialises the next occurrence immediately.
      expect(await getDataRetentionQueue().getDelayedCount()).toBe(4)
    })
  })

  describe('scheduleTrialLifecycleJobs()', () => {
    it('registers the hourly revert-expired-trials scheduler', async () => {
      await scheduleTrialLifecycleJobs()

      const schedulers = await getTrialLifecycleQueue().getJobSchedulers()

      expect(schedulers).toHaveLength(1)
      expect(schedulers[0].key).toBe(TrialLifecycleJob.RevertExpiredTrials)
      expect(schedulers[0].name).toBe(TrialLifecycleJob.RevertExpiredTrials)
      expect(schedulers[0].pattern).toBe(TRIAL_EXPIRY_CRON)
      expect(schedulers[0].tz).toBe(RetentionTimezone)
    })

    it('schedules the next run less than an hour out', async () => {
      await scheduleTrialLifecycleJobs()

      const [scheduler] = await getTrialLifecycleQueue().getJobSchedulers()
      const untilNext = (scheduler.next ?? 0) - Date.now()

      expect(untilNext).toBeGreaterThan(0)
      expect(untilNext).toBeLessThanOrEqual(60 * 60 * 1000)
    })

    it('is idempotent across worker restarts', async () => {
      await scheduleTrialLifecycleJobs()
      await scheduleTrialLifecycleJobs()

      expect(await getTrialLifecycleQueue().getJobSchedulersCount()).toBe(1)
    })

    it('does not leak schedulers into the other queues', async () => {
      await scheduleTrialLifecycleJobs()

      expect(await getDataRetentionQueue().getJobSchedulersCount()).toBe(0)
      expect(await getAccountLifecycleQueue().getJobSchedulersCount()).toBe(0)
      expect(await getDataExportQueue().getJobSchedulersCount()).toBe(0)
    })
  })

  describe('isolation between queues', () => {
    it('keeps payloads on their own queue', async () => {
      await enqueueUserExport('user-iso')
      await scheduleAccountDeletion('user-iso', new Date(Date.now() + 60_000))

      expect(await getDataExportQueue().getWaitingCount()).toBe(1)
      expect(await getDataExportQueue().getDelayedCount()).toBe(0)
      expect(await getAccountLifecycleQueue().getWaitingCount()).toBe(0)
      expect(await getAccountLifecycleQueue().getDelayedCount()).toBe(1)
      expect(await getDataRetentionQueue().getJobCounts()).toEqual(
        expect.objectContaining({ waiting: 0, delayed: 0 }),
      )
      expect(await getTrialLifecycleQueue().getJobCounts()).toEqual(
        expect.objectContaining({ waiting: 0, delayed: 0 }),
      )
    })
  })
})
