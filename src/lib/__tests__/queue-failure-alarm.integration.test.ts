import { Job, Queue, Worker } from 'bullmq'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

// The integration project has no global logger mock; keep Axiom out and let
// the assertions read what would have been logged.
vi.mock('@/lib/axiom/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    flush: vi.fn(),
  },
}))

import { logger } from '@/lib/axiom/logger'
import {
  closeQueueConnection,
  getQueueConnection,
} from '@/src/lib/queue/connection'
import {
  createJobFailureAlarm,
  JOB_EXHAUSTED_EVENT,
  JOB_STALLED_EVENT,
  type JobFailureAlarm,
  STALLED_FAILURE_REASON,
} from '@/src/lib/queue/failure-alarm'
import {
  type JobFailureListener,
  startJobFailureListener,
} from '@/src/lib/queue/failure-listener'
import type { QueueName } from '@/src/lib/queue/jobs'

// Its own queue, so nothing here collides with the real queues' tests.
const QUEUE = 'failure-alarm-stall-test'

const mockedLogger = vi.mocked(logger)

// A stall is a job whose lock expired while it was still active. The
// "crashed" worker skips lock renewal and its processor never settles, so the
// lock lapses after `lockDuration` and the stall checker finds it.
const STALL_TIMING = { lockDuration: 600, stalledInterval: 250 }

let queue: Queue
let listener: JobFailureListener | null = null
const workers: Worker[] = []
const releases: Array<() => void> = []

function exhaustedCalls() {
  return mockedLogger.error.mock.calls.filter(
    ([event]) => event === JOB_EXHAUSTED_EVENT,
  )
}

function wire(worker: Worker, alarm: JobFailureAlarm): Worker {
  worker.on('failed', (job, err) => alarm.workerFailed(QUEUE, job, err))
  worker.on('stalled', (jobId) => alarm.stalled(QUEUE, jobId))
  worker.on('error', () => {})
  workers.push(worker)
  return worker
}

/** Picks the job up and hangs holding it, as a crashed process would. */
function crashingWorker(alarm: JobFailureAlarm, maxStalledCount: number) {
  return wire(
    new Worker(
      QUEUE,
      () =>
        new Promise<void>((resolve) => {
          releases.push(resolve)
        }),
      {
        connection: getQueueConnection(),
        ...STALL_TIMING,
        maxStalledCount,
        skipLockRenewal: true,
        concurrency: 1,
      },
    ),
    alarm,
  )
}

/** A healthy worker that picks the requeued job up after the stall. */
function healthyWorker(
  alarm: JobFailureAlarm,
  maxStalledCount: number,
  processor: () => Promise<void>,
) {
  return wire(
    new Worker(QUEUE, processor, {
      connection: getQueueConnection(),
      ...STALL_TIMING,
      maxStalledCount,
    }),
    alarm,
  )
}

async function startScenario(maxStalledCount: number) {
  queue = new Queue(QUEUE, { connection: getQueueConnection() })
  const alarm = createJobFailureAlarm()
  const loadJob = vi.fn((_: QueueName, jobId: string) =>
    Job.fromId(queue, jobId),
  )
  listener = startJobFailureListener([QUEUE as QueueName], {
    alarm,
    connection: getQueueConnection(),
    loadJob,
  })
  // Give QueueEvents time to issue its first XREAD from `$`.
  await new Promise((resolve) => setTimeout(resolve, 300))

  const crashing = crashingWorker(alarm, maxStalledCount)
  const active = new Promise<void>((resolve) =>
    crashing.once('active', () => resolve()),
  )
  await queue.add('delete-account', { userId: 'user-stall' }, { attempts: 3 })
  await active

  return { alarm, loadJob }
}

afterEach(async () => {
  for (const release of releases.splice(0)) release()
  await Promise.all(workers.splice(0).map((worker) => worker.close(true)))
  await listener?.close()
  listener = null
  await queue?.obliterate({ force: true })
  await queue?.close()
  vi.clearAllMocks()
})

afterAll(async () => {
  await closeQueueConnection()
})

describe('stalled jobs against a real Redis', () => {
  it('alarms exactly once, as stalled, when a job exceeds maxStalledCount', async () => {
    const { alarm, loadJob } = await startScenario(0)
    const processed = vi.fn(async () => {})
    const workerFailed = vi.fn()
    healthyWorker(alarm, 0, processed).on('failed', workerFailed)

    // Both witnesses saw the death: the Worker `failed` event and the
    // QueueEvents backstop (which reads the job back before reporting).
    await vi.waitFor(
      () => {
        expect(workerFailed).toHaveBeenCalledOnce()
        expect(loadJob).toHaveBeenCalledOnce()
      },
      { timeout: 10_000, interval: 50 },
    )
    await listener?.close()

    // BullMQ fails it on pickup without running the processor.
    expect(processed).not.toHaveBeenCalled()
    expect(workerFailed.mock.calls[0][1]).toMatchObject({
      name: 'UnrecoverableError',
      message: STALLED_FAILURE_REASON,
    })
    const calls = exhaustedCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toMatchObject({
      queue: QUEUE,
      jobName: 'delete-account',
      reason: 'stalled',
      message: STALLED_FAILURE_REASON,
      payload: { userId: 'user-stall' },
    })
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      JOB_STALLED_EVENT,
      expect.objectContaining({ queue: QUEUE }),
    )
  })

  it('only warns when the stalled job is requeued and then succeeds', async () => {
    const { alarm } = await startScenario(1)
    const processed = vi.fn(async () => {})
    healthyWorker(alarm, 1, processed)

    await vi.waitFor(() => expect(processed).toHaveBeenCalledOnce(), {
      timeout: 10_000,
      interval: 50,
    })

    expect(mockedLogger.warn).toHaveBeenCalledWith(
      JOB_STALLED_EVENT,
      expect.objectContaining({ queue: QUEUE }),
    )
    expect(exhaustedCalls()).toHaveLength(0)
  })
})
