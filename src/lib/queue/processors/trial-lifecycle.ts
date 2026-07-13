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

      await Promise.all(
        result.value.map((workspaceId) =>
          WorkspaceCache.invalidate(workspaceId),
        ),
      )

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
