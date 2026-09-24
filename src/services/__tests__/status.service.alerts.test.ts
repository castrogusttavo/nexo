import type { ComponentStatus } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/axiom/logger'
import { expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

// The network boundary is `fetch`; everything between the collector and it
// (incident lifecycle, flap decision, message, Slack sender) runs for real.
// Only the persistence and the probes are replaced, by an in-memory store
// that behaves like the tables across consecutive collections.

const env = vi.hoisted(() => ({ webhook: undefined as string | undefined }))
vi.mock('@/lib/env/server', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    get SLACK_ALERTS_WEBHOOK_URL() {
      return env.webhook
    },
  }
})
vi.mock('@/src/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/src/cache/status.cache')
vi.mock('@/src/repositories/status.repository')
vi.mock('@/src/repositories/incident.repository')
vi.mock('@/src/services/status/probes', () => {
  const TIER_KEYS: Record<string, readonly string[]> = {
    core: ['app', 'database', 'cache', 'auth'],
    peripheral: ['payment', 'email', 'jobs', 'storage'],
  }
  // Budgets mirroring the real ones closely enough for the collector's
  // smoothing rule: these cases drive latency explicitly when they mean to.
  const SLOW_ABOVE: Record<string, number> = {
    app: 2_500,
    database: 1_000,
    cache: 1_000,
    auth: 1_500,
    storage: 1_500,
    jobs: 2_000,
    payment: 3_000,
    email: 3_000,
  }
  return {
    runProbesForTier: vi.fn(),
    componentsForTier: (tier: 'core' | 'peripheral') => TIER_KEYS[tier] ?? [],
    isSlow: (key: string, latencyMs: number) =>
      latencyMs > (SLOW_ABOVE[key] ?? 1_000),
  }
})

import { StatusCache } from '@/src/cache/status.cache'
import { SLACK_ALERT_TIMEOUT_MS } from '@/src/lib/alerts/slack'
import { IncidentRepository } from '@/src/repositories/incident.repository'
import { StatusRepository } from '@/src/repositories/status.repository'
import { runProbesForTier } from '@/src/services/status/probes'
import { StatusService } from '@/src/services/status/status.service'
import { resetCollectFailureAlert } from '@/src/services/status/status-alerts'

const WEBHOOK = 'https://hooks.slack.com/services/T000/B000/secret-token'
const MINUTE = 60_000

const mockedLogger = vi.mocked(logger)
const mockedStatusRepo = vi.mocked(StatusRepository)
const mockedIncidentRepo = vi.mocked(IncidentRepository)
const mockedRunProbes = vi.mocked(runProbesForTier)
const fetchMock = vi.fn<typeof fetch>()

interface StoredCheck {
  componentKey: string
  status: ComponentStatus
  // The collector reads the recorded latencies to decide whether slowness has
  // persisted, so the fake store has to keep them like the real table does.
  latencyMs: number
  checkedAt: Date
}
interface StoredIncident {
  id: string
  componentKey: string
  severity: ComponentStatus
  title: string
  startedAt: Date
  resolvedAt: Date | null
}

let checks: StoredCheck[] = []
let incidents: StoredIncident[] = []

function installStore() {
  checks = []
  incidents = []
  mockedStatusRepo.recordChecks.mockImplementation(async (rows) => {
    for (const row of rows) {
      checks.push({
        componentKey: row.componentKey,
        status: row.status,
        latencyMs: row.latencyMs,
        checkedAt: new Date(),
      })
    }
    return ok(undefined)
  })
  mockedStatusRepo.findRecentChecks.mockImplementation(async (keys, since) =>
    ok(
      checks.filter(
        (c) =>
          (keys as readonly string[]).includes(c.componentKey) &&
          c.checkedAt >= since,
      ),
    ),
  )
  mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
  mockedStatusRepo.upsertDailies.mockResolvedValue(ok(undefined))
  mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
  mockedIncidentRepo.findOpenByComponent.mockImplementation(async (key) => {
    const open = incidents.find(
      (i) => i.componentKey === key && i.resolvedAt === null,
    )
    return ok(open ? { ...open } : null)
  })
  mockedIncidentRepo.create.mockImplementation(async (data) => {
    const incident: StoredIncident = {
      id: `inc-${incidents.length + 1}`,
      componentKey: data.componentKey,
      severity: data.severity,
      title: data.title,
      startedAt: data.startedAt,
      resolvedAt: null,
    }
    incidents.push(incident)
    return ok({ ...incident })
  })
  mockedIncidentRepo.bumpSeverity.mockImplementation(async (id, severity) => {
    const incident = incidents.find((i) => i.id === id)
    if (incident) incident.severity = severity
    return ok(undefined)
  })
  mockedIncidentRepo.addUpdate.mockResolvedValue(ok(undefined))
  mockedIncidentRepo.close.mockImplementation(async (id, resolvedAt) => {
    const incident = incidents.find((i) => i.id === id)
    if (incident) incident.resolvedAt = resolvedAt
    return ok(undefined)
  })
  vi.mocked(StatusCache.invalidate).mockResolvedValue(undefined)
}

