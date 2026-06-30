import { afterEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { prisma } from '@/src/lib/prisma'
import { IncidentRepository } from '@/src/repositories/incident.repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('IncidentRepository', () => {
  describe('create() + findOpenByComponent()', () => {
    it('should persist a new incident with INVESTIGATING update', async () => {
      const startedAt = new Date('2025-04-01T10:00:00.000Z')

      const result = await IncidentRepository.create({
        componentKey: 'database',
        severity: 'PARTIAL_OUTAGE',
        title: 'DB indisponível',
        startedAt,
        initialMessage: 'Investigando',
      })

      const incident = expectOk(result)
      expect(incident.componentKey).toBe('database')
      expect(incident.severity).toBe('PARTIAL_OUTAGE')

      const updates = await prisma.incidentUpdate.findMany({
        where: { incidentId: incident.id },
      })
      expect(updates).toHaveLength(1)
      expect(updates[0]?.event).toBe('INVESTIGATING')
      expect(updates[0]?.message).toBe('Investigando')
    })

    it('should return null when no open incident exists for component', async () => {
      const result = await IncidentRepository.findOpenByComponent('cache')

      expect(expectOk(result)).toBeNull()
    })

    it('should return open incident when one exists', async () => {
      const created = await IncidentRepository.create({
        componentKey: 'cache',
        severity: 'DEGRADED',
        title: 'Cache lento',
        startedAt: new Date(),
        initialMessage: '...',
      })
      const incident = expectOk(created)

      const result = await IncidentRepository.findOpenByComponent('cache')

      const found = expectOk(result)
      expect(found?.id).toBe(incident.id)
    })
  })

  describe('bumpSeverity()', () => {
    it('should update severity', async () => {
      const created = await IncidentRepository.create({
        componentKey: 'app',
        severity: 'DEGRADED',
        title: 'lento',
        startedAt: new Date(),
        initialMessage: '...',
      })
      const incident = expectOk(created)

      const result = await IncidentRepository.bumpSeverity(
        incident.id,
        'MAJOR_OUTAGE',
      )

      expectOk(result)
      const refreshed = await prisma.incident.findUnique({
        where: { id: incident.id },
      })
      expect(refreshed?.severity).toBe('MAJOR_OUTAGE')
    })

    it('should return DATABASE_ERROR for unknown incident id', async () => {
      const result = await IncidentRepository.bumpSeverity(
        'unknown',
        'DEGRADED',
      )
      expectErr(result, 'DATABASE_ERROR')
    })
  })

  describe('addUpdate()', () => {
    it('should append a new update entry', async () => {
      const created = await IncidentRepository.create({
        componentKey: 'auth',
        severity: 'DEGRADED',
        title: 'auth lento',
        startedAt: new Date(),
        initialMessage: 'inicio',
      })
      const incident = expectOk(created)

      const result = await IncidentRepository.addUpdate(
        incident.id,
        'IDENTIFIED',
        'identificamos',
      )
      expectOk(result)

      const updates = await prisma.incidentUpdate.findMany({
        where: { incidentId: incident.id },
        orderBy: { postedAt: 'asc' },
      })
      expect(updates).toHaveLength(2)
      expect(updates[1]?.event).toBe('IDENTIFIED')
    })
  })

  describe('close()', () => {
    it('should set resolvedAt and append RESOLVED update', async () => {
      const created = await IncidentRepository.create({
        componentKey: 'app',
        severity: 'DEGRADED',
        title: 'fim',
        startedAt: new Date('2025-04-02T08:00:00.000Z'),
        initialMessage: '...',
      })
      const incident = expectOk(created)
      const resolvedAt = new Date('2025-04-02T09:00:00.000Z')

      const result = await IncidentRepository.close(
        incident.id,
        resolvedAt,
        'tudo certo',
      )

      expectOk(result)
      const refreshed = await prisma.incident.findUnique({
        where: { id: incident.id },
        include: { updates: { orderBy: { postedAt: 'asc' } } },
      })
      expect(refreshed?.resolvedAt?.toISOString()).toBe(
        resolvedAt.toISOString(),
      )
      expect(refreshed?.updates.at(-1)?.event).toBe('RESOLVED')
      expect(refreshed?.updates.at(-1)?.message).toBe('tudo certo')
    })
  })

  describe('findInWindow()', () => {
    it('should return incidents started after window or still open', async () => {
      // older, resolved BEFORE window: excluded
      const old = await IncidentRepository.create({
        componentKey: 'app',
        severity: 'DEGRADED',
        title: 'antigo',
        startedAt: new Date('2024-01-01T00:00:00.000Z'),
        initialMessage: '...',
      })
      const oldId = expectOk(old).id
      await IncidentRepository.close(
        oldId,
        new Date('2024-01-01T01:00:00.000Z'),
        'fim',
      )

      // recent: included
      const recent = await IncidentRepository.create({
        componentKey: 'cache',
        severity: 'DEGRADED',
        title: 'recente',
        startedAt: new Date('2025-04-10T00:00:00.000Z'),
        initialMessage: '...',
      })
      const recentId = expectOk(recent).id

      // open: included regardless of date
      const openIncident = await IncidentRepository.create({
        componentKey: 'database',
        severity: 'MAJOR_OUTAGE',
        title: 'aberto',
        startedAt: new Date('2024-06-01T00:00:00.000Z'),
        initialMessage: '...',
      })
      const openId = expectOk(openIncident).id

      const result = await IncidentRepository.findInWindow(
        new Date('2025-04-01T00:00:00.000Z'),
      )
      const list = expectOk(result)
      const ids = list.map((i) => i.id)

      expect(ids).toContain(recentId)
      expect(ids).toContain(openId)
      expect(ids).not.toContain(oldId)
    })
  })

  describe('findById()', () => {
    it('should return incident with updates ordered by postedAt desc', async () => {
      const created = await IncidentRepository.create({
        componentKey: 'app',
        severity: 'DEGRADED',
        title: 'detalhe',
        startedAt: new Date(),
        initialMessage: 'inicio',
      })
      const incidentId = expectOk(created).id
      await IncidentRepository.addUpdate(incidentId, 'IDENTIFIED', 'meio')

      const result = await IncidentRepository.findById(incidentId)
      const found = expectOk(result)

      expect(found?.id).toBe(incidentId)
      expect(found?.updates.length).toBeGreaterThanOrEqual(2)
    })

    it('should return DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.incident, 'findUnique').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(await IncidentRepository.findById('x'), 'DATABASE_ERROR')
    })

    it('should return null for unknown id', async () => {
      const result = await IncidentRepository.findById('missing')
      expect(expectOk(result)).toBeNull()
    })
  })

  describe('query failures', () => {
    it('findOpenByComponent() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.incident, 'findFirst').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IncidentRepository.findOpenByComponent('database'),
        'DATABASE_ERROR',
      )
    })

    it('create() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.incident, 'create').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IncidentRepository.create({
          componentKey: 'database',
          severity: 'MAJOR_OUTAGE',
          title: 'x',
          startedAt: new Date(),
          initialMessage: 'x',
        }),
        'DATABASE_ERROR',
      )
    })

    it('bumpSeverity() returns DATABASE_ERROR for a non-existent incident', async () => {
      expectErr(
        await IncidentRepository.bumpSeverity('nope', 'MAJOR_OUTAGE'),
        'DATABASE_ERROR',
      )
    })

    it('addUpdate() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.incidentUpdate, 'create').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IncidentRepository.addUpdate('nope', 'IDENTIFIED', 'x'),
        'DATABASE_ERROR',
      )
    })

    it('close() returns DATABASE_ERROR for a non-existent incident', async () => {
      expectErr(
        await IncidentRepository.close('nope', new Date(), 'x'),
        'DATABASE_ERROR',
      )
    })

    it('findInWindow() returns DATABASE_ERROR when the query throws', async () => {
      vi.spyOn(prisma.incident, 'findMany').mockRejectedValueOnce(
        new Error('boom'),
      )
      expectErr(
        await IncidentRepository.findInWindow(new Date()),
        'DATABASE_ERROR',
      )
    })
  })
})
