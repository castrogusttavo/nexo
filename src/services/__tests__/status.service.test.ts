import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { databaseError } from '@/src/errors'
import { err, ok } from '@/src/lib/result'

vi.mock('@/src/lib/prisma', () => ({
  prisma: {
    incident: { findMany: vi.fn() },
  },
}))
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
import { prisma } from '@/src/lib/prisma'
import { IncidentRepository } from '@/src/repositories/incident.repository'
import { StatusRepository } from '@/src/repositories/status.repository'
import { runProbesForTier } from '@/src/services/status/probes'
import { StatusService } from '@/src/services/status/status.service'

const mockedCache = vi.mocked(StatusCache)
const mockedStatusRepo = vi.mocked(StatusRepository)
const mockedIncidentRepo = vi.mocked(IncidentRepository)
const mockedRunProbes = vi.mocked(runProbesForTier)
const mockedPrismaIncident = vi.mocked(prisma.incident.findMany)

beforeEach(() => {
  mockedPrismaIncident.mockResolvedValue([])
})

function daily(componentKey: string, day: Date, uptimePct: string) {
  return {
    id: `d-${componentKey}-${day.toISOString()}`,
    componentKey,
    day,
    worstStatus: 'OPERATIONAL' as const,
    totalChecks: 100,
    upChecks: 100,
    uptimePct: { toString: () => uptimePct } as unknown as never,
    avgLatencyMs: 10,
    updatedAt: day,
  }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

describe('StatusService.getCurrentSnapshot()', () => {
  it('should return cached snapshot when present', async () => {
    const snapshot = {
      overallStatus: 'OPERATIONAL' as const,
      generatedAt: '2025-01-01T00:00:00.000Z',
      components: [],
    }
    mockedCache.get.mockResolvedValue(snapshot)

    const result = await StatusService.getCurrentSnapshot()

    const value = expectOk(result)
    expect(value).toBe(snapshot)
    expect(mockedStatusRepo.findDailiesForKeys).not.toHaveBeenCalled()
  })

  it('should build snapshot from repos on cache miss and store result', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(ok([]))
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(ok([]))
    mockedCache.set.mockResolvedValue(undefined)

    const result = await StatusService.getCurrentSnapshot()

    const value = expectOk(result)
    expect(value.overallStatus).toBe('OPERATIONAL')
    expect(value.components.length).toBeGreaterThan(0)
    expect(mockedCache.set).toHaveBeenCalled()
  })

  it('should compute MAJOR_OUTAGE when a core component is down', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(ok([]))
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(
      ok([
        {
          id: 'h1',
          componentKey: 'database',
          status: 'MAJOR_OUTAGE',
          latencyMs: 100,
          error: 'down',
          checkedAt: new Date(),
        },
      ]),
    )
    mockedCache.set.mockResolvedValue(undefined)

    const result = await StatusService.getCurrentSnapshot()

    const value = expectOk(result)
    expect(value.overallStatus).toBe('MAJOR_OUTAGE')
  })

  it('should compute DEGRADED when only a peripheral component is degraded', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(ok([]))
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(
      ok([
        {
          id: 'h1',
          componentKey: 'email',
          status: 'DEGRADED',
          latencyMs: 2000,
          error: null,
          checkedAt: new Date(),
        },
      ]),
    )
    mockedCache.set.mockResolvedValue(undefined)

    const result = await StatusService.getCurrentSnapshot()

    const value = expectOk(result)
    expect(value.overallStatus).toBe('DEGRADED')
  })

  it('should compute PARTIAL_OUTAGE when a core component is degraded', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(ok([]))
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(
      ok([
        {
          id: 'h1',
          componentKey: 'database',
          status: 'DEGRADED',
          latencyMs: 1800,
          error: null,
          checkedAt: new Date(),
        },
      ]),
    )
    mockedCache.set.mockResolvedValue(undefined)

    const result = await StatusService.getCurrentSnapshot()

    const value = expectOk(result)
    expect(value.overallStatus).toBe('PARTIAL_OUTAGE')
  })

  it('attaches incident ids to history days within an incident window', async () => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    mockedCache.get.mockResolvedValue(null)
    mockedCache.set.mockResolvedValue(undefined)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(
      ok([
        {
          id: 'd1',
          componentKey: 'database',
          day: today,
          worstStatus: 'MAJOR_OUTAGE',
          totalChecks: 10,
          upChecks: 0,
          uptimePct: { toString: () => '0' } as unknown as never,
          avgLatencyMs: 0,
          updatedAt: today,
        },
      ]),
    )
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(ok([]))
    mockedPrismaIncident.mockResolvedValue([
      {
        id: 'inc-db',
        componentKey: 'database',
        startedAt: today,
        resolvedAt: null,
      },
    ] as never)

    const result = await StatusService.getCurrentSnapshot()

    const value = expectOk(result)
    const db = value.components.find((c) => c.key === 'database')
    expect(db?.history).toHaveLength(1)
    expect(db?.history[0]?.incidentId).toBe('inc-db')
  })

  it('averages the daily uptime into uptime90d', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedCache.set.mockResolvedValue(undefined)
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(ok([]))
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(
      ok([
        daily('database', new Date('2025-01-01T00:00:00.000Z'), '100'),
        daily('database', new Date('2025-01-02T00:00:00.000Z'), '50'),
        daily('database', new Date('2025-01-03T00:00:00.000Z'), '99'),
      ]),
    )

    const result = await StatusService.getCurrentSnapshot()

    const value = expectOk(result)
    const db = value.components.find((c) => c.key === 'database')
    // (100 + 50 + 99) / 3, rounded to three decimals. This is the headline
    // number on the public status page and nothing asserted it before.
    expect(db?.uptime90d).toBe(83)
    // A component with no dailies has no uptime to report, not NaN.
    const app = value.components.find((c) => c.key === 'app')
    expect(app?.uptime90d).toBe(0)
  })

  it('asks the repository for exactly the last 90 UTC days', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedCache.set.mockResolvedValue(undefined)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(ok([]))
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(ok([]))

    await StatusService.getCurrentSnapshot()

    const [, fromDay, toDay] = mockedStatusRepo.findDailiesForKeys.mock.calls[0]
    expect(toDay.toISOString()).toBe(`${isoDay(new Date())}T00:00:00.000Z`)
    expect(daysBetween(fromDay, toDay)).toBe(89)
  })

  it('should still return snapshot when cache write throws', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(ok([]))
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(ok([]))
    mockedCache.set.mockRejectedValue(new Error('redis down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await StatusService.getCurrentSnapshot()

    expectOk(result)
  })

  it('should fall back to repo when cache read throws', async () => {
    mockedCache.get.mockRejectedValue(new Error('redis down'))
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(ok([]))
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(ok([]))
    mockedCache.set.mockResolvedValue(undefined)

    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await StatusService.getCurrentSnapshot()

    expectOk(result)
  })

  it('should propagate repo error', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(err(databaseError()))

    const result = await StatusService.getCurrentSnapshot()

    expectErr(result, 'DATABASE_ERROR')
  })

  it('should propagate error when findLatestPerComponent fails', async () => {
    mockedCache.get.mockResolvedValue(null)
    mockedStatusRepo.findDailiesForKeys.mockResolvedValue(ok([]))
    mockedStatusRepo.findLatestPerComponent.mockResolvedValue(
      err(databaseError()),
    )

    const result = await StatusService.getCurrentSnapshot()

    expectErr(result, 'DATABASE_ERROR')
  })
})

