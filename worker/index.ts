import { type Job, Worker } from 'bullmq'
import { processTrialLifecycle } from '@/src/lib/queue/processors/trial-lifecycle'
import { logger } from '../lib/axiom/logger'
import { getQueueConnection } from '../src/lib/queue/connection'
import { createJobFailureAlarm } from '../src/lib/queue/failure-alarm'
import {
  type JobFailureListener,
  startJobFailureListener,
} from '../src/lib/queue/failure-listener'
import { QueueName } from '../src/lib/queue/jobs'
import { processAccountLifecycle } from '../src/lib/queue/processors/account-lifecycle'
import { processDataExport } from '../src/lib/queue/processors/data-export'
import { processDataRetention } from '../src/lib/queue/processors/data-retention'
import {
  scheduleDataRetentionJobs,
  scheduleTrialLifecycleJobs,
} from '../src/lib/queue/scheduler'
import { closeWorkerResources } from '../src/lib/queue/worker-shutdown'

const workers: Worker[] = []
// One alarm shared by every Worker and the QueueEvents backstop, so its
// dedup ledger sees both reports of the same death.
const failureAlarm = createJobFailureAlarm()
let failureListener: JobFailureListener | null = null

type Processor = (job: Job) => Promise<unknown>

function registerWorker(name: QueueName, processor: Processor): Worker {
  const worker = new Worker(name, processor, {
    connection: getQueueConnection(),
  })

  worker.on('completed', (job) => {
    logger.info('queue.job.completed', {
      component: 'Worker',
      queue: name,
      jobName: job.name,
      jobId: job.id,
      durationMs:
        job.finishedOn && job.processedOn
          ? job.finishedOn - job.processedOn
          : undefined,
    })
  })

  // Logs every failed attempt and raises `queue.job.exhausted` once BullMQ
  // gives up on the job -- the event the Axiom alarm keys on. That includes a
  // job that exceeded `maxStalledCount`: BullMQ fails it on its next pickup
  // with an UnrecoverableError, which arrives here as reason `stalled`.
  worker.on('failed', (job, err) => {
    failureAlarm.workerFailed(name, job, err)
  })

  // A stall that BullMQ requeues: a warning, never the alarm.
  worker.on('stalled', (jobId) => {
    failureAlarm.stalled(name, jobId)
  })

  worker.on('error', (err) => {
    logger.error('queue.worker.error', {
      component: 'Worker',
      queue: name,
      message: err.message,
      stack: err.stack,
    })
  })

  return worker
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('queue.worker.shutdown_start', {
    component: 'Worker',
    signal,
  })

  try {
    await closeWorkerResources({
      workers,
      failureListener,
      failureAlarm,
    })
  } catch (err) {
    const e = err as Error
    logger.error('queue.worker.shutdown_error', {
      component: 'Worker',
      message: e.message,
      stack: e.stack,
    })
    await logger.flush()
    process.exit(1)
  }

  process.exit(0)
}

async function main(): Promise<void> {
  workers.push(registerWorker(QueueName.DataRetention, processDataRetention))
  workers.push(
    registerWorker(QueueName.AccountLifecycle, processAccountLifecycle),
  )
  workers.push(registerWorker(QueueName.DataExport, processDataExport))
  workers.push(registerWorker(QueueName.TrialLifecycle, processTrialLifecycle))

  failureListener = startJobFailureListener(
    workers.map((w) => w.name as QueueName),
    { alarm: failureAlarm, connection: getQueueConnection() },
  )

  await scheduleDataRetentionJobs()
  await scheduleTrialLifecycleJobs()

  logger.info('queue.worker.started', {
    component: 'Worker',
    queues: workers.map((w) => w.name),
  })

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch(async (err) => {
  const e = err as Error
  logger.error('queue.worker.bootstrap_error', {
    component: 'Worker',
    message: e.message,
    stack: e.stack,
  })
  await logger.flush()
  process.exit(1)
})
