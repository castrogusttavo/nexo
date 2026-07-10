import type { Job } from 'bullmq'
import { logger } from '@/lib/axiom/logger'
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
      logger.info('queue.trial_lifecycle.trials_reverted', {
        component: 'Worker',
        jobId: job.id,
        reverted: result.value,
      })
      return { reverted: result.value }
    }
    default:
      throw new Error(
        `Unknown trial-lifecycle job: ${job.name} (id=${job.id ?? 'unknown'})`,
      )
  }
}
