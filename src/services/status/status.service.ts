import 'server-only'
import type {
  ComponentDaily,
  ComponentStatus,
  HealthCheck,
} from '@prisma/client'
import { logger } from '@/lib/axiom/logger'
import { StatusCache } from '@/src/cache/status.cache'
import { databaseError, notFound } from '@/src/errors'
import type { AppError } from '@/src/errors/app-error'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { IncidentRepository } from '@/src/repositories/incident.repository'
import {
  type RecentCheck,
  StatusRepository,
} from '@/src/repositories/status.repository'
import type {
  ComponentSnapshot,
  DailyPoint,
  IncidentDetailDTO,
  IncidentSummaryDTO,
  Snapshot,
} from '@/types/status'
import {
  COMPONENTS,
  COMPONENTS_BY_KEY,
  type ComponentKey,
  type ComponentTier,
  STATUS_RANK,
  worstStatus,
} from './components'
import { componentsForTier, type ProbeResult, runProbesForTier } from './probes'
import {
  ALERT_HISTORY_LOOKBACK_MS,
  alertCollectFailed,
  alertCollectRecovered,
  alertComponent,
  decideComponentAlert,
  type StatusPoint,
} from './status-alerts'
import { STATUS_META } from './status-map'

export interface CollectedComponent {
  componentKey: ComponentKey
  name: string
  status: ComponentStatus
  latencyMs: number
  error: string | null
}

export interface CollectSummary {
  tier: ComponentTier
  collectedAt: string
  components: CollectedComponent[]
}

const HISTORY_WINDOW_DAYS = 90
const RAW_RETENTION_DAYS = 7

function startOfUtcDay(date = new Date()): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function computeOverallStatus(
  components: ComponentSnapshot[],
): ComponentStatus {
  const coreStatuses: ComponentStatus[] = []
  const peripheralStatuses: ComponentStatus[] = []
  for (const c of components) {
    if (c.tier === 'core') coreStatuses.push(c.currentStatus)
    else if (c.tier === 'peripheral') peripheralStatuses.push(c.currentStatus)
  }

  const worstCore = worstStatus(coreStatuses)
  if (STATUS_RANK[worstCore] >= STATUS_RANK.MAJOR_OUTAGE) return 'MAJOR_OUTAGE'
  if (STATUS_RANK[worstCore] >= STATUS_RANK.DEGRADED) return 'PARTIAL_OUTAGE'

  const worstPeripheral = worstStatus(peripheralStatuses)
  if (STATUS_RANK[worstPeripheral] >= STATUS_RANK.DEGRADED) return 'DEGRADED'

  return 'OPERATIONAL'
}

function buildHistory(rows: ComponentDaily[]): DailyPoint[] {
  return rows.map((row) => ({
    day: isoDay(row.day),
    status: row.worstStatus,
    uptimePct: Number(row.uptimePct),
  }))
}

function uptimeFor90Days(history: DailyPoint[]): number {
  if (history.length === 0) return 0
  const sum = history.reduce((acc, point) => acc + point.uptimePct, 0)
  return Number((sum / history.length).toFixed(3))
}

function buildIncidentTitle(
  componentKey: ComponentKey,
  severity: ComponentStatus,
): string {
  const def = COMPONENTS_BY_KEY[componentKey]
  return `${def.name}: ${STATUS_META[severity].label}`
}

function buildInvestigatingMessage(
  componentKey: ComponentKey,
  severity: ComponentStatus,
  probeError: string | null,
): string {
  const def = COMPONENTS_BY_KEY[componentKey]
  const base = `Detectamos uma anomalia em ${def.name} (${STATUS_META[severity].label.toLowerCase()}). Estamos investigando.`
  return probeError ? `${base} Erro reportado: ${probeError}` : base
}

function buildResolvedMessage(componentKey: ComponentKey): string {
  const def = COMPONENTS_BY_KEY[componentKey]
  return `${def.name} retornou ao funcionamento normal. Incidente resolvido.`
}

/** A state change of a component, as seen by the incident lifecycle. */
export interface IncidentTransition {
  from: ComponentStatus
  to: ComponentStatus
  /** Start of the incident this change belongs to (null when none exists). */
  incidentStartedAt: Date | null
}

interface IncidentEvaluation {
  /** Null when the component is in the same state as at the previous check. */
  transition: IncidentTransition | null
  /** Set when an incident read or write failed; the transition still stands. */
  error: AppError | null
}

