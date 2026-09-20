import type { Job } from 'bullmq'
import { logger } from '@/lib/axiom/logger'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import { TrialLifecycleJob } from '../jobs'

export async function processTrialLifecycle(
  job: Job,
): Promise<{ reverted: number }> {
  switch (job.name) {
    case TrialLifecycleJob.RevertExpiredTrials: {
      const result = await WorkspaceRepository.revertExpiredTrials()
      if (!result.ok) {
        throw new Error(`revertExpiredTrials failed: ${result.error.code}`)
      }

      // The DB rows are already reverted and are the source of truth, so a
      // Redis hiccup must not fail the job: retrying would re-run the
      // repository and report a different (0) count for the same work.
      // Stale cache entries expire on their own TTL.
      const invalidations = await Promise.allSettled(
        result.value.map((workspaceId) =>
          WorkspaceCache.invalidate(workspaceId),
        ),
      )

      for (const [index, outcome] of invalidations.entries()) {
        if (outcome.status !== 'rejected') continue
        const reason = outcome.reason
        logger.error('queue.trial_lifecycle.cache_invalidation_failed', {
          component: 'Worker',
          jobId: job.id,
          workspaceId: result.value[index],
          message: reason instanceof Error ? reason.message : String(reason),
        })
      }

      logger.info('queue.trial_lifecycle.trials_reverted', {
        component: 'Worker',
        jobId: job.id,
        reverted: result.value.length,
      })
      return { reverted: result.value.length }
    }
    default:
      throw new Error(
        `Unknown trial-lifecycle job: ${job.name} (id=${job.id ?? 'unknown'})`,
      )
  }
}
