import { describe, expect, it } from 'vitest'
import { expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { StatusRepository } from '@/src/repositories/status.repository'

describe('StatusRepository', () => {
  describe('recordChecks()', () => {
    it('should be a no-op when given an empty list', async () => {
      const result = await StatusRepository.recordChecks([])
      expectOk(result)

      const count = await prisma.healthCheck.count()
      expect(count).toBe(0)
    })

    it('should persist multiple health checks', async () => {
      const result = await StatusRepository.recordChecks([
        {
          componentKey: 'app',
          status: 'OPERATIONAL',
          latencyMs: 10,
          error: null,
        },
        {
          componentKey: 'database',
          status: 'DEGRADED',
          latencyMs: 2000,
          error: null,
        },
      ])
      expectOk(result)

      const rows = await prisma.healthCheck.findMany({
        orderBy: { componentKey: 'asc' },
      })
      expect(rows).toHaveLength(2)
      expect(rows[0]?.componentKey).toBe('app')
      expect(rows[1]?.status).toBe('DEGRADED')
    })
  })

  describe('aggregateForDayByKeys()', () => {
    it('should return an empty map when there are no checks in window', async () => {
      const from = new Date('2025-05-01T00:00:00.000Z')
      const to = new Date('2025-05-02T00:00:00.000Z')

      const result = await StatusRepository.aggregateForDayByKeys(
        ['app'],
        from,
        to,
      )

      expect(expectOk(result).size).toBe(0)
    })

    it('should return an empty map when given no keys', async () => {
      const result = await StatusRepository.aggregateForDayByKeys(
        [],
        new Date('2025-05-01T00:00:00.000Z'),
        new Date('2025-05-02T00:00:00.000Z'),
      )

      expect(expectOk(result).size).toBe(0)
    })

    it('should compute uptime, worst status and avg latency', async () => {
      const baseDay = new Date('2025-05-10T12:00:00.000Z')
      await prisma.healthCheck.createMany({
        data: [
          {
            componentKey: 'database',
            status: 'OPERATIONAL',
            latencyMs: 100,
            error: null,
            checkedAt: baseDay,
          },
          {
            componentKey: 'database',
            status: 'OPERATIONAL',
            latencyMs: 200,
            error: null,
            checkedAt: baseDay,
          },
          {
            componentKey: 'database',
            status: 'DEGRADED',
            latencyMs: 600,
            error: null,
            checkedAt: baseDay,
          },
          {
            componentKey: 'database',
            status: 'MAJOR_OUTAGE',
            latencyMs: 100,
            error: 'down',
            checkedAt: baseDay,
          },
        ],
      })

      const from = new Date('2025-05-10T00:00:00.000Z')
      const to = new Date('2025-05-11T00:00:00.000Z')
      const result = await StatusRepository.aggregateForDayByKeys(
        ['database'],
        from,
        to,
      )

      const agg = expectOk(result).get('database')
      expect(agg).not.toBeUndefined()
      expect(agg?.totalChecks).toBe(4)
      // Three of the four answered: two fast, one slow. Uptime counts answers,
      // not speed — counting only OPERATIONAL is what reported Resend at 50%
      // on days it served every request correctly. The slow minute is still
      // visible, in `worstStatus` and in the average latency.
      expect(agg?.upChecks).toBe(3)
      expect(agg?.uptimePct).toBe(75)
      expect(agg?.worstStatus).toBe('MAJOR_OUTAGE')
      expect(agg?.avgLatencyMs).toBe(250)
    })

    it('counts a degraded check as uptime and an outage as downtime', async () => {
      const day = new Date('2025-06-25T12:00:00.000Z')
      await prisma.healthCheck.createMany({
        data: [
          {
            componentKey: 'email',
            status: 'DEGRADED',
            latencyMs: 3_500,
            error: null,
            checkedAt: day,
          },
          {
            componentKey: 'email',
            status: 'DEGRADED',
            latencyMs: 3_600,
            error: null,
            checkedAt: day,
          },
          {
            componentKey: 'email',
            status: 'MAJOR_OUTAGE',
            latencyMs: 8_000,
            error: 'timeout',
            checkedAt: day,
          },
          {
            componentKey: 'email',
            status: 'PARTIAL_OUTAGE',
            latencyMs: 8_000,
            error: 'half down',
            checkedAt: day,
          },
        ],
      })

      const result = await StatusRepository.aggregateForDayByKeys(
        ['email'],
        new Date('2025-06-25T00:00:00.000Z'),
        new Date('2025-06-26T00:00:00.000Z'),
      )

      const agg = expectOk(result).get('email')
      expect(agg?.upChecks).toBe(2)
      expect(agg?.uptimePct).toBe(50)
      expect(agg?.worstStatus).toBe('MAJOR_OUTAGE')
    })

    it('should ignore checks outside window', async () => {
      const insideDay = new Date('2025-06-10T12:00:00.000Z')
      const outsideDay = new Date('2025-06-09T23:00:00.000Z')
      await prisma.healthCheck.createMany({
        data: [
          {
            componentKey: 'cache',
            status: 'OPERATIONAL',
            latencyMs: 50,
            error: null,
            checkedAt: insideDay,
          },
          {
            componentKey: 'cache',
            status: 'MAJOR_OUTAGE',
            latencyMs: 5000,
            error: 'x',
            checkedAt: outsideDay,
          },
        ],
      })

      const from = new Date('2025-06-10T00:00:00.000Z')
      const to = new Date('2025-06-11T00:00:00.000Z')
      const result = await StatusRepository.aggregateForDayByKeys(
        ['cache'],
        from,
        to,
      )

      const agg = expectOk(result).get('cache')
      expect(agg?.totalChecks).toBe(1)
      expect(agg?.worstStatus).toBe('OPERATIONAL')
    })

    // The reason this method exists: the collector used to ask once per
    // component, which is the N+1 Sentry flagged on /api/status/collect/core.
    it('should aggregate several components in a single call, and leave unmeasured ones out', async () => {
      const day = new Date('2025-06-20T12:00:00.000Z')
      await prisma.healthCheck.createMany({
        data: [
          {
            componentKey: 'app',
            status: 'OPERATIONAL',
            latencyMs: 10,
            error: null,
            checkedAt: day,
          },
          {
            componentKey: 'app',
            status: 'OPERATIONAL',
            latencyMs: 30,
            error: null,
            checkedAt: day,
          },
          {
            componentKey: 'database',
            status: 'PARTIAL_OUTAGE',
            latencyMs: 400,
            error: 'slow',
            checkedAt: day,
          },
        ],
      })

      const result = await StatusRepository.aggregateForDayByKeys(
        ['app', 'database', 'cache'],
        new Date('2025-06-20T00:00:00.000Z'),
        new Date('2025-06-21T00:00:00.000Z'),
      )

      const aggregates = expectOk(result)
      expect(aggregates.size).toBe(2)
      expect(aggregates.get('app')?.avgLatencyMs).toBe(20)
      expect(aggregates.get('app')?.uptimePct).toBe(100)
      expect(aggregates.get('database')?.worstStatus).toBe('PARTIAL_OUTAGE')
      expect(aggregates.get('database')?.uptimePct).toBe(0)
      // 'cache' was never probed that day: a gap, not a day at 0% uptime.
      expect(aggregates.has('cache')).toBe(false)
    })
  })

  describe('upsertDailies() + findDailies() + findDailiesForKeys()', () => {
    it('should insert and then update the same day', async () => {
      const day = new Date('2025-07-01T00:00:00.000Z')
      const insert = await StatusRepository.upsertDailies(day, [
        {
          componentKey: 'app',
          aggregate: {
            worstStatus: 'OPERATIONAL',
            totalChecks: 10,
            upChecks: 10,
            uptimePct: 100,
            avgLatencyMs: 50,
          },
        },
      ])
      expectOk(insert)

      const update = await StatusRepository.upsertDailies(day, [
        {
          componentKey: 'app',
          aggregate: {
            worstStatus: 'DEGRADED',
            totalChecks: 12,
            upChecks: 10,
            uptimePct: 83.333,
            avgLatencyMs: 80,
          },
        },
      ])
      expectOk(update)

      const all = await prisma.componentDaily.findMany({
        where: { componentKey: 'app', day },
      })
      expect(all).toHaveLength(1)
      expect(all[0]?.worstStatus).toBe('DEGRADED')
      expect(Number(all[0]?.uptimePct)).toBeCloseTo(83.333, 3)
    })

    it('should be a no-op when given no rows', async () => {
      const result = await StatusRepository.upsertDailies(
        new Date('2025-07-02T00:00:00.000Z'),
        [],
      )
      expectOk(result)

      expect(await prisma.componentDaily.count()).toBe(0)
    })

    // One statement has to handle both halves at once: rows that already exist
    // for the day are updated, rows that do not are inserted.
    it('should insert and update several components in one statement', async () => {
      const day = new Date('2025-07-05T00:00:00.000Z')
      expectOk(
        await StatusRepository.upsertDailies(day, [
          {
            componentKey: 'app',
            aggregate: {
              worstStatus: 'OPERATIONAL',
              totalChecks: 5,
              upChecks: 5,
              uptimePct: 100,
              avgLatencyMs: 10,
            },
          },
        ]),
      )

      expectOk(
        await StatusRepository.upsertDailies(day, [
          {
            componentKey: 'app',
            aggregate: {
              worstStatus: 'MAJOR_OUTAGE',
              totalChecks: 6,
              upChecks: 5,
              uptimePct: 83.333,
              avgLatencyMs: 900,
            },
          },
          {
            componentKey: 'cache',
            aggregate: {
              worstStatus: 'OPERATIONAL',
              totalChecks: 6,
              upChecks: 6,
              uptimePct: 100,
              avgLatencyMs: 4,
            },
          },
        ]),
      )

      const rows = await prisma.componentDaily.findMany({
        where: { day },
        orderBy: { componentKey: 'asc' },
      })
      expect(rows).toHaveLength(2)
      expect(rows[0]?.componentKey).toBe('app')
      expect(rows[0]?.worstStatus).toBe('MAJOR_OUTAGE')
      expect(rows[0]?.totalChecks).toBe(6)
      expect(Number(rows[0]?.uptimePct)).toBeCloseTo(83.333, 3)
      expect(rows[1]?.componentKey).toBe('cache')
      expect(rows[1]?.avgLatencyMs).toBe(4)
    })

    it('findDailies() should return rows for a key in window', async () => {
      const dayA = new Date('2025-07-10T00:00:00.000Z')
      const dayB = new Date('2025-07-11T00:00:00.000Z')
      await StatusRepository.upsertDailies(dayA, [
        {
          componentKey: 'email',
          aggregate: {
            worstStatus: 'OPERATIONAL',
            totalChecks: 1,
            upChecks: 1,
            uptimePct: 100,
            avgLatencyMs: 1,
          },
        },
      ])
      await StatusRepository.upsertDailies(dayB, [
        {
          componentKey: 'email',
          aggregate: {
            worstStatus: 'DEGRADED',
            totalChecks: 1,
            upChecks: 0,
            uptimePct: 0,
            avgLatencyMs: 1,
          },
        },
      ])

      const result = await StatusRepository.findDailies('email', dayA, dayB)
      const rows = expectOk(result)
      expect(rows).toHaveLength(2)
      expect(rows[0]?.day.toISOString()).toBe(dayA.toISOString())
    })

    it('findDailiesForKeys() should return empty when keys list is empty', async () => {
      const result = await StatusRepository.findDailiesForKeys(
        [],
        new Date('2025-01-01'),
        new Date('2025-01-31'),
      )
      expect(expectOk(result)).toEqual([])
    })

    it('findDailiesForKeys() should return rows across multiple keys', async () => {
      const day = new Date('2025-08-01T00:00:00.000Z')
      await StatusRepository.upsertDailies(day, [
        {
          componentKey: 'app',
          aggregate: {
            worstStatus: 'OPERATIONAL',
            totalChecks: 1,
            upChecks: 1,
            uptimePct: 100,
            avgLatencyMs: 1,
          },
        },
        {
          componentKey: 'database',
          aggregate: {
            worstStatus: 'DEGRADED',
            totalChecks: 1,
            upChecks: 0,
            uptimePct: 0,
            avgLatencyMs: 1,
          },
        },
      ])

      const result = await StatusRepository.findDailiesForKeys(
        ['app', 'database'],
        day,
        day,
      )
      const rows = expectOk(result)
      expect(rows.map((r) => r.componentKey).sort()).toEqual([
        'app',
        'database',
      ])
    })
  })

  describe('pruneOldChecks()', () => {
    it('should delete checks older than cutoff and return count', async () => {
      const old = new Date('2024-01-01T00:00:00.000Z')
      const fresh = new Date('2025-09-01T00:00:00.000Z')
      await prisma.healthCheck.createMany({
        data: [
          {
            componentKey: 'app',
            status: 'OPERATIONAL',
            latencyMs: 1,
            error: null,
            checkedAt: old,
          },
          {
            componentKey: 'app',
            status: 'OPERATIONAL',
            latencyMs: 1,
            error: null,
            checkedAt: fresh,
          },
        ],
      })

      const result = await StatusRepository.pruneOldChecks(
        new Date('2025-08-01T00:00:00.000Z'),
      )

      expect(expectOk(result)).toBe(1)
      const remaining = await prisma.healthCheck.findMany()
      expect(remaining).toHaveLength(1)
      expect(remaining[0]?.checkedAt.toISOString()).toBe(fresh.toISOString())
    })
  })

  describe('findRecentChecks()', () => {
    it('returns only the asked components since the cutoff, oldest first', async () => {
      const at = (min: number) => new Date(Date.UTC(2025, 9, 1, 12, min, 0, 0))
      await prisma.healthCheck.createMany({
        data: [
          {
            componentKey: 'database',
            status: 'DEGRADED',
            latencyMs: 1,
            checkedAt: at(3),
          },
          {
            componentKey: 'database',
            status: 'OPERATIONAL',
            latencyMs: 1,
            checkedAt: at(1),
          },
          {
            componentKey: 'cache',
            status: 'MAJOR_OUTAGE',
            latencyMs: 1,
            checkedAt: at(2),
          },
          {
            componentKey: 'email',
            status: 'OPERATIONAL',
            latencyMs: 1,
            checkedAt: at(2),
          },
          {
            componentKey: 'database',
            status: 'MAJOR_OUTAGE',
            latencyMs: 1,
            checkedAt: at(0),
          },
        ],
      })

      const rows = expectOk(
        await StatusRepository.findRecentChecks(['database', 'cache'], at(1)),
      )

      // The latency rides along because the collector decides whether slowness
      // has persisted from the recorded latencies, not from the recorded
      // statuses — those are already smoothed.
      expect(rows).toEqual([
        {
          componentKey: 'database',
          status: 'OPERATIONAL',
          latencyMs: 1,
          checkedAt: at(1),
        },
        {
          componentKey: 'cache',
          status: 'MAJOR_OUTAGE',
          latencyMs: 1,
          checkedAt: at(2),
        },
        {
          componentKey: 'database',
          status: 'DEGRADED',
          latencyMs: 1,
          checkedAt: at(3),
        },
      ])
    })

    it('does not query when no component is asked for', async () => {
      const rows = expectOk(
        await StatusRepository.findRecentChecks([], new Date(0)),
      )
      expect(rows).toEqual([])
    })
  })

  describe('findLatestPerComponent()', () => {
    it('should return the latest check per component', async () => {
      const t1 = new Date('2025-10-01T00:00:00.000Z')
      const t2 = new Date('2025-10-01T00:01:00.000Z')
      await prisma.healthCheck.createMany({
        data: [
          {
            componentKey: 'app',
            status: 'OPERATIONAL',
            latencyMs: 50,
            error: null,
            checkedAt: t1,
          },
          {
            componentKey: 'app',
            status: 'DEGRADED',
            latencyMs: 1500,
            error: null,
            checkedAt: t2,
          },
          {
            componentKey: 'cache',
            status: 'OPERATIONAL',
            latencyMs: 5,
            error: null,
            checkedAt: t1,
          },
        ],
      })

      const result = await StatusRepository.findLatestPerComponent()
      const rows = expectOk(result)

      const byKey = Object.fromEntries(rows.map((r) => [r.componentKey, r]))
      expect(byKey.app?.status).toBe('DEGRADED')
      expect(byKey.cache?.status).toBe('OPERATIONAL')
    })
  })
})