/**
 * Moves the component's incident along -- opens it, raises its severity,
 * resolves it -- and reports the state change that caused it.
 *
 * `previous` is the component's status at its previous recorded check. The
 * transition is measured against it rather than against the incident row, so
 * an incident write that failed (and is retried next minute) does not report
 * the same change twice, and a de-escalation -- which the incident keeps at
 * its peak severity -- is still reported. Without a previous check (first run,
 * or the history could not be read) the open incident stands in for it.
 */
async function evaluateIncidentFor(
  componentKey: ComponentKey,
  probe: ProbeResult,
  previous: ComponentStatus | null,
  now: Date,
): Promise<IncidentEvaluation> {
  const status = probe.status as ComponentStatus
  const openResult = await IncidentRepository.findOpenByComponent(componentKey)
  const open = openResult.ok ? openResult.value : null
  const from = previous ?? open?.severity ?? 'OPERATIONAL'
  const transition = (incidentStartedAt: Date | null) =>
    from === status ? null : { from, to: status, incidentStartedAt }

  if (!openResult.ok) {
    return { transition: transition(null), error: openResult.error }
  }

  if (status === 'OPERATIONAL') {
    if (!open) return { transition: transition(null), error: null }
    const closed = await IncidentRepository.close(
      open.id,
      now,
      buildResolvedMessage(componentKey),
    )
    return {
      transition: transition(open.startedAt),
      error: closed.ok ? null : closed.error,
    }
  }

  if (!open) {
    const created = await IncidentRepository.create({
      componentKey,
      severity: status,
      title: buildIncidentTitle(componentKey, status),
      startedAt: now,
      initialMessage: buildInvestigatingMessage(
        componentKey,
        status,
        probe.error,
      ),
    })
    return {
      transition: transition(now),
      error: created.ok ? null : created.error,
    }
  }

  // The incident records its peak: only a new worst severity updates it.
  if (STATUS_RANK[status] > STATUS_RANK[open.severity]) {
    const bumped = await IncidentRepository.bumpSeverity(open.id, status)
    if (!bumped.ok) {
      return { transition: transition(open.startedAt), error: bumped.error }
    }
    const updateResult = await IncidentRepository.addUpdate(
      open.id,
      'IDENTIFIED',
      `Severidade atualizada para ${STATUS_META[status].label}.`,
    )
    if (!updateResult.ok) {
      return {
        transition: transition(open.startedAt),
        error: updateResult.error,
      }
    }
  }

  return { transition: transition(open.startedAt), error: null }
}

/** Status points per component, oldest first, from the recorded checks. */
function groupHistory(rows: RecentCheck[]): Map<ComponentKey, StatusPoint[]> {
  const byKey = new Map<ComponentKey, StatusPoint[]>()
  for (const row of rows) {
    const key = row.componentKey as ComponentKey
    const list = byKey.get(key) ?? []
    list.push({ status: row.status, at: row.checkedAt })
    byKey.set(key, list)
  }
  return byKey
}

