import { type ConnectionOptions, Job, QueueEvents } from 'bullmq'
import { logger } from '@/lib/axiom/logger'
import type { JobFailureAlarm } from './failure-alarm'
import type { QueueName } from './jobs'
import { getQueueByName } from './queues'

export type LoadJob = (
  queue: QueueName,
  jobId: string,
) => Promise<Job | undefined>

const loadJobFromQueue: LoadJob = (queue, jobId) =>
  Job.fromId(getQueueByName(queue), jobId)

export interface JobFailureListener {
  /**
   * Stops listening, then waits for any death still being reported so the
   * alarm is logged before the process flushes the logger and exits.
   */
  close(): Promise<void>
}

export interface JobFailureListenerOptions {
  alarm: JobFailureAlarm
  /**
   * BullMQ duplicates this into a dedicated blocking connection per
   * `QueueEvents` (it sits on XREAD BLOCK) and disconnects it on `close()`.
   */
  connection: ConnectionOptions
  /** Reads the dead job back (name, payload, attempts). Tests override it. */
  loadJob?: LoadJob
}

/**
 * Backstop for the Worker `failed` event: one `QueueEvents` per queue reports
 * every job that reaches the failed set, whichever process or code path put
 * it there (a Worker `failed` emit lost to a connection drop after the Lua
 * script already ran, a job failed by a worker in another process). The alarm
 * deduplicates, so a death seen here and by the Worker alarms once.
 *
 * Reads from `$`, i.e. only deaths after boot: a restart does not replay the
 * failed set.
 */
export function startJobFailureListener(
  queues: readonly QueueName[],
  { alarm, connection, loadJob = loadJobFromQueue }: JobFailureListenerOptions,
): JobFailureListener {
  const inFlight = new Set<Promise<void>>()

  const listeners = queues.map((queue) => {
    const events = new QueueEvents(queue, { connection })

    events.on('failed', ({ jobId, failedReason }) => {
      const report = loadJob(queue, jobId)
        .catch((error: Error) => {
          logger.error('queue.events.lookup_error', {
            component: 'QueueEvents',
            queue,
            jobId,
            message: error.message,
          })
          return undefined
        })
        .then((job) => alarm.queueEventFailed(queue, jobId, failedReason, job))
        .finally(() => inFlight.delete(report))
      inFlight.add(report)
    })

    events.on('error', (error) => {
      logger.error('queue.events.error', {
        component: 'QueueEvents',
        queue,
        message: error.message,
        stack: error.stack,
      })
    })

    return events
  })

  return {
    async close() {
      await Promise.all(listeners.map((events) => events.close()))
      await Promise.allSettled([...inFlight])
    },
  }
}
