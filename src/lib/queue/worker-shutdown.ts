import { logger } from '@/lib/axiom/logger'
import { closeQueueConnection } from './connection'
import type { JobFailureListener } from './failure-listener'
import { closeQueues } from './queues'

interface Closable {
  close(): Promise<void>
}

export interface WorkerResources {
  workers: readonly Closable[]
  failureListener: JobFailureListener | null
  /** Drains Slack alerts for deaths reported on the way out. */
  failureAlarm?: { flush(): Promise<void> }
}

/**
 * Releases everything the worker process holds, in dependency order:
 * workers first (a job failing on its way out is still reported), then the
 * failure listener (drains deaths it is still reading back, which needs the
 * queues), then the Slack alerts those deaths started (each bounded by the
 * Slack timeout), then the queues, the shared connection, and finally the
 * logger. Throws whatever the first failing step throws; the caller decides the exit.
 */
export async function closeWorkerResources({
  workers,
  failureListener,
  failureAlarm,
}: WorkerResources): Promise<void> {
  await Promise.all(workers.map((worker) => worker.close()))
  await failureListener?.close()
  await failureAlarm?.flush()
  await closeQueues()
  await closeQueueConnection()
  await logger.flush()
}
