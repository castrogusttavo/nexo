import type { Job } from 'bullmq'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/axiom/logger'

const {
  sessionDeleteManyMock,
  verificationDeleteManyMock,
  invitationUpdateManyMock,
  careerFindManyMock,
  careerDeleteManyMock,
  deleteObjectMock,
} = vi.hoisted(() => ({
  sessionDeleteManyMock: vi.fn(),
  verificationDeleteManyMock: vi.fn(),
  invitationUpdateManyMock: vi.fn(),
  careerFindManyMock: vi.fn(),
  careerDeleteManyMock: vi.fn(),
  deleteObjectMock: vi.fn(),
}))

vi.mock('@/src/lib/prisma', () => ({
  prisma: {
    session: { deleteMany: sessionDeleteManyMock },
    verification: { deleteMany: verificationDeleteManyMock },
    workspaceInvitation: { updateMany: invitationUpdateManyMock },
    careerApplication: {
      findMany: careerFindManyMock,
      deleteMany: careerDeleteManyMock,
    },
  },
}))
vi.mock('@/src/lib/storage/s3', () => ({
  deleteObject: deleteObjectMock,
}))

import { DataRetentionJob } from '@/src/lib/queue/jobs'
import { processDataRetention } from '@/src/lib/queue/processors/data-retention'
import { RetentionWindowMs } from '@/src/lib/queue/retention'

const mockedLogger = vi.mocked(logger)

