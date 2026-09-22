import type { Job } from 'bullmq'
import { logger } from '@/lib/axiom/logger'
import {
  formatAlertTime,
  sanitizeAlertText,
  sendSlackAlert,
} from '@/src/lib/alerts/slack'

/**
 * Emitted once per job death -- when BullMQ gives up on a job and moves it to
 * the `failed` set. A retry that will still happen never emits this.
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

/**
 * A job lost its lock and BullMQ requeued it. Warning only: the job runs
 * again, and if it has now stalled more than `maxStalledCount` times the next
 * pickup fails it, which ends in `queue.job.exhausted` with reason `stalled`.
 */
export const JOB_STALLED_EVENT = 'queue.job.stalled'

/**
 * The `failedReason` BullMQ 5.x records for a job that exceeded the worker's
 * `maxStalledCount` (`moveStalledJobsToWait.lua`). The stall checker does not
 * fail the job itself: it stores this string as a deferred failure and moves
 * the job back to `wait`; the next worker to pick it up throws it as an
 * `UnrecoverableError` without running the processor.
 */
export const STALLED_FAILURE_REASON = 'job stalled more than allowable limit'

export type JobExhaustedReason =
  | 'attempts_exhausted'
  | 'unrecoverable'
  | 'stalled'

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
  // Checked before the generic UnrecoverableError branch: BullMQ throws the
  // stall verdict as an UnrecoverableError carrying this exact message.
  if (error.message === STALLED_FAILURE_REASON) return 'stalled'
  // Mirrors BullMQ's own `shouldRetryJob`: an UnrecoverableError skips the
  // remaining attempts. (The deprecated `job.discard()` does too, but its flag
  // is protected and nothing here calls it.)
  if (error.name === 'UnrecoverableError') return 'unrecoverable'
  const maxAttempts = job.opts.attempts ?? 1
  if (job.attemptsMade >= maxAttempts) return 'attempts_exhausted'
  return null
}

/**
 * Remembers which deaths were already reported so the Worker `failed` event
 * and the `QueueEvents` `failed` event for the same death alarm once.
 *
 * Keyed by queue + job id, valued by `finishedOn` so a job that is retried by
 * hand and dies again is a new death. `undefined` means "finishedOn unknown"
 * (the job record could not be read) and matches any death of that job.
 * Bounded: past `capacity` entries the oldest is dropped. Both paths report a
 * death within milliseconds of each other, so only recent entries matter.
 */
class DeathLedger {
  private readonly entries = new Map<string, number | undefined>()

  constructor(private readonly capacity: number) {}

  /** True when the caller is the first to report this death. */
  claim(key: string, finishedOn: number | undefined): boolean {
    if (this.entries.has(key)) {
      const seen = this.entries.get(key)
      if (seen === undefined || finishedOn === undefined || seen === finishedOn)
        return false
      this.entries.delete(key)
    }
    this.entries.set(key, finishedOn)
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    return true
  }

  get size(): number {
    return this.entries.size
  }
}

export const DEFAULT_LEDGER_CAPACITY = 1000

export interface JobFailureAlarm {
  /** Handler for a BullMQ `Worker` `failed` event. */
  workerFailed(queue: string, job: Job | undefined, error: Error): void
  /**
   * Handler for a `QueueEvents` `failed` event, after the job was read back.
   * That event only fires when a job reaches the failed set, so every call is
   * a death; `job` is undefined when the record is already gone.
   */
  queueEventFailed(
    queue: string,
    jobId: string,
    failedReason: string,
    job: Job | undefined,
  ): void
  /** Handler for a BullMQ `Worker` `stalled` event. Never alarms. */
  stalled(queue: string, jobId: string): void
  /**
   * Resolves once every Slack alert already started has been delivered or
   * given up on (each is bounded by the Slack timeout). Never rejects.
   */
  flush(): Promise<void>
  /** Deaths currently remembered for deduplication (for tests). */
  readonly ledgerSize: number
}

function lastStackEntry(job: Job): string | undefined {
  const stacktrace = job.stacktrace
  return Array.isArray(stacktrace) && stacktrace.length > 0
    ? (stacktrace[stacktrace.length - 1] ?? undefined)
    : undefined
}

const REASON_WORDS: Record<JobExhaustedReason, string> = {
  attempts_exhausted: 'tentativas esgotadas',
  unrecoverable: 'erro irrecuperável',
  stalled: 'travou além do limite (stalled)',
}