async function loadIncidentMapForWindow(
  fromDay: Date,
  toDay: Date,
): Promise<Map<ComponentKey, Map<string, string>>> {
  const incidents = await prisma.incident.findMany({
    where: {
      OR: [{ resolvedAt: null }, { resolvedAt: { gte: fromDay } }],
      startedAt: { lte: addDays(toDay, 1) },
    },
    select: { id: true, componentKey: true, startedAt: true, resolvedAt: true },
  })

  const map = new Map<ComponentKey, Map<string, string>>()
  for (const inc of incidents) {
    const key = inc.componentKey as ComponentKey
    const dayMap = map.get(key) ?? new Map<string, string>()
    const start = startOfUtcDay(inc.startedAt)
    const end = inc.resolvedAt ? startOfUtcDay(inc.resolvedAt) : startOfUtcDay()
    const cursor = new Date(Math.max(start.getTime(), fromDay.getTime()))
    const stop = new Date(Math.min(end.getTime(), toDay.getTime()))
    while (cursor.getTime() <= stop.getTime()) {
      dayMap.set(isoDay(cursor), inc.id)
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    map.set(key, dayMap)
  }
  return map
}

function attachIncidentIds(
  history: DailyPoint[],
  componentKey: ComponentKey,
  incidentMap: Map<ComponentKey, Map<string, string>>,
): DailyPoint[] {
  const dayMap = incidentMap.get(componentKey)
  if (!dayMap) return history
  return history.map((point) => {
    const incidentId = dayMap.get(point.day)
    return incidentId ? { ...point, incidentId } : point
  })
}

async function buildSnapshot(): Promise<Result<Snapshot>> {
  const today = startOfUtcDay()
  const fromDay = addDays(today, -(HISTORY_WINDOW_DAYS - 1))

  const dailiesResult = await StatusRepository.findDailiesForKeys(
    COMPONENTS.map((c) => c.key),
    fromDay,
    today,
  )
  if (!dailiesResult.ok) return dailiesResult

  const latestResult = await StatusRepository.findLatestPerComponent()
  if (!latestResult.ok) return latestResult

  const incidentMap = await loadIncidentMapForWindow(fromDay, today)

  const dailiesByKey = new Map<ComponentKey, ComponentDaily[]>()
  for (const row of dailiesResult.value) {
    const key = row.componentKey as ComponentKey
    const list = dailiesByKey.get(key) ?? []
    list.push(row)
    dailiesByKey.set(key, list)
  }

  const latestByKey = new Map<ComponentKey, HealthCheck>()
  for (const row of latestResult.value) {
    latestByKey.set(row.componentKey as ComponentKey, row)
  }

  const components: ComponentSnapshot[] = COMPONENTS.map((def) => {
    const rawHistory = buildHistory(dailiesByKey.get(def.key) ?? [])
    const history = attachIncidentIds(rawHistory, def.key, incidentMap)
    const latest = latestByKey.get(def.key)
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      tier: def.tier,
      currentStatus: latest?.status ?? 'OPERATIONAL',
      uptime90d: uptimeFor90Days(history),
      history,
    }
  })

  return ok({
    overallStatus: computeOverallStatus(components),
    generatedAt: new Date().toISOString(),
    components,
  })
}

function toIncidentSummaryDTO(row: {
  id: string
  componentKey: string
  severity: ComponentStatus
  title: string
  startedAt: Date
  resolvedAt: Date | null
}): IncidentSummaryDTO {
  const def = COMPONENTS_BY_KEY[row.componentKey as ComponentKey]
  return {
    id: row.id,
    componentKey: row.componentKey as ComponentKey,
    componentName: def?.name ?? row.componentKey,
    severity: row.severity,
    title: row.title,
    startedAt: row.startedAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  }
}