describe('StatusService.getHistory()', () => {
  it('should return DATABASE_ERROR for unknown component key', async () => {
    const result = await StatusService.getHistory(
      'not-a-component' as 'app',
      30,
    )

    expectErr(result, 'DATABASE_ERROR')
  })

  it('should return mapped daily history', async () => {
    mockedStatusRepo.findDailies.mockResolvedValue(
      ok([
        {
          id: 'd1',
          componentKey: 'app',
          day: new Date('2025-01-01T00:00:00.000Z'),
          worstStatus: 'OPERATIONAL',
          totalChecks: 100,
          upChecks: 100,
          uptimePct: { toString: () => '100' } as unknown as never,
          avgLatencyMs: 50,
          updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      ]),
    )

    const result = await StatusService.getHistory('app', 1)

    const value = expectOk(result)
    expect(value).toHaveLength(1)
    expect(value[0]?.day).toBe('2025-01-01')
    expect(value[0]?.uptimePct).toBe(100)
  })

  it('queries the window backwards from today, inclusive of today', async () => {
    mockedStatusRepo.findDailies.mockResolvedValue(ok([]))

    await StatusService.getHistory('app', 30)

    const [, fromDay, toDay] = mockedStatusRepo.findDailies.mock.calls[0]
    // 30 days inclusive means today minus 29, at UTC midnight. A sign slip
    // or an off-by-one here silently queries a window in the future.
    expect(toDay.toISOString()).toBe(`${isoDay(new Date())}T00:00:00.000Z`)
    expect(fromDay.toISOString()).toBe(
      `${isoDay(new Date(Date.now() - 29 * 86_400_000))}T00:00:00.000Z`,
    )
  })

  it('should propagate repo error', async () => {
    mockedStatusRepo.findDailies.mockResolvedValue(err(databaseError()))

    const result = await StatusService.getHistory('app', 30)

    expectErr(result, 'DATABASE_ERROR')
  })
})

describe('StatusService.listIncidents()', () => {
  it('should map repo rows into IncidentSummaryDTO', async () => {
    const startedAt = new Date('2025-01-01T08:00:00.000Z')
    const resolvedAt = new Date('2025-01-01T09:00:00.000Z')
    mockedIncidentRepo.findInWindow.mockResolvedValue(
      ok([
        {
          id: 'i1',
          componentKey: 'database',
          severity: 'PARTIAL_OUTAGE',
          title: 'DB lenta',
          startedAt,
          resolvedAt,
        },
      ]),
    )

    const result = await StatusService.listIncidents(7)

    const value = expectOk(result)
    expect(value).toEqual([
      {
        id: 'i1',
        componentKey: 'database',
        componentName: 'Banco de dados',
        severity: 'PARTIAL_OUTAGE',
        title: 'DB lenta',
        startedAt: startedAt.toISOString(),
        resolvedAt: resolvedAt.toISOString(),
      },
    ])
  })

  it('falls back to the raw key when the incident names an unknown component', async () => {
    mockedIncidentRepo.findInWindow.mockResolvedValue(
      ok([
        {
          id: 'i2',
          componentKey: 'retired-component',
          severity: 'MAJOR_OUTAGE',
          title: 'Fora do ar',
          startedAt: new Date('2025-01-01T08:00:00.000Z'),
          resolvedAt: null,
        },
      ]),
    )

    const result = await StatusService.listIncidents(7)

    // A component removed from COMPONENTS still has rows in the DB; the
    // listing must degrade to the key, not crash on `undefined.name`.
    expect(expectOk(result)[0]?.componentName).toBe('retired-component')
  })

  it('queries incidents from the start of the requested window', async () => {
    mockedIncidentRepo.findInWindow.mockResolvedValue(ok([]))

    await StatusService.listIncidents(7)

    const [fromDay] = mockedIncidentRepo.findInWindow.mock.calls[0]
    expect(fromDay.toISOString()).toBe(
      `${isoDay(new Date(Date.now() - 6 * 86_400_000))}T00:00:00.000Z`,
    )
  })

  it('should propagate repo error', async () => {
    mockedIncidentRepo.findInWindow.mockResolvedValue(err(databaseError()))

    const result = await StatusService.listIncidents()

    expectErr(result, 'DATABASE_ERROR')
  })
})

describe('StatusService.getIncident()', () => {
  it('should return notFound when incident does not exist', async () => {
    mockedIncidentRepo.findById.mockResolvedValue(ok(null))

    const result = await StatusService.getIncident('missing')

    expectErr(result, 'RESOURCE_NOT_FOUND')
  })

  it('should return summary plus updates when found', async () => {
    const startedAt = new Date('2025-01-01T08:00:00.000Z')
    const postedAt = new Date('2025-01-01T08:30:00.000Z')
    mockedIncidentRepo.findById.mockResolvedValue(
      ok({
        id: 'i1',
        componentKey: 'cache',
        severity: 'DEGRADED',
        title: 'Cache lento',
        startedAt,
        resolvedAt: null,
        updates: [
          {
            id: 'u1',
            incidentId: 'i1',
            event: 'INVESTIGATING',
            message: 'olhando',
            postedAt,
          },
        ],
      }),
    )

    const result = await StatusService.getIncident('i1')

    const value = expectOk(result)
    expect(value.id).toBe('i1')
    expect(value.componentName).toBe('Cache (Redis)')
    expect(value.updates).toEqual([
      {
        id: 'u1',
        event: 'INVESTIGATING',
        message: 'olhando',
        postedAt: postedAt.toISOString(),
      },
    ])
  })

  it('should propagate repo error', async () => {
    mockedIncidentRepo.findById.mockResolvedValue(err(databaseError()))

    const result = await StatusService.getIncident('i1')

    expectErr(result, 'DATABASE_ERROR')
  })
})

describe('StatusService.collect()', () => {
  beforeEach(() => {
    mockedRunProbes.mockReset()
    mockedStatusRepo.recordChecks.mockReset()
    mockedStatusRepo.aggregateForDayByKeys.mockReset()
    mockedStatusRepo.upsertDailies.mockReset()
    // The rollup write is now one call for the whole tier and always happens,
    // even with nothing to write, so it needs a default here rather than in
    // every case that only cares about incidents.
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedStatusRepo.upsertDailies.mockResolvedValue(ok(undefined))
    mockedStatusRepo.pruneOldChecks.mockReset()
    mockedStatusRepo.findRecentChecks.mockReset()
    mockedStatusRepo.findRecentChecks.mockResolvedValue(ok([]))
    mockedIncidentRepo.findOpenByComponent.mockReset()
    mockedIncidentRepo.create.mockReset()
    mockedIncidentRepo.close.mockReset()
    mockedIncidentRepo.bumpSeverity.mockReset()
    mockedIncidentRepo.addUpdate.mockReset()
    mockedCache.invalidate.mockReset()
  })

  // A slow minute is not an outage and not even a degradation: the collector,
  // the CI runner and the nightly backup share one machine, so the status page
  // used to report our own builds as incidents.
  describe('slowness has to persist before it counts', () => {
    function slowDatabaseProbe() {
      mockedRunProbes.mockResolvedValue({
        app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
        database: { status: 'DEGRADED', latencyMs: 5_000, error: null },
        cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
        auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
      })
      mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
      mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
      // Reached only by the cases where the slowness does persist.
      mockedIncidentRepo.create.mockResolvedValue(
        ok({
          id: 'inc-slow',
          componentKey: 'database',
          severity: 'DEGRADED',
          startedAt: new Date(),
        } as never),
      )
      mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
      mockedCache.invalidate.mockResolvedValue(undefined)
    }

    function pastChecks(...latencies: number[]) {
      return latencies.map((latencyMs, index) => ({
        componentKey: 'database',
        status: 'OPERATIONAL' as const,
        latencyMs,
        checkedAt: new Date(Date.now() - (latencies.length - index) * 60_000),
      }))
    }

    function recordedDatabaseStatus() {
      const rows = mockedStatusRepo.recordChecks.mock.calls[0]?.[0] ?? []
      return rows.find((r) => r.componentKey === 'database')?.status
    }

    it('records a single slow sample as OPERATIONAL', async () => {
      slowDatabaseProbe()
      mockedStatusRepo.findRecentChecks.mockResolvedValue(ok([]))

      expectOk(await StatusService.collect('core'))

      expect(recordedDatabaseStatus()).toBe('OPERATIONAL')
      expect(mockedIncidentRepo.create).not.toHaveBeenCalled()
    })

    it('records DEGRADED once the two previous samples were slow too', async () => {
      slowDatabaseProbe()
      mockedStatusRepo.findRecentChecks.mockResolvedValue(
        ok(pastChecks(4_000, 6_000)),
      )

      expectOk(await StatusService.collect('core'))

      expect(recordedDatabaseStatus()).toBe('DEGRADED')
      expect(mockedIncidentRepo.create).toHaveBeenCalled()
    })

    it('resets the streak when one of the previous samples was fast', async () => {
      slowDatabaseProbe()
      mockedStatusRepo.findRecentChecks.mockResolvedValue(
        ok(pastChecks(4_000, 12)),
      )

      expectOk(await StatusService.collect('core'))

      expect(recordedDatabaseStatus()).toBe('OPERATIONAL')
    })

    // The streak is read from the recorded *latencies*, not the recorded
    // statuses: those are already smoothed, so comparing against them would
    // reset the streak forever and a permanently slow component would never
    // degrade at all.
    it('degrades a component that is slow every minute', async () => {
      slowDatabaseProbe()
      mockedStatusRepo.findRecentChecks.mockResolvedValue(
        ok(pastChecks(5_000, 5_000, 5_000, 5_000)),
      )

      expectOk(await StatusService.collect('core'))

      expect(recordedDatabaseStatus()).toBe('DEGRADED')
    })

    it('records a failure on the first sample, with no smoothing', async () => {
      mockedRunProbes.mockResolvedValue({
        app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
        database: {
          status: 'MAJOR_OUTAGE',
          latencyMs: 5_000,
          error: 'timeout',
        },
        cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
        auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
      })
      mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
      mockedStatusRepo.findRecentChecks.mockResolvedValue(ok([]))
      mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
      mockedIncidentRepo.create.mockResolvedValue(
        ok({
          id: 'inc-1',
          componentKey: 'database',
          severity: 'MAJOR_OUTAGE',
          startedAt: new Date(),
        } as never),
      )
      mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
      mockedCache.invalidate.mockResolvedValue(undefined)

      expectOk(await StatusService.collect('core'))

      expect(recordedDatabaseStatus()).toBe('MAJOR_OUTAGE')
      expect(mockedIncidentRepo.create).toHaveBeenCalled()
    })
  })

  it('should record probes and not open incidents when all OPERATIONAL', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(
      ok(
        new Map([
          [
            'database' as const,
            {
              worstStatus: 'OPERATIONAL' as const,
              totalChecks: 1,
              upChecks: 1,
              uptimePct: 100,
              avgLatencyMs: 10,
            },
          ],
        ]),
      ),
    )
    mockedStatusRepo.upsertDailies.mockResolvedValue(ok(undefined))
    mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)

    const result = await StatusService.collect('core')

    expectOk(result)
    expect(mockedStatusRepo.recordChecks).toHaveBeenCalledTimes(1)
    expect(mockedIncidentRepo.create).not.toHaveBeenCalled()
    expect(mockedCache.invalidate).toHaveBeenCalled()
  })

  it('should open a new incident when a core probe goes MAJOR_OUTAGE', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'MAJOR_OUTAGE', latencyMs: 10, error: 'conn fail' },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
    mockedIncidentRepo.create.mockResolvedValue(
      ok({
        id: 'new-i',
        componentKey: 'database',
        severity: 'MAJOR_OUTAGE',
        title: 'x',
        startedAt: new Date(),
        resolvedAt: null,
      }),
    )
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)

    const result = await StatusService.collect('core')

    expectOk(result)
    expect(mockedIncidentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        componentKey: 'database',
        severity: 'MAJOR_OUTAGE',
      }),
    )
  })

  it('should close an open incident when probe returns to OPERATIONAL', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockImplementation(async (key) =>
      key === 'database'
        ? ok({
            id: 'open-i',
            componentKey: 'database',
            severity: 'DEGRADED',
            title: 'x',
            startedAt: new Date(),
            resolvedAt: null,
          })
        : ok(null),
    )
    mockedIncidentRepo.close.mockResolvedValue(ok(undefined))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)

    const result = await StatusService.collect('core')

    expectOk(result)
    expect(mockedIncidentRepo.close).toHaveBeenCalledWith(
      'open-i',
      expect.any(Date),
      expect.stringContaining('Banco de dados'),
    )
  })

  it('should bump severity when probe escalates above current severity', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'MAJOR_OUTAGE', latencyMs: 10, error: 'fatal' },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockImplementation(async (key) =>
      key === 'database'
        ? ok({
            id: 'open-i',
            componentKey: 'database',
            severity: 'DEGRADED',
            title: 'x',
            startedAt: new Date(),
            resolvedAt: null,
          })
        : ok(null),
    )
    mockedIncidentRepo.bumpSeverity.mockResolvedValue(ok(undefined))
    mockedIncidentRepo.addUpdate.mockResolvedValue(ok(undefined))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)

    const result = await StatusService.collect('core')

    expectOk(result)
    expect(mockedIncidentRepo.bumpSeverity).toHaveBeenCalledWith(
      'open-i',
      'MAJOR_OUTAGE',
    )
    expect(mockedIncidentRepo.addUpdate).toHaveBeenCalledWith(
      'open-i',
      'IDENTIFIED',
      expect.any(String),
    )
  })

  it('should not bump severity when the probe matches the open severity', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'DEGRADED', latencyMs: 10, error: 'slow' },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockImplementation(async (key) =>
      key === 'database'
        ? ok({
            id: 'open-i',
            componentKey: 'database',
            severity: 'DEGRADED',
            title: 'x',
            startedAt: new Date(),
            resolvedAt: null,
          })
        : ok(null),
    )
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)

    const result = await StatusService.collect('core')

    expectOk(result)
    // Strictly-greater, not >=: an unchanged severity must not spam the
    // incident timeline with a new "severity updated" entry on every probe.
    expect(mockedIncidentRepo.bumpSeverity).not.toHaveBeenCalled()
    expect(mockedIncidentRepo.addUpdate).not.toHaveBeenCalled()
  })

  it('prunes raw checks older than the retention window, never newer', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)

    await StatusService.collect('core')

    const [cutoff] = mockedStatusRepo.pruneOldChecks.mock.calls[0]
    // A cutoff in the future would delete every raw health check there is.
    expect(cutoff.toISOString()).toBe(
      `${isoDay(new Date(Date.now() - 7 * 86_400_000))}T00:00:00.000Z`,
    )
  })

  it('should propagate recordChecks error', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(err(databaseError()))

    const result = await StatusService.collect('core')

    expectErr(result, 'DATABASE_ERROR')
    expect(mockedStatusRepo.aggregateForDayByKeys).not.toHaveBeenCalled()
  })

  it('should log and continue when incident evaluation fails', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'MAJOR_OUTAGE', latencyMs: 10, error: 'fail' },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockResolvedValue(
      err(databaseError()),
    )
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await StatusService.collect('core')

    expectOk(result)
    expect(mockedIncidentRepo.create).not.toHaveBeenCalled()
  })

  it('should log and still succeed when pruning old checks fails', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(err(databaseError()))
    mockedCache.invalidate.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await StatusService.collect('core')

    expectOk(result)
  })

  it('should log and still succeed when cache invalidation throws', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockRejectedValue(new Error('redis down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await StatusService.collect('core')

    expectOk(result)
  })

  it('should log and succeed when creating a new incident fails', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'MAJOR_OUTAGE', latencyMs: 10, error: 'fail' },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
    mockedIncidentRepo.create.mockResolvedValue(err(databaseError()))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await StatusService.collect('core')

    expectOk(result)
    expect(mockedIncidentRepo.create).toHaveBeenCalled()
  })

  it('should log and succeed when bumping severity fails', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'MAJOR_OUTAGE', latencyMs: 10, error: 'fatal' },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockImplementation(async (key) =>
      key === 'database'
        ? ok({
            id: 'open-i',
            componentKey: 'database',
            severity: 'DEGRADED',
            title: 'x',
            startedAt: new Date(),
            resolvedAt: null,
          })
        : ok(null),
    )
    mockedIncidentRepo.bumpSeverity.mockResolvedValue(err(databaseError()))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await StatusService.collect('core')

    expectOk(result)
    expect(mockedIncidentRepo.addUpdate).not.toHaveBeenCalled()
  })

  it('should log and succeed when posting the severity update fails', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'MAJOR_OUTAGE', latencyMs: 10, error: 'fatal' },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockImplementation(async (key) =>
      key === 'database'
        ? ok({
            id: 'open-i',
            componentKey: 'database',
            severity: 'DEGRADED',
            title: 'x',
            startedAt: new Date(),
            resolvedAt: null,
          })
        : ok(null),
    )
    mockedIncidentRepo.bumpSeverity.mockResolvedValue(ok(undefined))
    mockedIncidentRepo.addUpdate.mockResolvedValue(err(databaseError()))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await StatusService.collect('core')

    expectOk(result)
    expect(mockedIncidentRepo.addUpdate).toHaveBeenCalled()
  })

  it('should propagate aggregateForDayByKeys error', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(
      err(databaseError()),
    )

    const result = await StatusService.collect('core')

    expectErr(result, 'DATABASE_ERROR')
  })

  it('should skip components missing from the probe map', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      // 'auth' intentionally omitted from the probe map
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDayByKeys.mockResolvedValue(ok(new Map()))
    mockedIncidentRepo.findOpenByComponent.mockResolvedValue(ok(null))
    mockedStatusRepo.pruneOldChecks.mockResolvedValue(ok(0))
    mockedCache.invalidate.mockResolvedValue(undefined)

    const result = await StatusService.collect('core')

    expectOk(result)
    const rows = mockedStatusRepo.recordChecks.mock.calls[0]?.[0]
    expect(rows).toHaveLength(3)
    expect(rows?.map((r) => r.componentKey)).not.toContain('auth')
  })
})