/**
 * The Slack text for a job death. Built only from the queue/job names, the
 * attempt counters, the allowlisted payload ids and the sanitized error
 * message -- never the payload itself or the stack.
 */
export function jobExhaustedAlertText(
  fields: JobExhaustedFields,
  at: Date,
): string {
  const attempts =
    fields.maxAttempts > 0
      ? ` (${fields.attemptsMade}/${fields.maxAttempts})`
      : ''
  const ids = fields.payload
    ? Object.entries(fields.payload)
        .map(([key, value]) => `${key}=\`${sanitizeAlertText(value, 64)}\``)
        .join(', ')
    : null
  return [
    `:skull: Job morreu: \`${sanitizeAlertText(fields.queue, 64)}\` / \`${sanitizeAlertText(fields.jobName, 64)}\``,
    `Motivo: ${REASON_WORDS[fields.reason]}${attempts}`,
    `Job: \`${sanitizeAlertText(String(fields.jobId ?? 'desconhecido'), 64)}\` · ${formatAlertTime(at)}`,
    ids ? `IDs: ${ids}` : null,
    fields.message ? `Erro: \`${sanitizeAlertText(fields.message)}\`` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export type JobExhaustedNotifier = (fields: JobExhaustedFields) => Promise<void>

const notifySlack: JobExhaustedNotifier = async (fields) => {
  await sendSlackAlert({
    event: JOB_EXHAUSTED_EVENT,
    text: jobExhaustedAlertText(fields, new Date()),
  })
}

export function createJobFailureAlarm({
  capacity = DEFAULT_LEDGER_CAPACITY,
  notify = notifySlack,
}: {
  capacity?: number
  /** Posts the death to Slack; only ever called once per death. */
  notify?: JobExhaustedNotifier
} = {}): JobFailureAlarm {
  const ledger = new DeathLedger(capacity)
  const inFlight = new Set<Promise<void>>()

  function alarm(fields: JobExhaustedFields, finishedOn: number | undefined) {
    // The ledger decides first, so a death reported by both the Worker and
    // the QueueEvents backstop reaches Slack once, like the log line.
    if (!ledger.claim(`${fields.queue}:${fields.jobId}`, finishedOn)) return
    logger.error(JOB_EXHAUSTED_EVENT, { ...fields })

    // Fire-and-forget for the event handler; `flush()` lets shutdown wait.
    const sending = Promise.resolve()
      .then(() => notify(fields))
      .catch((error: unknown) => {
        logger.error('alerts.slack.failed', {
          component: 'SlackAlerts',
          alert: JOB_EXHAUSTED_EVENT,
          reason: 'notifier_error',
          message: error instanceof Error ? error.message : String(error),
        })
      })
      .finally(() => inFlight.delete(sending))
    inFlight.add(sending)
  }

  return {
    workerFailed(queue, job, error) {
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

      // No job means no id to deduplicate on; the QueueEvents path reports
      // that death instead.
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

      alarm(fields, job.finishedOn)
    },

    queueEventFailed(queue, jobId, failedReason, job) {
      const stalled = failedReason === STALLED_FAILURE_REASON

      if (!job) {
        // Removed between failing and being read: report what is known.
        alarm(
          {
            component: 'Worker',
            queue,
            jobName: 'unknown',
            jobId,
            attemptsMade: 0,
            maxAttempts: 0,
            reason: stalled ? 'stalled' : 'unrecoverable',
            message: failedReason,
            stack: undefined,
          },
          undefined,
        )
        return
      }

      const maxAttempts = job.opts.attempts ?? 1
      // In the failed set with attempts to spare means BullMQ skipped them,
      // which only an UnrecoverableError does.
      const reason: JobExhaustedReason = stalled
        ? 'stalled'
        : job.attemptsMade >= maxAttempts
          ? 'attempts_exhausted'
          : 'unrecoverable'

      const fields: JobExhaustedFields = {
        component: 'Worker',
        queue,
        jobName: job.name,
        jobId,
        attemptsMade: job.attemptsMade,
        maxAttempts,
        reason,
        message: failedReason,
        stack: lastStackEntry(job),
      }
      const payload = pickPayloadIdentifiers(job.data)
      if (payload) fields.payload = payload

      alarm(fields, job.finishedOn)
    },

    stalled(queue, jobId) {
      logger.warn(JOB_STALLED_EVENT, { component: 'Worker', queue, jobId })
    },

    async flush() {
      await Promise.allSettled([...inFlight])
    },

    get ledgerSize() {
      return ledger.size
    },
  }
}
