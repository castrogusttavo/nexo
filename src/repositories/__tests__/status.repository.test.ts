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

  describe('aggregateForDay()', () => {
    it('should return null when there are no checks in window', async () => {
      const from = new Date('2025-05-01T00:00:00.000Z')
      const to = new Date('2025-05-02T00:00:00.000Z')

      const result = await StatusRepository.aggregateForDay('app', from, to)

      expect(expectOk(result)).toBeNull()
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
      const result = await StatusRepository.aggregateForDay(
        'database',
        from,
        to,
      )

      const agg = expectOk(result)
      expect(agg).not.toBeNull()
      expect(agg?.totalChecks).toBe(4)
      expect(agg?.upChecks).toBe(2)
      expect(agg?.uptimePct).toBe(50)
      expect(agg?.worstStatus).toBe('MAJOR_OUTAGE')
      expect(agg?.avgLatencyMs).toBe(250)
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
      const result = await StatusRepository.aggregateForDay('cache', from, to)

      const agg = expectOk(result)
      expect(agg?.totalChecks).toBe(1)
      expect(agg?.worstStatus).toBe('OPERATIONAL')
    })
  })

  describe('upsertDaily() + findDailies() + findDailiesForKeys()', () => {
    it('should insert and then update the same day', async () => {
      const day = new Date('2025-07-01T00:00:00.000Z')
      const insert = await StatusRepository.upsertDaily('app', day, {
        worstStatus: 'OPERATIONAL',
        totalChecks: 10,
        upChecks: 10,
        uptimePct: 100,
        avgLatencyMs: 50,
      })
      expectOk(insert)

      const update = await StatusRepository.upsertDaily('app', day, {
        worstStatus: 'DEGRADED',
        totalChecks: 12,
        upChecks: 10,
        uptimePct: 83.333,
        avgLatencyMs: 80,
      })
      expectOk(update)

      const all = await prisma.componentDaily.findMany({
        where: { componentKey: 'app', day },
      })
      expect(all).toHaveLength(1)
      expect(all[0]?.worstStatus).toBe('DEGRADED')
      expect(Number(all[0]?.uptimePct)).toBeCloseTo(83.333, 3)
    })

    it('findDailies() should return rows for a key in window', async () => {
      const dayA = new Date('2025-07-10T00:00:00.000Z')
      const dayB = new Date('2025-07-11T00:00:00.000Z')
      await StatusRepository.upsertDaily('email', dayA, {
        worstStatus: 'OPERATIONAL',
        totalChecks: 1,
        upChecks: 1,
        uptimePct: 100,
        avgLatencyMs: 1,
      })
      await StatusRepository.upsertDaily('email', dayB, {
        worstStatus: 'DEGRADED',
        totalChecks: 1,
        upChecks: 0,
        uptimePct: 0,
        avgLatencyMs: 1,
      })

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
      await StatusRepository.upsertDaily('app', day, {
        worstStatus: 'OPERATIONAL',
        totalChecks: 1,
        upChecks: 1,
        uptimePct: 100,
        avgLatencyMs: 1,
      })
      await StatusRepository.upsertDaily('database', day, {
        worstStatus: 'DEGRADED',
        totalChecks: 1,
        upChecks: 0,
        uptimePct: 0,
        avgLatencyMs: 1,
      })

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