function probeDatabase(
  status: ComponentStatus,
  error: string | null = null,
  latencyMs = 10,
) {
  mockedRunProbes.mockResolvedValue({
    app: { status: 'OPERATIONAL', latencyMs: 0, error: null },
    database: {
      status: status as 'OPERATIONAL' | 'DEGRADED' | 'MAJOR_OUTAGE',
      latencyMs,
      error,
    },
    cache: { status: 'OPERATIONAL', latencyMs: 2, error: null },
    auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
  })
}

let now = new Date('2026-09-22T17:00:00.000Z').getTime()

/** One collector run, one minute after the previous one (like the cron). */
async function collectAt(status: ComponentStatus, error: string | null = null) {
  now += MINUTE
  vi.setSystemTime(now)
  probeDatabase(status, error)
  return StatusService.collect('core')
}

function sentTexts(): string[] {
  return fetchMock.mock.calls.map(([, init]) => {
    const body = JSON.parse(String(init?.body)) as { text: string }
    return body.text
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  now = new Date('2026-09-22T17:00:00.000Z').getTime()
  vi.setSystemTime(now)
  env.webhook = WEBHOOK
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  resetCollectFailureAlert()
  installStore()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('StatusService.collect() -- Slack alerts on component transitions', () => {
  it('sends exactly one message when a component goes down, with what, state, since, error and link', async () => {
    await collectAt('OPERATIONAL')
    expect(fetchMock).not.toHaveBeenCalled()

    const result = await collectAt('MAJOR_OUTAGE', 'connect ECONNREFUSED')

    expectOk(result)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [text] = sentTexts()
    expect(text).toContain('Banco de dados')
    expect(text).toContain('fora do ar')
    expect(text).toContain('22/09 14:02') // 17:02 UTC in São Paulo
    expect(text).toContain('connect ECONNREFUSED')
    expect(text).toContain('https://nexopm.com/status')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(WEBHOOK)
  })

  it('says "oscilando" for a degraded component', async () => {
    await collectAt('OPERATIONAL')
    await collectAt('DEGRADED')
    expect(sentTexts()).toHaveLength(1)
    expect(sentTexts()[0]).toContain('oscilando')
  })

  it('sends nothing for repeated runs in the same bad state', async () => {
    await collectAt('OPERATIONAL')
    await collectAt('MAJOR_OUTAGE', 'down')
    fetchMock.mockClear()

    for (let i = 0; i < 10; i++) await collectAt('MAJOR_OUTAGE', 'down')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(incidents).toHaveLength(1)
  })

  it('sends nothing on the first run ever, when there is no history to compare with', async () => {
    await collectAt('OPERATIONAL')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('alerts on escalation and on de-escalation, once each, without lowering the incident peak', async () => {
    await collectAt('OPERATIONAL')
    await collectAt('DEGRADED')
    await collectAt('MAJOR_OUTAGE', 'timeout')
    await collectAt('MAJOR_OUTAGE', 'timeout')
    await collectAt('DEGRADED')
    await collectAt('DEGRADED')

    const texts = sentTexts()
    expect(texts).toHaveLength(3)
    expect(texts[1]).toContain('piorou')
    expect(texts[2]).toContain('melhorou')
    expect(incidents).toHaveLength(1)
    expect(incidents[0]?.severity).toBe('MAJOR_OUTAGE')
  })

  it('sends a recovery message when the component is back to operational', async () => {
    await collectAt('OPERATIONAL')
    await collectAt('MAJOR_OUTAGE', 'down')
    for (let i = 0; i < 4; i++) await collectAt('MAJOR_OUTAGE', 'down')
    await collectAt('OPERATIONAL')
    await collectAt('OPERATIONAL')

    const texts = sentTexts()
    expect(texts).toHaveLength(2)
    expect(texts[1]).toContain('voltou ao normal')
    expect(texts[1]).toContain('5 min')
    expect(incidents[0]?.resolvedAt).not.toBeNull()
  })

  it('suppresses flapping: three changes, one "instável", silence, then one recovery once stable', async () => {
    await collectAt('OPERATIONAL')
    // Latency crossing the DEGRADED threshold back and forth every minute.
    for (let i = 0; i < 12; i++) {
      await collectAt(i % 2 === 0 ? 'DEGRADED' : 'OPERATIONAL')
    }
    const duringFlap = sentTexts()
    expect(duringFlap).toHaveLength(4)
    expect(duringFlap[3]).toContain('instável')

    // Last flap left it OPERATIONAL; it now holds for the stable period.
    for (let i = 0; i < 20; i++) await collectAt('OPERATIONAL')

    const texts = sentTexts()
    expect(texts).toHaveLength(5)
    expect(texts[4]).toContain('estabilizou e está operacional')
    // The incident lifecycle itself is untouched by the suppression.
    expect(incidents).toHaveLength(6)
    expect(incidents.every((i) => i.resolvedAt !== null)).toBe(true)
  })

  it('does not call fetch at all when the webhook is unset', async () => {
    env.webhook = undefined

    await collectAt('OPERATIONAL')
    const result = await collectAt('MAJOR_OUTAGE', 'down')

    expectOk(result)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(incidents).toHaveLength(1)
  })

  it('keeps collecting and writing incidents when Slack answers 500', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))

    await collectAt('OPERATIONAL')
    const result = await collectAt('MAJOR_OUTAGE', 'down')

    expectOk(result)
    expect(incidents).toHaveLength(1)
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'alerts.slack.failed',
      expect.objectContaining({ status: 500 }),
    )
    expect(JSON.stringify(mockedLogger.error.mock.calls)).not.toContain(
      'secret-token',
    )
  })

  it('keeps collecting when Slack never answers, bounded by the timeout', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    await collectAt('OPERATIONAL')

    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    now += MINUTE
    vi.setSystemTime(now)
    probeDatabase('MAJOR_OUTAGE', 'down')
    const pending = StatusService.collect('core')
    await vi.advanceTimersByTimeAsync(SLACK_ALERT_TIMEOUT_MS)
    const result = await pending

    expectOk(result)
    expect(incidents).toHaveLength(1)
    expect(mockedLogger.error).toHaveBeenCalledWith(
      'alerts.slack.failed',
      expect.objectContaining({ reason: 'timeout' }),
    )
  })

  it('keeps the timeout short enough for the cron and the CLI', () => {
    expect(SLACK_ALERT_TIMEOUT_MS).toBeLessThanOrEqual(5_000)
  })
})

describe('StatusService.collect() -- alert when the collection itself cannot be recorded', () => {
  it('alerts once when writing the checks fails, and once when it works again', async () => {
    mockedStatusRepo.recordChecks.mockResolvedValue(
      err(databaseError('Failed to record health checks')),
    )

    await collectAt('MAJOR_OUTAGE', "Can't reach database server")
    await collectAt('MAJOR_OUTAGE', "Can't reach database server")
    await collectAt('MAJOR_OUTAGE', "Can't reach database server")

    expect(sentTexts()).toHaveLength(1)
    expect(sentTexts()[0]).toContain('coleta de status falhou')
    expect(sentTexts()[0]).toContain("Can't reach database server")

    installStore()
    await collectAt('OPERATIONAL')

    expect(sentTexts()).toHaveLength(2)
    expect(sentTexts()[1]).toContain('coleta de status voltou')
  })
})