const NOW = new Date('2026-09-20T03:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

function fakeJob(name: string, id: string | undefined = 'job-1'): Job {
  return { id, name, data: {} } as unknown as Job
}

function idlessJob(name: string): Job {
  return { name, data: {} } as unknown as Job
}

describe('processDataRetention', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    sessionDeleteManyMock.mockResolvedValue({ count: 0 })
    verificationDeleteManyMock.mockResolvedValue({ count: 0 })
    invitationUpdateManyMock.mockResolvedValue({ count: 0 })
    careerFindManyMock.mockResolvedValue([])
    careerDeleteManyMock.mockResolvedValue({ count: 0 })
    deleteObjectMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('cleanup-expired-sessions', () => {
    it('deletes sessions that expired more than 30 days ago', async () => {
      sessionDeleteManyMock.mockResolvedValue({ count: 7 })

      const result = await processDataRetention(
        fakeJob(DataRetentionJob.CleanupExpiredSessions),
      )

      const cutoff = new Date(NOW.getTime() - 30 * DAY_MS)
      expect(RetentionWindowMs.sessionAfterExpiry).toBe(30 * DAY_MS)
      expect(sessionDeleteManyMock).toHaveBeenCalledWith({
        where: { expiresAt: { lt: cutoff } },
      })
      expect(result).toEqual({ deleted: 7, cutoff: cutoff.toISOString() })
      // Only sessions get touched — no other table is swept by this job.
      expect(verificationDeleteManyMock).not.toHaveBeenCalled()
      expect(invitationUpdateManyMock).not.toHaveBeenCalled()
      expect(careerDeleteManyMock).not.toHaveBeenCalled()
    })

    it('logs the deleted count and the cutoff', async () => {
      sessionDeleteManyMock.mockResolvedValue({ count: 2 })

      await processDataRetention(
        fakeJob(DataRetentionJob.CleanupExpiredSessions, 'job-s'),
      )

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'queue.data_retention.sessions_cleaned',
        expect.objectContaining({
          component: 'Worker',
          jobId: 'job-s',
          deleted: 2,
          cutoff: new Date(NOW.getTime() - 30 * DAY_MS).toISOString(),
        }),
      )
    })

    it('is a no-op when nothing has expired', async () => {
      const result = await processDataRetention(
        fakeJob(DataRetentionJob.CleanupExpiredSessions),
      )

      expect(result.deleted).toBe(0)
    })

    it('rejects so BullMQ retries when the delete fails', async () => {
      sessionDeleteManyMock.mockRejectedValueOnce(new Error('db down'))

      await expect(
        processDataRetention(fakeJob(DataRetentionJob.CleanupExpiredSessions)),
      ).rejects.toThrow(/db down/)
    })
  })

  describe('cleanup-expired-verification-tokens', () => {
    it('deletes verifications that expired more than 1 day ago', async () => {
      verificationDeleteManyMock.mockResolvedValue({ count: 4 })

      const result = await processDataRetention(
        fakeJob(DataRetentionJob.CleanupExpiredVerificationTokens),
      )

      const cutoff = new Date(NOW.getTime() - DAY_MS)
      expect(RetentionWindowMs.verificationAfterExpiry).toBe(DAY_MS)
      expect(verificationDeleteManyMock).toHaveBeenCalledWith({
        where: { expiresAt: { lt: cutoff } },
      })
      expect(result).toEqual({ deleted: 4, cutoff: cutoff.toISOString() })
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'queue.data_retention.verifications_cleaned',
        expect.objectContaining({ deleted: 4 }),
      )
    })

    it('is a no-op when nothing has expired', async () => {
      const result = await processDataRetention(
        fakeJob(DataRetentionJob.CleanupExpiredVerificationTokens),
      )

      expect(result.deleted).toBe(0)
      expect(sessionDeleteManyMock).not.toHaveBeenCalled()
    })
  })

  describe('expire-stale-invitations', () => {
    it('flips only past-due PENDING invitations to EXPIRED', async () => {
      invitationUpdateManyMock.mockResolvedValue({ count: 3 })

      const result = await processDataRetention(
        fakeJob(DataRetentionJob.ExpireStaleInvitations),
      )

      // No grace window here: the cutoff is "now", not now minus a window.
      expect(invitationUpdateManyMock).toHaveBeenCalledWith({
        where: { status: 'PENDING', expiresAt: { lt: NOW } },
        data: { status: 'EXPIRED' },
      })
      expect(result).toEqual({ deleted: 3, cutoff: NOW.toISOString() })
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'queue.data_retention.invitations_expired',
        expect.objectContaining({ expired: 3, cutoff: NOW.toISOString() }),
      )
    })

    it('is idempotent when every invitation is already settled', async () => {
      const result = await processDataRetention(
        fakeJob(DataRetentionJob.ExpireStaleInvitations),
      )

      expect(result.deleted).toBe(0)
      expect(invitationUpdateManyMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('purge-expired-career-applications', () => {
    const expiredApps = [
      { id: 'app-1', resumeBucket: 'resumes', resumeKey: 'app-1/cv.pdf' },
      { id: 'app-2', resumeBucket: 'resumes', resumeKey: 'app-2/cv.pdf' },
    ]

    it('deletes each resume object before dropping the rows', async () => {
      careerFindManyMock.mockResolvedValue(expiredApps)
      careerDeleteManyMock.mockResolvedValue({ count: 2 })

      const result = await processDataRetention(
        fakeJob(DataRetentionJob.PurgeExpiredCareerApplications),
      )

      const cutoff = new Date(NOW.getTime() - 365 * DAY_MS)
      expect(RetentionWindowMs.careerApplicationAfterSubmission).toBe(
        365 * DAY_MS,
      )
      expect(careerFindManyMock).toHaveBeenCalledWith({
        where: { createdAt: { lt: cutoff } },
        select: { id: true, resumeBucket: true, resumeKey: true },
      })
      expect(deleteObjectMock).toHaveBeenCalledTimes(2)
      expect(deleteObjectMock).toHaveBeenCalledWith({
        bucket: 'resumes',
        key: 'app-1/cv.pdf',
      })
      expect(deleteObjectMock).toHaveBeenCalledWith({
        bucket: 'resumes',
        key: 'app-2/cv.pdf',
      })
      expect(careerDeleteManyMock).toHaveBeenCalledWith({
        where: { id: { in: ['app-1', 'app-2'] } },
      })
      expect(result).toEqual({ deleted: 2, cutoff: cutoff.toISOString() })
    })

    it('still purges the rows when an object delete fails, and logs it', async () => {
      careerFindManyMock.mockResolvedValue(expiredApps)
      careerDeleteManyMock.mockResolvedValue({ count: 2 })
      deleteObjectMock.mockRejectedValueOnce(new Error('minio down'))

      const result = await processDataRetention(
        fakeJob(DataRetentionJob.PurgeExpiredCareerApplications),
      )

      expect(result.deleted).toBe(2)
      expect(careerDeleteManyMock).toHaveBeenCalledWith({
        where: { id: { in: ['app-1', 'app-2'] } },
      })
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'queue.data_retention.resume_delete_failed',
        expect.objectContaining({
          component: 'Worker',
          applicationId: 'app-1',
          message: 'minio down',
        }),
      )
    })

    it('stringifies non-Error rejections in the failure log', async () => {
      careerFindManyMock.mockResolvedValue([expiredApps[0]])
      careerDeleteManyMock.mockResolvedValue({ count: 1 })
      deleteObjectMock.mockRejectedValueOnce('boom')

      await processDataRetention(
        fakeJob(DataRetentionJob.PurgeExpiredCareerApplications),
      )

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'queue.data_retention.resume_delete_failed',
        expect.objectContaining({ message: 'boom' }),
      )
    })

    it('touches no storage when nothing is old enough', async () => {
      const result = await processDataRetention(
        fakeJob(DataRetentionJob.PurgeExpiredCareerApplications),
      )

      expect(deleteObjectMock).not.toHaveBeenCalled()
      expect(result.deleted).toBe(0)
      // Nothing expired → no `id IN ()` round-trip to the DB either.
      expect(careerDeleteManyMock).not.toHaveBeenCalled()
      expect(result.cutoff).toBe(
        new Date(NOW.getTime() - 365 * DAY_MS).toISOString(),
      )
    })

    it('rejects when the row purge fails after the objects are gone', async () => {
      careerFindManyMock.mockResolvedValue(expiredApps)
      careerDeleteManyMock.mockRejectedValueOnce(new Error('db down'))

      await expect(
        processDataRetention(
          fakeJob(DataRetentionJob.PurgeExpiredCareerApplications),
        ),
      ).rejects.toThrow(/db down/)
      expect(deleteObjectMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('routing', () => {
    it('throws on unknown job name', async () => {
      await expect(
        processDataRetention(fakeJob('revert-expired-trials', 'job-9')),
      ).rejects.toThrow(
        /Unknown data-retention job: revert-expired-trials \(id=job-9\)/,
      )

      expect(sessionDeleteManyMock).not.toHaveBeenCalled()
      expect(verificationDeleteManyMock).not.toHaveBeenCalled()
      expect(invitationUpdateManyMock).not.toHaveBeenCalled()
      expect(careerFindManyMock).not.toHaveBeenCalled()
    })

    it('falls back to "unknown" in the error when the job has no id', async () => {
      await expect(processDataRetention(idlessJob('nope'))).rejects.toThrow(
        /id=unknown/,
      )
    })
  })
})
