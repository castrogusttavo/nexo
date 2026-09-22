import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/axiom/logger'

const env = vi.hoisted(() => ({ webhook: undefined as string | undefined }))

vi.mock('@/lib/env/server', () => ({
  get SLACK_ALERTS_WEBHOOK_URL() {
    return env.webhook
  },
}))

import {
  formatAlertDuration,
  formatAlertTime,
  SLACK_ALERT_FAILED_EVENT,
  sanitizeAlertText,
  sendSlackAlert,
} from '@/src/lib/alerts/slack'

const WEBHOOK = 'https://hooks.slack.com/services/T000/B000/secret-token'
const mockedLogger = vi.mocked(logger)
const fetchMock = vi.fn<typeof fetch>()

function allLoggedText(): string {
  return JSON.stringify([
    ...mockedLogger.info.mock.calls,
    ...mockedLogger.warn.mock.calls,
    ...mockedLogger.error.mock.calls,
  ])
}

beforeEach(() => {
  env.webhook = WEBHOOK
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendSlackAlert', () => {
  it('is a logged no-op that never touches the network when the webhook is unset', async () => {
    env.webhook = undefined

    const delivered = await sendSlackAlert({ event: 'test', text: 'oi' })

    expect(delivered).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'alerts.slack.disabled',
      expect.objectContaining({ alert: 'test' }),
    )
  })

  it('treats a blank webhook as unset', async () => {
    env.webhook = '   '

    await sendSlackAlert({ event: 'test', text: 'oi' })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the text as JSON to the webhook', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    const delivered = await sendSlackAlert({ event: 'test', text: 'olá' })

    expect(delivered).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe(WEBHOOK)
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('content-type')).toBe(
      'application/json',
    )
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'olá' })
    expect(allLoggedText()).not.toContain('secret-token')
  })

  it('logs alerts.slack.failed on a 5xx and resolves instead of throwing', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))

    const delivered = await sendSlackAlert({ event: 'test', text: 'x' })

    expect(delivered).toBe(false)
    expect(mockedLogger.error).toHaveBeenCalledWith(
      SLACK_ALERT_FAILED_EVENT,
      expect.objectContaining({
        alert: 'test',
        reason: 'http_error',
        status: 500,
      }),
    )
    expect(SLACK_ALERT_FAILED_EVENT).toBe('alerts.slack.failed')
  })

  it('logs a 4xx the same way', async () => {
    fetchMock.mockResolvedValue(new Response('no_service', { status: 404 }))

    expect(await sendSlackAlert({ event: 'test', text: 'x' })).toBe(false)
    expect(mockedLogger.error).toHaveBeenCalledWith(
      SLACK_ALERT_FAILED_EVENT,
      expect.objectContaining({ reason: 'http_error', status: 404 }),
    )
  })

  it('never logs the webhook, even when the network error quotes it', async () => {
    fetchMock.mockRejectedValue(
      new TypeError(`Failed to parse URL from ${WEBHOOK}`),
    )

    expect(await sendSlackAlert({ event: 'test', text: 'x' })).toBe(false)
    expect(mockedLogger.error).toHaveBeenCalledWith(
      SLACK_ALERT_FAILED_EVENT,
      expect.objectContaining({ reason: 'network_error' }),
    )
    expect(allLoggedText()).not.toContain('secret-token')
    expect(allLoggedText()).not.toContain('hooks.slack.com/services')
  })

  it('gives up after the timeout even when fetch ignores the abort signal', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))

    const started = Date.now()
    const delivered = await sendSlackAlert(
      { event: 'test', text: 'x' },
      { timeoutMs: 20 },
    )

    expect(delivered).toBe(false)
    expect(Date.now() - started).toBeLessThan(1_000)
    expect(mockedLogger.error).toHaveBeenCalledWith(
      SLACK_ALERT_FAILED_EVENT,
      expect.objectContaining({ reason: 'timeout' }),
    )
  })
})

describe('sanitizeAlertText', () => {
  it('redacts e-mail addresses', () => {
    expect(
      sanitizeAlertText('Unique constraint failed for ana.silva@example.com'),
    ).toBe('Unique constraint failed for [email]')
  })

  it('redacts credentials embedded in URLs', () => {
    expect(
      sanitizeAlertText("Can't reach postgresql://nexo:hunter22@db:5432/nexo"),
    ).toBe("Can't reach postgresql://[redacted]@db:5432/nexo")
  })

  it('redacts bearer tokens', () => {
    expect(sanitizeAlertText('Authorization: Bearer re_abc123.def')).toBe(
      'Authorization: Bearer [redacted]',
    )
  })

  it('escapes Slack control characters so an error cannot inject links', () => {
    expect(sanitizeAlertText('a < b && <!channel>')).toBe(
      'a &lt; b &amp;&amp; &lt;!channel&gt;',
    )
  })

  it('truncates long text with an ellipsis', () => {
    const out = sanitizeAlertText('x'.repeat(500), 100)
    expect(out).toHaveLength(100)
    expect(out.endsWith('…')).toBe(true)
  })

  it('collapses whitespace so a stack-like message stays on one line', () => {
    expect(sanitizeAlertText('line one\n    at foo\n\tat bar')).toBe(
      'line one at foo at bar',
    )
  })
})

describe('formatAlertDuration', () => {
  it('reads naturally from seconds to days', () => {
    expect(formatAlertDuration(20_000)).toBe('menos de 1 min')
    expect(formatAlertDuration(12 * 60_000)).toBe('12 min')
    expect(formatAlertDuration(125 * 60_000)).toBe('2 h 5 min')
    expect(formatAlertDuration(120 * 60_000)).toBe('2 h')
    expect(formatAlertDuration(76 * 3_600_000)).toBe('3 d 4 h')
  })
})

describe('formatAlertTime', () => {
  it('uses São Paulo time', () => {
    expect(formatAlertTime(new Date('2026-09-22T02:30:00.000Z'))).toBe(
      '21/09 23:30',
    )
  })
})
