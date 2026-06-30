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
    peripheral: ['payment', 'email', 'storage'],
  }
  return {
    runProbesForTier: vi.fn(),
    componentsForTier: (tier: 'core' | 'peripheral') => TIER_KEYS[tier] ?? [],
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
    mockedStatusRepo.aggregateForDay.mockReset()
    mockedStatusRepo.upsertDaily.mockReset()
    mockedStatusRepo.pruneOldChecks.mockReset()
    mockedIncidentRepo.findOpenByComponent.mockReset()
    mockedIncidentRepo.create.mockReset()
    mockedIncidentRepo.close.mockReset()
    mockedIncidentRepo.bumpSeverity.mockReset()
    mockedIncidentRepo.addUpdate.mockReset()
    mockedCache.invalidate.mockReset()
  })

  it('should record probes and not open incidents when all OPERATIONAL', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDay.mockResolvedValue(
      ok({
        worstStatus: 'OPERATIONAL',
        totalChecks: 1,
        upChecks: 1,
        uptimePct: 100,
        avgLatencyMs: 10,
      }),
    )
    mockedStatusRepo.upsertDaily.mockResolvedValue(ok(undefined))
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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
    expect(mockedStatusRepo.aggregateForDay).not.toHaveBeenCalled()
  })

  it('should log and continue when incident evaluation fails', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'MAJOR_OUTAGE', latencyMs: 10, error: 'fail' },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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

  it('should propagate aggregateForDay error', async () => {
    mockedRunProbes.mockResolvedValue({
      app: { status: 'OPERATIONAL', latencyMs: 5, error: null },
      database: { status: 'OPERATIONAL', latencyMs: 10, error: null },
      cache: { status: 'OPERATIONAL', latencyMs: 3, error: null },
      auth: { status: 'OPERATIONAL', latencyMs: 20, error: null },
    })
    mockedStatusRepo.recordChecks.mockResolvedValue(ok(undefined))
    mockedStatusRepo.aggregateForDay.mockResolvedValue(err(databaseError()))

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
    mockedStatusRepo.aggregateForDay.mockResolvedValue(ok(null))
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
