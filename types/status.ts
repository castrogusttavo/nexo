import type { ComponentStatus, IncidentEvent } from '@prisma/client'
import type { ComponentKey, ComponentTier } from '@/src/services/status/components'

export interface DailyPoint {
  day: string
  status: ComponentStatus
  uptimePct: number
  incidentId?: string
}

export interface IncidentSummaryDTO {
  id: string
  componentKey: ComponentKey
  componentName: string
  severity: ComponentStatus
  title: string
  startedAt: string
  resolvedAt: string | null
}

export interface IncidentUpdateDTO {
  id: string
  event: IncidentEvent
  message: string
  postedAt: string
}

export interface IncidentDetailDTO extends IncidentSummaryDTO {
  updates: IncidentUpdateDTO[]
}

export interface ComponentSnapshot {
  key: ComponentKey
  name: string
  description: string
  tier: ComponentTier
  currentStatus: ComponentStatus
  uptime90d: number
  history: DailyPoint[]
}

export interface Snapshot {
  overallStatus: ComponentStatus
  generatedAt: string
  components: ComponentSnapshot[]
}

export interface DailyAggregate {
  worstStatus: ComponentStatus
  totalChecks: number
  upChecks: number
  uptimePct: number
  avgLatencyMs: number
}
