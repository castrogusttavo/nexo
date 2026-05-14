import 'server-only'
import type {
  ComponentDaily,
  ComponentStatus,
  HealthCheck,
} from '@prisma/client'
import { logger } from '@/lib/axiom/logger'
import { StatusCache } from '@/src/cache/status.cache'
import { databaseError, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { IncidentRepository } from '@/src/repositories/incident.repository'
import { StatusRepository } from '@/src/repositories/status.repository'
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
import { STATUS_META } from './status-map'

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

async function evaluateIncidentFor(
  componentKey: ComponentKey,
  probe: ProbeResult,
): Promise<Result<void>> {
  const openResult = await IncidentRepository.findOpenByComponent(componentKey)
  if (!openResult.ok) return openResult
  const open = openResult.value

  const status = probe.status as ComponentStatus

  if (status === 'OPERATIONAL') {
    if (!open) return ok(undefined)
    return IncidentRepository.close(
      open.id,
      new Date(),
      buildResolvedMessage(componentKey),
    )
  }

  if (!open) {
    const created = await IncidentRepository.create({
      componentKey,
      severity: status,
      title: buildIncidentTitle(componentKey, status),
      startedAt: new Date(),
      initialMessage: buildInvestigatingMessage(
        componentKey,
        status,
        probe.error,
      ),
    })
    if (!created.ok) return created
    return ok(undefined)
  }

  if (STATUS_RANK[status] > STATUS_RANK[open.severity]) {
    const bumped = await IncidentRepository.bumpSeverity(open.id, status)
    if (!bumped.ok) return bumped
    const updateResult = await IncidentRepository.addUpdate(
      open.id,
      'IDENTIFIED',
      `Severidade atualizada para ${STATUS_META[status].label}.`,
    )
    if (!updateResult.ok) return updateResult
  }

  return ok(undefined)
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
  async collect(tier: ComponentTier): Promise<Result<void>> {
    const probeMap = await runProbesForTier(tier)
    const tierKeys = componentsForTier(tier)

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
    if (!recordResult.ok) return recordResult

    const today = startOfUtcDay()
    const tomorrow = addDays(today, 1)

    const dailyResults = await Promise.all(
      tierKeys.map(async (key) => {
        const aggResult = await StatusRepository.aggregateForDay(
          key,
          today,
          tomorrow,
        )
        if (!aggResult.ok) return aggResult
        if (!aggResult.value) return ok(undefined)
        return StatusRepository.upsertDaily(key, today, aggResult.value)
      }),
    )
    for (const dailyResult of dailyResults) {
      if (!dailyResult.ok) return dailyResult
    }

    await Promise.all(
      tierKeys.map(async (key) => {
        const probe = probeMap[key]
        if (!probe) return
        const evalResult = await evaluateIncidentFor(key, probe)
        if (!evalResult.ok) {
          logger.error('status.incident_eval_failed', {
            component: 'StatusService',
            componentKey: key,
            errorCode: evalResult.error.code,
            message: evalResult.error.message,
          })
        }
      }),
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

    return ok(undefined)
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
