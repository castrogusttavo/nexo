import { logger } from '@/lib/axiom/logger'
import { SLACK_ALERTS_WEBHOOK_URL } from '@/lib/env/server'

/**
 * Operational alerts posted to a Slack Incoming Webhook: a plain HTTPS POST of
 * `{ text }`, no SDK.
 *
 * Alerting must never make an incident worse, so `sendSlackAlert` never
 * rejects and never waits longer than `SLACK_ALERT_TIMEOUT_MS`. Callers await
 * it (the collect route and the worker may exit right after) knowing it is
 * bounded. Every failure -- timeout, network error, 4xx/5xx -- ends in one
 * `alerts.slack.failed` log line. The webhook URL is a credential (anyone
 * holding it can post to the channel), so it is never logged, not even inside
 * an error message that happens to quote it.
 */

export const SLACK_ALERT_FAILED_EVENT = 'alerts.slack.failed'
export const SLACK_ALERT_TIMEOUT_MS = 3_000

export interface SlackAlert {
  /** Stable name of what is being alerted, for the logs (never user data). */
  event: string
  /** Slack mrkdwn. Interpolate untrusted text through `sanitizeAlertText`. */
  text: string
}

type FailureReason = 'timeout' | 'http_error' | 'network_error'

function webhookUrl(): string | undefined {
  const value = SLACK_ALERTS_WEBHOOK_URL?.trim()
  return value ? value : undefined
}

function redactWebhook(message: string, url: string): string {
  return message
    .split(url)
    .join('[webhook]')
    .replace(/https?:\/\/hooks\.slack\.com\/\S*/g, '[webhook]')
}

class SlackTimeout extends Error {}

export async function sendSlackAlert(
  alert: SlackAlert,
  { timeoutMs = SLACK_ALERT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<boolean> {
  const url = webhookUrl()
  if (!url) {
    logger.info('alerts.slack.disabled', {
      component: 'SlackAlerts',
      alert: alert.event,
    })
    return false
  }

  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  // Raced as well as aborted: the abort only helps if the fetch honours the
  // signal, the race bounds the wait no matter what.
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new SlackTimeout())
    }, timeoutMs)
  })

  const fail = (reason: FailureReason, extra: Record<string, unknown> = {}) => {
    logger.error(SLACK_ALERT_FAILED_EVENT, {
      component: 'SlackAlerts',
      alert: alert.event,
      reason,
      ...extra,
    })
    return false
  }

  try {
    const response = await Promise.race([
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: alert.text }),
        signal: controller.signal,
      }),
      timeout,
    ])
    if (!response.ok) return fail('http_error', { status: response.status })
    logger.info('alerts.slack.sent', {
      component: 'SlackAlerts',
      alert: alert.event,
    })
    return true
  } catch (error) {
    if (
      error instanceof SlackTimeout ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      return fail('timeout', { timeoutMs })
    }
    const message = error instanceof Error ? error.message : String(error)
    return fail('network_error', { message: redactWebhook(message, url) })
  } finally {
    clearTimeout(timer)
    // The losing side of the race must not surface as an unhandled rejection.
    timeout.catch(() => {})
  }
}

export const ALERT_ERROR_MAX_LENGTH = 300

/**
 * Makes an error message safe to post: one line, bounded, and stripped of
 * what commonly leaks into driver/HTTP errors -- e-mail addresses (PII),
 * credentials embedded in URLs and bearer tokens -- then escaped so it cannot
 * form Slack links or mentions (`<!channel>`).
 */
export function sanitizeAlertText(
  text: string,
  maxLength = ALERT_ERROR_MAX_LENGTH,
): string {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/https?:\/\/hooks\.slack\.com\/\S*/g, '[webhook]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, '$1[redacted]@')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength - 1)}…`
}

/** "22/09 14:04" in the owner's timezone. */
export function formatAlertTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')}/${get('month')} ${get('hour')}:${get('minute')}`
}

/** "12 min", "2 h 5 min", "3 d 4 h" -- coarse, for a phone screen. */
export function formatAlertDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  if (minutes < 1) return 'menos de 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const rest = minutes % 60
    return rest ? `${hours} h ${rest} min` : `${hours} h`
  }
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours ? `${days} d ${restHours} h` : `${days} d`
}
