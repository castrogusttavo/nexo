import { beforeEach, describe, expect, it, vi } from 'vitest'

const order: string[] = []

vi.mock('@/lib/axiom/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    flush: vi.fn(async () => {
      order.push('logger.flush')
    }),
  },
}))

vi.mock('@/src/lib/queue/queues', () => ({
  closeQueues: vi.fn(async () => {
    order.push('queues.close')
  }),
}))

vi.mock('@/src/lib/queue/connection', () => ({
  closeQueueConnection: vi.fn(async () => {
    order.push('connection.close')
  }),
}))

import { closeWorkerResources } from '@/src/lib/queue/worker-shutdown'

function closable(label: string) {
  return {
    close: vi.fn(async () => {
      order.push(label)
    }),
  }
}

beforeEach(() => {
  order.length = 0
})

describe('closeWorkerResources', () => {
  it('closes the failure listener alongside the workers, before the queues and connection', async () => {
    const workers = [closable('worker.a'), closable('worker.b')]
    const failureListener = closable('listener.close')

    await closeWorkerResources({ workers, failureListener })

    expect(failureListener.close).toHaveBeenCalledOnce()
    expect(order).toEqual([
      'worker.a',
      'worker.b',
      'listener.close',
      'queues.close',
      'connection.close',
      'logger.flush',
    ])
  })

  it('waits for in-flight Slack alerts after the listener and before the queues', async () => {
    const workers = [closable('worker.a')]
    const failureListener = closable('listener.close')
    const failureAlarm = {
      flush: vi.fn(async () => {
        order.push('alarm.flush')
      }),
    }

    await closeWorkerResources({ workers, failureListener, failureAlarm })

    expect(order).toEqual([
      'worker.a',
      'listener.close',
      'alarm.flush',
      'queues.close',
      'connection.close',
      'logger.flush',
    ])
  })

  it('shuts down cleanly when the listener never started', async () => {
    await closeWorkerResources({
      workers: [closable('worker.a')],
      failureListener: null,
    })

    expect(order).toEqual([
      'worker.a',
      'queues.close',
      'connection.close',
      'logger.flush',
    ])
  })
})
