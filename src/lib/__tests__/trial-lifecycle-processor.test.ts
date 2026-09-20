import type { Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/axiom/logger'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/cache/workspace.cache')
vi.mock('@/src/repositories/workspace.repository')

import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { processTrialLifecycle } from '@/src/lib/queue/processors/trial-lifecycle'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'

const mockedWorkspace = vi.mocked(WorkspaceRepository)
const mockedWorkspaceCache = vi.mocked(WorkspaceCache)
const mockedLogger = vi.mocked(logger)

function fakeJob(name: string, id: string | undefined = 'job-1'): Job {
  return { id, name, data: {} } as unknown as Job
}

function idlessJob(name: string): Job {
  return { name, data: {} } as unknown as Job
}

describe('processTrialLifecycle', () => {
  beforeEach(() => {
    mockedWorkspaceCache.invalidate.mockResolvedValue(undefined)
  })

  it('reverts expired trials and invalidates every touched workspace', async () => {
    mockedWorkspace.revertExpiredTrials.mockResolvedValue(
      ok(['ws-1', 'ws-2', 'ws-3']),
    )

    const result = await processTrialLifecycle(fakeJob('revert-expired-trials'))

    expect(result).toEqual({ reverted: 3 })
    expect(mockedWorkspace.revertExpiredTrials).toHaveBeenCalledTimes(1)
    // The repository owns the "now" cutoff, so the processor passes nothing.
    expect(mockedWorkspace.revertExpiredTrials).toHaveBeenCalledWith()
    expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledTimes(3)
    expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledWith('ws-1')
    expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledWith('ws-2')
    expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledWith('ws-3')
  })

  it('is a no-op when no trial has expired', async () => {
    mockedWorkspace.revertExpiredTrials.mockResolvedValue(ok([]))

    const result = await processTrialLifecycle(fakeJob('revert-expired-trials'))

    expect(result).toEqual({ reverted: 0 })
    expect(mockedWorkspaceCache.invalidate).not.toHaveBeenCalled()
  })

  it('stays idempotent across consecutive runs', async () => {
    mockedWorkspace.revertExpiredTrials
      .mockResolvedValueOnce(ok(['ws-1']))
      .mockResolvedValueOnce(ok([]))

    const first = await processTrialLifecycle(fakeJob('revert-expired-trials'))
    const second = await processTrialLifecycle(
      fakeJob('revert-expired-trials', 'job-2'),
    )

    expect(first).toEqual({ reverted: 1 })
    expect(second).toEqual({ reverted: 0 })
    expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledTimes(1)
  })

  it('logs the reverted count with the job id', async () => {
    mockedWorkspace.revertExpiredTrials.mockResolvedValue(ok(['ws-1', 'ws-2']))

    await processTrialLifecycle(fakeJob('revert-expired-trials', 'job-42'))

    expect(mockedLogger.info).toHaveBeenCalledWith(
      'queue.trial_lifecycle.trials_reverted',
      expect.objectContaining({
        component: 'Worker',
        jobId: 'job-42',
        reverted: 2,
      }),
    )
  })

  it('throws with the error code when the repository fails', async () => {
    mockedWorkspace.revertExpiredTrials.mockResolvedValue(
      err(databaseError('Failed to revert expired trials')),
    )

    await expect(
      processTrialLifecycle(fakeJob('revert-expired-trials')),
    ).rejects.toThrow(/revertExpiredTrials failed: DATABASE_ERROR/)

    expect(mockedWorkspaceCache.invalidate).not.toHaveBeenCalled()
    expect(mockedLogger.info).not.toHaveBeenCalledWith(
      'queue.trial_lifecycle.trials_reverted',
      expect.anything(),
    )
  })

  it('does not fail the job when cache invalidation rejects', async () => {
    // The DB rows are already reverted and authoritative at this point, so
    // a Redis hiccup must not retry the job: the retry would re-run the
    // repository and report reverted: 0 for the same work.
    mockedWorkspace.revertExpiredTrials.mockResolvedValue(ok(['ws-1', 'ws-2']))
    mockedWorkspaceCache.invalidate.mockRejectedValueOnce(
      new Error('redis down'),
    )

    const result = await processTrialLifecycle(fakeJob('revert-expired-trials'))

    expect(result).toEqual({ reverted: 2 })
    expect(mockedWorkspaceCache.invalidate).toHaveBeenCalledTimes(2)
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'queue.trial_lifecycle.cache_invalidation_failed',
      expect.objectContaining({
        component: 'Worker',
        workspaceId: 'ws-1',
        message: 'redis down',
      }),
    )
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'queue.trial_lifecycle.trials_reverted',
      expect.objectContaining({ reverted: 2 }),
    )
  })

  it('stringifies a non-Error cache rejection in the failure log', async () => {
    mockedWorkspace.revertExpiredTrials.mockResolvedValue(ok(['ws-9']))
    mockedWorkspaceCache.invalidate.mockRejectedValueOnce('boom')

    const result = await processTrialLifecycle(fakeJob('revert-expired-trials'))

    expect(result).toEqual({ reverted: 1 })
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'queue.trial_lifecycle.cache_invalidation_failed',
      expect.objectContaining({ workspaceId: 'ws-9', message: 'boom' }),
    )
  })

  it('throws on unknown job name', async () => {
    await expect(
      processTrialLifecycle(fakeJob('cleanup-expired-sessions', 'job-9')),
    ).rejects.toThrow(
      /Unknown trial-lifecycle job: cleanup-expired-sessions \(id=job-9\)/,
    )

    expect(mockedWorkspace.revertExpiredTrials).not.toHaveBeenCalled()
  })

  it('falls back to "unknown" in the error when the job has no id', async () => {
    await expect(processTrialLifecycle(idlessJob('nope'))).rejects.toThrow(
      /id=unknown/,
    )
  })
})
