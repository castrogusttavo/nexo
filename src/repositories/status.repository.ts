import type {
  ComponentDaily,
  ComponentStatus,
  HealthCheck,
} from '@prisma/client'
import { Prisma } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import type { ComponentKey } from '@/src/services/status/components'
import type { DailyAggregate } from '@/types/status'
import { dbError } from './db-error'

interface InsertCheck {
  componentKey: ComponentKey
  status: ComponentStatus
  latencyMs: number
  error: string | null
}

export const StatusRepository = {
  async recordChecks(rows: InsertCheck[]): Promise<Result<void>> {
    if (rows.length === 0) return ok(undefined)
    try {
      await prisma.healthCheck.createMany({
        data: rows.map((r) => ({
          componentKey: r.componentKey,
          status: r.status,
          latencyMs: r.latencyMs,
          error: r.error,
        })),
      })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to record health checks', error))
    }
  },

  async pruneOldChecks(beforeDate: Date): Promise<Result<number>> {
    try {
      const result = await prisma.healthCheck.deleteMany({
        where: { checkedAt: { lt: beforeDate } },
      })
      return ok(result.count)
    } catch (error) {
      return err(dbError('Failed to prune old health checks', error))
    }
  },

  async aggregateForDay(
    componentKey: ComponentKey,
    fromDate: Date,
    toDate: Date,
  ): Promise<Result<DailyAggregate | null>> {
    try {
      const rows = await prisma.healthCheck.findMany({
        where: {
          componentKey,
          checkedAt: { gte: fromDate, lt: toDate },
        },
        select: { status: true, latencyMs: true },
      })

      if (rows.length === 0) return ok(null)

      let upChecks = 0
      let latencySum = 0
      let worst: ComponentStatus = 'OPERATIONAL'
      const rank: Record<ComponentStatus, number> = {
        OPERATIONAL: 0,
        MAINTENANCE: 1,
        DEGRADED: 2,
        PARTIAL_OUTAGE: 3,
        MAJOR_OUTAGE: 4,
      }

      for (const row of rows) {
        if (row.status === 'OPERATIONAL') upChecks += 1
        latencySum += row.latencyMs
        if (rank[row.status] > rank[worst]) worst = row.status
      }

      const total = rows.length
      return ok({
        worstStatus: worst,
        totalChecks: total,
        upChecks,
        uptimePct: Number(((upChecks / total) * 100).toFixed(3)),
        avgLatencyMs: Math.round(latencySum / total),
      })
    } catch (error) {
      return err(dbError('Failed to aggregate daily checks', error))
    }
  },

  async upsertDaily(
    componentKey: ComponentKey,
    day: Date,
    agg: DailyAggregate,
  ): Promise<Result<void>> {
    try {
      const data: Prisma.ComponentDailyCreateInput = {
        componentKey,
        day,
        worstStatus: agg.worstStatus,
        totalChecks: agg.totalChecks,
        upChecks: agg.upChecks,
        uptimePct: new Prisma.Decimal(agg.uptimePct),
        avgLatencyMs: agg.avgLatencyMs,
      }
      await prisma.componentDaily.upsert({
        where: { componentKey_day: { componentKey, day } },
        create: data,
        update: {
          worstStatus: agg.worstStatus,
          totalChecks: agg.totalChecks,
          upChecks: agg.upChecks,
          uptimePct: new Prisma.Decimal(agg.uptimePct),
          avgLatencyMs: agg.avgLatencyMs,
        },
      })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to upsert component daily', error))
    }
  },

  async findDailies(
    componentKey: ComponentKey,
    fromDay: Date,
    toDay: Date,
  ): Promise<Result<ComponentDaily[]>> {
    try {
      const rows = await prisma.componentDaily.findMany({
        where: { componentKey, day: { gte: fromDay, lte: toDay } },
        orderBy: { day: 'asc' },
      })
      return ok(rows)
    } catch (error) {
      return err(dbError('Failed to find daily aggregates', error))
    }
  },

  async findDailiesForKeys(
    componentKeys: ReadonlyArray<ComponentKey>,
    fromDay: Date,
    toDay: Date,
  ): Promise<Result<ComponentDaily[]>> {
    if (componentKeys.length === 0) return ok([])
    try {
      const rows = await prisma.componentDaily.findMany({
        where: {
          componentKey: { in: [...componentKeys] },
          day: { gte: fromDay, lte: toDay },
        },
        orderBy: [{ componentKey: 'asc' }, { day: 'asc' }],
      })
      return ok(rows)
    } catch (error) {
      return err(dbError('Failed to find daily aggregates', error))
    }
  },

  async findLatestPerComponent(): Promise<Result<HealthCheck[]>> {
    try {
      const rows = await prisma.$queryRaw<HealthCheck[]>`
        SELECT DISTINCT ON (component_key)
          id, component_key AS "componentKey", status,
          latency_ms AS "latencyMs", error,
          checked_at AS "checkedAt"
        FROM health_checks
        ORDER BY component_key, checked_at DESC
      `
      return ok(rows)
    } catch (error) {
      return err(dbError('Failed to find latest health checks', error))
    }
  },
}