export const StatusService = {
  async collect(tier: ComponentTier): Promise<Result<CollectSummary>> {
    const probeMap = await runProbesForTier(tier)
    const tierKeys = componentsForTier(tier)
    const now = new Date()

    // Read before this run's checks are written: the newest row per component
    // is then its previous state. A failed read only weakens the alerts (no
    // flap suppression this run); it never blocks the collection.
    const historyResult = await StatusRepository.findRecentChecks(
      tierKeys,
      new Date(now.getTime() - ALERT_HISTORY_LOOKBACK_MS),
    )
    if (!historyResult.ok) {
      logger.error('status.alert_history_failed', {
        component: 'StatusService',
        errorCode: historyResult.error.code,
        message: historyResult.error.message,
      })
    }
    const history = groupHistory(historyResult.ok ? historyResult.value : [])

    const rows = tierKeys.flatMap((key) => {
      const probe = probeMap[key]
      if (!probe) return []
      return [
        {
          componentKey: key,
          status: probe.status as ComponentStatus,
          latencyMs: probe.latencyMs,
          error: probe.error,
        },
      ]
    })

    const recordResult = await StatusRepository.recordChecks(rows)
    if (!recordResult.ok) {
      await alertCollectFailed(
        recordResult.error.message,
        probeMap.database?.error ?? null,
      )
      return recordResult
    }
    await alertCollectRecovered()

    const today = startOfUtcDay()
    const tomorrow = addDays(today, 1)

    // Two queries for the whole tier, not two per component: this runs every
    // minute from the cron, and the per-component loop it replaces was the
    // N+1 on this route.
    const aggregatesResult = await StatusRepository.aggregateForDayByKeys(
      tierKeys,
      today,
      tomorrow,
    )
    if (!aggregatesResult.ok) return aggregatesResult

    const dailyResult = await StatusRepository.upsertDailies(
      today,
      // A component with no check today has no row to write — that is a gap in
      // the history, not a day of zero uptime.
      tierKeys.flatMap((key) => {
        const aggregate = aggregatesResult.value.get(key)
        return aggregate ? [{ componentKey: key, aggregate }] : []
      }),
    )
    if (!dailyResult.ok) return dailyResult

    const alerts = await Promise.all(
      tierKeys.map(async (key) => {
        const probe = probeMap[key]
        if (!probe) return null
        const past = history.get(key) ?? []
        const previous = past.at(-1)?.status ?? null
        const { transition, error } = await evaluateIncidentFor(
          key,
          probe,
          previous,
          now,
        )
        if (error) {
          logger.error('status.incident_eval_failed', {
            component: 'StatusService',
            componentKey: key,
            errorCode: error.code,
            message: error.message,
          })
        }

        const current = probe.status as ComponentStatus
        // No recorded previous check: seed the replay with the state the
        // lifecycle compared against, so a first-run outage still alerts.
        const seed: StatusPoint[] =
          past.length === 0 && transition
            ? [{ status: transition.from, at: new Date(now.getTime() - 1) }]
            : []
        const decision = decideComponentAlert([
          ...seed,
          ...past,
          { status: current, at: now },
        ])
        if (decision.action === 'none' || decision.action === 'suppressed') {
          return null
        }
        return {
          decision,
          context: {
            componentKey: key,
            from: transition?.from ?? current,
            to: current,
            at: now,
            incidentStartedAt: transition?.incidentStartedAt ?? null,
            error: probe.error,
          },
        }
      }),
    )
    // Awaited so the route and the CLI do not exit mid-send; each send is
    // bounded by the Slack timeout and never rejects.
    await Promise.allSettled(
      alerts.flatMap((alert) =>
        alert ? [alertComponent(alert.decision, alert.context)] : [],
      ),
    )

    const cutoff = addDays(today, -RAW_RETENTION_DAYS)
    const pruneResult = await StatusRepository.pruneOldChecks(cutoff)
    if (!pruneResult.ok) {
      logger.error('status.prune_failed', {
        component: 'StatusService',
        errorCode: pruneResult.error.code,
        message: pruneResult.error.message,
      })
    }

    try {
      await StatusCache.invalidate()
    } catch (e) {
      logger.error('status.cache_invalidate_failed', {
        component: 'StatusService',
        message: e instanceof Error ? e.message : String(e),
      })
    }

    return ok({
      tier,
      collectedAt: now.toISOString(),
      components: rows.map((row) => ({
        componentKey: row.componentKey,
        name: COMPONENTS_BY_KEY[row.componentKey].name,
        status: row.status,
        latencyMs: row.latencyMs,
        error: row.error,
      })),
    })
  },

  async getCurrentSnapshot(): Promise<Result<Snapshot>> {
    try {
      const cached = await StatusCache.get()
      if (cached) return ok(cached)
    } catch (e) {
      logger.error('status.cache_read_failed', {
        component: 'StatusService',
        message: e instanceof Error ? e.message : String(e),
      })
    }

    const result = await buildSnapshot()
    if (!result.ok) return result

    try {
      await StatusCache.set(result.value)
    } catch (e) {
      logger.error('status.cache_write_failed', {
        component: 'StatusService',
        message: e instanceof Error ? e.message : String(e),
      })
    }

    return result
  },

  async getHistory(
    componentKey: ComponentKey,
    days: number,
  ): Promise<Result<DailyPoint[]>> {
    if (!COMPONENTS_BY_KEY[componentKey]) {
      return err(databaseError('Unknown component'))
    }

    const today = startOfUtcDay()
    const fromDay = addDays(today, -(days - 1))

    const result = await StatusRepository.findDailies(
      componentKey,
      fromDay,
      today,
    )
    if (!result.ok) return result

    const incidentMap = await loadIncidentMapForWindow(fromDay, today)
    return ok(
      attachIncidentIds(buildHistory(result.value), componentKey, incidentMap),
    )
  },

  async listIncidents(
    days = HISTORY_WINDOW_DAYS,
  ): Promise<Result<IncidentSummaryDTO[]>> {
    const today = startOfUtcDay()
    const fromDay = addDays(today, -(days - 1))
    const result = await IncidentRepository.findInWindow(fromDay)
    if (!result.ok) return result
    return ok(result.value.map(toIncidentSummaryDTO))
  },

  async getIncident(id: string): Promise<Result<IncidentDetailDTO>> {
    const result = await IncidentRepository.findById(id)
    if (!result.ok) return result
    if (!result.value) return err(notFound('Incidente'))

    const summary = toIncidentSummaryDTO(result.value)
    return ok({
      ...summary,
      updates: result.value.updates.map((u) => ({
        id: u.id,
        event: u.event,
        message: u.message,
        postedAt: u.postedAt.toISOString(),
      })),
    })
  },
}
