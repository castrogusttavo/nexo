import type { Job } from 'bullmq'
import { logger } from '@/lib/axiom/logger'

/**
 * Emitted once per job when BullMQ gives up on it and moves it to the
 * `failed` set. A retry that will still happen never emits this.
 *
 * STABLE CONTRACT: an Axiom monitor alerts on this event name and reads the
 * fields of `JobExhaustedFields`. Renaming the event or any field silently
 * disables that alarm -- change the monitor in the same commit if you must.
 *
 * Why it exists: `delete-account` threw a foreign-key violation on every run
 * for its whole life, exhausted its retries and died in the failed set with
 * nobody told. A queue that always fails looks exactly like one that never
 * runs unless the final failure is loud.
 */
export const JOB_EXHAUSTED_EVENT = 'queue.job.exhausted'

/** Per-attempt failure log (retries included). Informational, not the alarm. */
export const JOB_FAILED_EVENT = 'queue.job.failed'

export type JobExhaustedReason = 'attempts_exhausted' | 'unrecoverable'

export interface JobExhaustedFields {
  component: 'Worker'
  queue: string
  jobName: string
  jobId: string | undefined
  attemptsMade: number
  maxAttempts: number
  reason: JobExhaustedReason
  message: string
  stack: string | undefined
  /** Allowlisted identifiers only -- see `PAYLOAD_IDENTIFIER_KEYS`. */
  payload?: Record<string, string>
}

// Allowlist, not a denylist: a payload key only reaches the logs if it is
// named here. Job payloads can grow to carry tokens or emails, and a new key
// must never leak by default. Only flat string identifiers qualify.
const PAYLOAD_IDENTIFIER_KEYS = ['userId', 'workspaceId'] as const

function pickPayloadIdentifiers(
  data: unknown,
): Record<string, string> | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const source = data as Record<string, unknown>
  const picked: Record<string, string> = {}
  for (const key of PAYLOAD_IDENTIFIER_KEYS) {
    const value = source[key]
    if (typeof value === 'string') picked[key] = value
  }
  return Object.keys(picked).length > 0 ? picked : undefined
}

/**
 * Classifies why a job that just failed will not run again, or returns null
 * when BullMQ will retry it. Must be called from the worker's `failed` event,
 * where `attemptsMade` already counts the attempt that just failed.
 */
export function exhaustionReason(
  job: Job,
  error: Error,
): JobExhaustedReason | null {
  // Mirrors BullMQ's own `shouldRetryJob`: an UnrecoverableError skips the
  // remaining attempts. (The deprecated `job.discard()` does too, but its flag
  // is protected and nothing here calls it.)
  if (error.name === 'UnrecoverableError') return 'unrecoverable'
  const maxAttempts = job.opts.attempts ?? 1
  if (job.attemptsMade >= maxAttempts) return 'attempts_exhausted'
  return null
}

/** Handler for a BullMQ `Worker` `failed` event. */
export function reportJobFailure(
  queue: string,
  job: Job | undefined,
  error: Error,
): void {
  const reason = job ? exhaustionReason(job, error) : null

  logger.error(JOB_FAILED_EVENT, {
    component: 'Worker',
    queue,
    jobName: job?.name,
    jobId: job?.id,
    attemptsMade: job?.attemptsMade,
    willRetry: job ? reason === null : undefined,
    message: error.message,
    stack: error.stack,
  })

  if (!job || reason === null) return

  const fields: JobExhaustedFields = {
    component: 'Worker',
    queue,
    jobName: job.name,
    jobId: job.id,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
    reason,
    message: error.message,
    stack: error.stack,
  }
  const payload = pickPayloadIdentifiers(job.data)
  if (payload) fields.payload = payload

  logger.error(JOB_EXHAUSTED_EVENT, { ...fields })
}
