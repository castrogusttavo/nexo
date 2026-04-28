import type { ComponentStatus, IncidentEvent, Prisma } from '@prisma/client'
import { databaseError } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import type { ComponentKey } from '@/src/services/status/components'

export type IncidentWithUpdates = Prisma.IncidentGetPayload<{
  include: { updates: { orderBy: { postedAt: 'desc' } } }
}>

export type IncidentSummary = Prisma.IncidentGetPayload<{
  select: {
    id: true
    componentKey: true
    severity: true
    title: true
    startedAt: true
    resolvedAt: true
  }
}>

export const IncidentRepository = {
  async findOpenByComponent(
    componentKey: ComponentKey,
  ): Promise<Result<IncidentSummary | null>> {
    try {
      const incident = await prisma.incident.findFirst({
        where: { componentKey, resolvedAt: null },
        select: {
          id: true,
          componentKey: true,
          severity: true,
          title: true,
          startedAt: true,
          resolvedAt: true,
        },
        orderBy: { startedAt: 'desc' },
      })
      return ok(incident)
    } catch {
      return err(databaseError('Failed to find open incident'))
    }
  },

  async create(data: {
    componentKey: ComponentKey
    severity: ComponentStatus
    title: string
    startedAt: Date
    initialMessage: string
  }): Promise<Result<IncidentSummary>> {
    try {
      const incident = await prisma.incident.create({
        data: {
          componentKey: data.componentKey,
          severity: data.severity,
          title: data.title,
          startedAt: data.startedAt,
          updates: {
            create: {
              event: 'INVESTIGATING',
              message: data.initialMessage,
              postedAt: data.startedAt,
            },
          },
        },
        select: {
          id: true,
          componentKey: true,
          severity: true,
          title: true,
          startedAt: true,
          resolvedAt: true,
        },
      })
      return ok(incident)
    } catch {
      return err(databaseError('Failed to create incident'))
    }
  },

  async bumpSeverity(
    incidentId: string,
    severity: ComponentStatus,
  ): Promise<Result<void>> {
    try {
      await prisma.incident.update({
        where: { id: incidentId },
        data: { severity },
      })
      return ok(undefined)
    } catch {
      return err(databaseError('Failed to bump incident severity'))
    }
  },

  async addUpdate(
    incidentId: string,
    event: IncidentEvent,
    message: string,
  ): Promise<Result<void>> {
    try {
      await prisma.incidentUpdate.create({
        data: { incidentId, event, message },
      })
      return ok(undefined)
    } catch {
      return err(databaseError('Failed to add incident update'))
    }
  },

  async close(
    incidentId: string,
    resolvedAt: Date,
    message: string,
  ): Promise<Result<void>> {
    try {
      await prisma.incident.update({
        where: { id: incidentId },
        data: {
          resolvedAt,
          updates: {
            create: {
              event: 'RESOLVED',
              message,
              postedAt: resolvedAt,
            },
          },
        },
      })
      return ok(undefined)
    } catch {
      return err(databaseError('Failed to close incident'))
    }
  },

  async findInWindow(fromDate: Date): Promise<Result<IncidentSummary[]>> {
    try {
      const incidents = await prisma.incident.findMany({
        where: {
          OR: [{ startedAt: { gte: fromDate } }, { resolvedAt: null }],
        },
        select: {
          id: true,
          componentKey: true,
          severity: true,
          title: true,
          startedAt: true,
          resolvedAt: true,
        },
        orderBy: { startedAt: 'desc' },
      })
      return ok(incidents)
    } catch {
      return err(databaseError('Failed to list incidents'))
    }
  },

  async findById(id: string): Promise<Result<IncidentWithUpdates | null>> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id },
        include: { updates: { orderBy: { postedAt: 'desc' } } },
      })
      return ok(incident)
    } catch {
      return err(databaseError('Failed to find incident'))
    }
  },
}
