import { type Job, Worker } from 'bullmq'
import { processTrialLifecycle } from '@/src/lib/queue/processors/trial-lifecycle'
import { logger } from '../lib/axiom/logger'
import {
  closeQueueConnection,
  getQueueConnection,
} from '../src/lib/queue/connection'
import { QueueName } from '../src/lib/queue/jobs'
import { processAccountLifecycle } from '../src/lib/queue/processors/account-lifecycle'
import { processDataExport } from '../src/lib/queue/processors/data-export'
import { processDataRetention } from '../src/lib/queue/processors/data-retention'
import { closeQueues } from '../src/lib/queue/queues'
import {
  scheduleDataRetentionJobs,
  scheduleTrialLifecycleJobs,
} from '../src/lib/queue/scheduler'

const workers: Worker[] = []

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

  worker.on('failed', (job, err) => {
    logger.error('queue.job.failed', {
      component: 'Worker',
      queue: name,
      jobName: job?.name,
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      message: err.message,
      stack: err.stack,
    })
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
    await Promise.all(workers.map((w) => w.close()))
    await closeQueues()
    await closeQueueConnection()
    await logger.flush()
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
