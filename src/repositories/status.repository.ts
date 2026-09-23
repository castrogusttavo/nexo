import { createId } from '@paralleldrive/cuid2'
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

export interface RecentCheck {
  componentKey: string
  status: ComponentStatus
  latencyMs: number
  checkedAt: Date
}

/**
 * A check that answered, however slowly. Uptime is the share of these.
 *
 * It used to count only `OPERATIONAL`, which quietly turned the number the
 * status page calls "uptime" into a latency SLO: Resend answered every
 * request correctly and still showed 50% for the day, because half the
 * samples were over a threshold meant for a local query. Slowness is not
 * absence — it is carried by the day's worst status and by the average
 * latency, both of which stay honest.
 */
function answered(status: ComponentStatus): boolean {
  return status !== 'MAJOR_OUTAGE' && status !== 'PARTIAL_OUTAGE'
}

// How bad each status is. `worstStatus` is the maximum over this ranking, not
// over the enum's declaration or alphabetical order, so it has to be spelled
// out somewhere — here, next to the only query that folds checks into a day.
const STATUS_RANK: Record<ComponentStatus, number> = {
  OPERATIONAL: 0,
  MAINTENANCE: 1,
  DEGRADED: 2,
  PARTIAL_OUTAGE: 3,
  MAJOR_OUTAGE: 4,
}

export interface DailyUpsert {
  componentKey: ComponentKey
  aggregate: DailyAggregate
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

  /**
   * The day's aggregate for each of the given components, in one query.
   *
   * Aggregating in JS rather than in SQL is deliberate: `worstStatus` is a
   * maximum over a *ranking* of the enum, not over its alphabetical order, and
   * expressing that in a `groupBy` costs a CASE ladder for a set of rows that
   * is one day of checks for a handful of components. A component with no
   * check in the window is absent from the map, not zeroed — that is the
   * difference between "up 0% today" and "nothing measured yet".
   */
  async aggregateForDayByKeys(
    componentKeys: ReadonlyArray<ComponentKey>,
    fromDate: Date,
    toDate: Date,
  ): Promise<Result<Map<ComponentKey, DailyAggregate>>> {
    if (componentKeys.length === 0) return ok(new Map())
    try {
      const rows = await prisma.healthCheck.findMany({
        where: {
          componentKey: { in: [...componentKeys] },
          checkedAt: { gte: fromDate, lt: toDate },
        },
        select: { componentKey: true, status: true, latencyMs: true },
      })

      const totals = new Map<
        ComponentKey,
        {
          up: number
          latencySum: number
          worst: ComponentStatus
          count: number
        }
      >()

      for (const row of rows) {
        const key = row.componentKey as ComponentKey
        const acc = totals.get(key) ?? {
          up: 0,
          latencySum: 0,
          worst: 'OPERATIONAL' as ComponentStatus,
          count: 0,
        }
        if (answered(row.status)) acc.up += 1
        acc.latencySum += row.latencyMs
        if (STATUS_RANK[row.status] > STATUS_RANK[acc.worst])
          acc.worst = row.status
        acc.count += 1
        totals.set(key, acc)
      }

      const aggregates = new Map<ComponentKey, DailyAggregate>()
      for (const [key, acc] of totals) {
        aggregates.set(key, {
          worstStatus: acc.worst,
          totalChecks: acc.count,
          upChecks: acc.up,
          uptimePct: Number(((acc.up / acc.count) * 100).toFixed(3)),
          avgLatencyMs: Math.round(acc.latencySum / acc.count),
        })
      }
      return ok(aggregates)
    } catch (error) {
      return err(dbError('Failed to aggregate daily checks', error))
    }
  },

  /**
   * Writes every component's rollup for `day` in a single statement.
   *
   * Prisma has no multi-row upsert, and the obvious loop is what the status
   * cron was doing: one `INSERT ... ON CONFLICT` per component, each taking
   * its own round trip and pool connection, every minute — the N+1 Sentry
   * flagged on `POST /api/status/collect/core`. Raw SQL here buys one round
   * trip for all of them; `id` is generated in code because the model's
   * `cuid()` default is applied by the Prisma client, not by the database.
   */
  async upsertDailies(day: Date, rows: DailyUpsert[]): Promise<Result<void>> {
    if (rows.length === 0) return ok(undefined)
    try {
      const values = rows.map(
        ({ componentKey, aggregate }) => Prisma.sql`(
          ${createId()},
          ${componentKey},
          ${day}::date,
          ${aggregate.worstStatus}::"ComponentStatus",
          ${aggregate.totalChecks},
          ${aggregate.upChecks},
          ${new Prisma.Decimal(aggregate.uptimePct)},
          ${aggregate.avgLatencyMs},
          NOW()
        )`,
      )

      await prisma.$executeRaw`
        INSERT INTO component_dailies (
          id, component_key, day, worst_status,
          total_checks, up_checks, uptime_pct, avg_latency_ms, updated_at
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT (component_key, day) DO UPDATE SET
          worst_status = EXCLUDED.worst_status,
          total_checks = EXCLUDED.total_checks,
          up_checks = EXCLUDED.up_checks,
          uptime_pct = EXCLUDED.uptime_pct,
          avg_latency_ms = EXCLUDED.avg_latency_ms,
          updated_at = NOW()
      `
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to upsert component dailies', error))
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

  /** Checks of the given components since `since`, oldest first. */
  async findRecentChecks(
    componentKeys: ReadonlyArray<ComponentKey>,
    since: Date,
  ): Promise<Result<RecentCheck[]>> {
    if (componentKeys.length === 0) return ok([])
    try {
      const rows = await prisma.healthCheck.findMany({
        where: {
          componentKey: { in: [...componentKeys] },
          checkedAt: { gte: since },
        },
        select: {
          componentKey: true,
          status: true,
          latencyMs: true,
          checkedAt: true,
        },
        orderBy: [{ checkedAt: 'asc' }, { id: 'asc' }],
      })
      return ok(rows)
    } catch (error) {
      return err(dbError('Failed to find recent health checks', error))
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
